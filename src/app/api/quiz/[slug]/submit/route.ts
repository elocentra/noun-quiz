// app/api/quiz/[slug]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { gradeShortAnswer } from "@/lib/ai/question-generator";
import type { Question } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface SubmitAnswer {
  question_id: string;
  student_answer: string;
  selected_option_index?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = await request.json();
  const { attempt_id, answers, time_taken_seconds }: {
    attempt_id: string;
    answers: SubmitAnswer[];
    time_taken_seconds?: number;
  } = body;

  if (!attempt_id || !answers?.length) {
    return NextResponse.json({ error: "attempt_id and answers are required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: attempt } = await supabase
    .from("student_attempts")
    .select("*, quizzes(id, slug)")
    .eq("id", attempt_id)
    .eq("status", "in_progress")
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found or already submitted" }, { status: 404 });
  }

  if ((attempt.quizzes as { slug: string } | null)?.slug !== params.slug) {
    return NextResponse.json({ error: "Quiz mismatch" }, { status: 400 });
  }

  const questionIds = answers.map(a => a.question_id);
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_type, question_text, correct_answer, explanation, source_sentence, options")
    .in("id", questionIds);

  if (!questions?.length) {
    return NextResponse.json({ error: "Questions not found" }, { status: 404 });
  }

  const questionMap = new Map((questions as Question[]).map(q => [q.id, q]));

  const gradedAnswers: {
    attempt_id: string;
    question_id: string;
    student_answer: string;
    selected_option_index: number | null;
    is_correct: boolean;
    ai_feedback: string;
  }[] = [];
  let correctCount = 0;

  for (const answer of answers) {
    const question = questionMap.get(answer.question_id);
    if (!question) continue;

    let is_correct = false;
    let ai_feedback = "";

    if (question.question_type === "mcq") {
      is_correct = answer.student_answer.trim().toLowerCase() ===
                   question.correct_answer.trim().toLowerCase();
      if (!is_correct) ai_feedback = question.explanation;
    } else {
      const result = await gradeShortAnswer(
        question.question_text,
        question.correct_answer,
        answer.student_answer,
        question.source_sentence,
        question.explanation
      );
      is_correct = result.is_correct;
      ai_feedback = result.feedback;
    }

    if (is_correct) correctCount++;

    gradedAnswers.push({
      attempt_id,
      question_id: answer.question_id,
      student_answer: answer.student_answer,
      selected_option_index: answer.selected_option_index ?? null,
      is_correct,
      ai_feedback
    });
  }

  const { error: answerError } = await supabase
    .from("student_answers")
    .insert(gradedAnswers);

  if (answerError) {
    return NextResponse.json({ error: answerError.message }, { status: 500 });
  }

  const totalQuestions = gradedAnswers.length;
  const scorePercentage = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 10000) / 100
    : 0;

  await supabase
    .from("student_attempts")
    .update({
      status: "submitted",
      total_questions: totalQuestions,
      correct_count: correctCount,
      score_percentage: scorePercentage,
      submitted_at: new Date().toISOString(),
      time_taken_seconds: time_taken_seconds || null
    })
    .eq("id", attempt_id);

  const results = gradedAnswers.map(ga => {
    const q = questionMap.get(ga.question_id)!;
    return {
      question_id: ga.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      student_answer: ga.student_answer,
      correct_answer: q.correct_answer,
      options: q.options,
      is_correct: ga.is_correct,
      ai_feedback: ga.ai_feedback,
      explanation: q.explanation
    };
  });

  return NextResponse.json({
    success: true,
    score: { correct: correctCount, total: totalQuestions, percentage: scorePercentage },
    results
  });
}
