// lib/ai/question-generator.ts
// AI pipeline using Groq free API (llama-3.3-70b-versatile)
// Groq is free at: https://console.groq.com — no credit card required

import { GeneratedQuestion } from "@/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.3-70b-versatile";

// ── QUESTION GENERATION PROMPT ──────────────────────────────────────
const GENERATION_SYSTEM = `You are an active-recall question generator for a university course quiz system.

STRICT RULES:
1. Generate questions ONLY from the course material text provided. No outside knowledge.
2. Questions must use DIRECT sentences from the material with one key word/phrase replaced by ________.
3. The blank must replace a meaningful content word (noun, verb, concept, term) — never articles or prepositions.
4. Correct answers must be the EXACT word/phrase from the material.
5. Explanations must come ONLY from the provided material.
6. MCQ distractors must be contextually plausible but clearly wrong based on the material only.
7. Generate EXACTLY the number of questions requested — no more, no less.

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no backticks, no preamble.

JSON schema per question:
{
  "question_type": "mcq" | "short_answer",
  "question_text": "Sentence with ________ replacing the key word",
  "correct_answer": "the exact word or phrase removed",
  "source_sentence": "verbatim original sentence from the material",
  "options": ["A", "B", "C", "D"],
  "explanation": "Short explanation from the material only"
}

For short_answer questions, omit "options".
For MCQ, include exactly 4 options. The correct answer must appear among them. Shuffle its position.`;

// ── SHORT ANSWER GRADING PROMPT ─────────────────────────────────────
const GRADING_SYSTEM = `You are a strict quiz grader for a university course.

RULES:
1. Grade ONLY based on whether the student's answer matches the correct answer.
2. Accept exact matches and very close variations (minor spelling, singular/plural).
3. Do NOT accept partially correct answers unless the key concept is present.
4. Feedback must come ONLY from the course material context provided.

Return ONLY valid JSON, no markdown:
{"is_correct": true | false, "feedback": "Brief explanation from material if wrong. Empty string if correct."}`;

// ── HELPERS ─────────────────────────────────────────────────────────
async function callGroq(system: string, user: string, maxTokens = 4000): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (!match) throw new Error("Could not parse JSON from AI response");
    return JSON.parse(match[0]);
  }
}

// ── GENERATE QUESTIONS ───────────────────────────────────────────────
export async function generateQuestionsFromMaterial(
  materialText: string,
  mcqCount: number,
  shortAnswerCount: number,
  courseCode: string,
  weekNumber: number
): Promise<GeneratedQuestion[]> {
  const total = mcqCount + shortAnswerCount;

  const userPrompt = `Course: ${courseCode} — Week ${weekNumber}

COURSE MATERIAL:
${materialText.slice(0, 12000)}

Generate exactly ${total} active-recall fill-in-the-blank questions:
- ${mcqCount} MCQ questions (with exactly 4 options each)
- ${shortAnswerCount} short_answer questions (no options field)

Every question MUST use a direct sentence from the material above. Replace ONE key word/phrase with ________.`;

  const raw = await callGroq(GENERATION_SYSTEM, userPrompt, 4000);
  const questions = parseJSON<GeneratedQuestion[]>(raw);
  return validateQuestions(questions);
}

// ── GRADE SHORT ANSWER ───────────────────────────────────────────────
export async function gradeShortAnswer(
  questionText: string,
  correctAnswer: string,
  studentAnswer: string,
  materialContext: string,
  explanation: string
): Promise<{ is_correct: boolean; feedback: string }> {
  // Fast path: exact match
  if (studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
    return { is_correct: true, feedback: "" };
  }

  const userPrompt = `Question: "${questionText}"
Correct answer: "${correctAnswer}"
Student's answer: "${studentAnswer}"
Course material context: "${materialContext}"
Pre-written explanation: "${explanation}"

Grade the student's answer.`;

  try {
    const raw = await callGroq(GRADING_SYSTEM, userPrompt, 200);
    return parseJSON<{ is_correct: boolean; feedback: string }>(raw);
  } catch {
    // Fallback: fuzzy match
    const s = studentAnswer.trim().toLowerCase();
    const c = correctAnswer.trim().toLowerCase();
    const close = s.includes(c) || c.includes(s) || levenshtein(s, c) <= 2;
    return { is_correct: close, feedback: close ? "" : explanation };
  }
}

// ── VALIDATION ───────────────────────────────────────────────────────
function validateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  return questions.filter(q => {
    if (!q.question_text || !q.correct_answer || !q.source_sentence || !q.explanation) return false;
    if (!q.question_text.includes("________")) return false;
    if (q.question_type === "mcq") {
      if (!q.options || q.options.length !== 4) return false;
      if (!q.options.includes(q.correct_answer)) return false;
    }
    return true;
  });
}

// ── SHUFFLE ──────────────────────────────────────────────────────────
export function shuffleArray<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── LEVENSHTEIN ──────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i || j)
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}
