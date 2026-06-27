// app/api/quiz/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { shuffleArray } from "@/lib/ai/question-generator";
import type { Question } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createAdminSupabaseClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*, courses(code, title)")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .eq("is_active", true)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Quiz not found or not available" }, { status: 404 });
  }

  const { data: allQuestions, error: qError } = await supabase
    .from("questions")
    .select("id, question_type, question_text, correct_answer, options, explanation, source_sentence, week_number")
    .eq("course_id", quiz.course_id)
    .lte("week_number", quiz.week_number)
    .eq("is_active", true);

  if (qError || !allQuestions?.length) {
    return NextResponse.json({ error: "No questions available for this quiz" }, { status: 404 });
  }

  const mcqPool = (allQuestions as Question[]).filter(q => q.question_type === "mcq");
  const shortPool = (allQuestions as Question[]).filter(q => q.question_type === "short_answer");

  const shuffledMcq = shuffleArray(mcqPool).slice(0, quiz.mcq_count);
  const shuffledShort = shuffleArray(shortPool).slice(0, quiz.short_answer_count);
  const selectedQuestions = shuffleArray([...shuffledMcq, ...shuffledShort]);

  // Strip answer fields before sending to student
  const studentQuestions = selectedQuestions.map(({ correct_answer: _ca, source_sentence: _ss, explanation: _ex, ...q }) => q);

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      course: quiz.courses,
      week_number: quiz.week_number,
      time_limit_minutes: quiz.time_limit_minutes,
      total_questions: selectedQuestions.length
    },
    questions: studentQuestions,
    question_ids: selectedQuestions.map(q => q.id)
  });
}
