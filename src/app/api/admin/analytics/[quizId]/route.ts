// app/api/admin/analytics/[quizId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-check";

interface Attempt {
  score_percentage: number | null;
  status: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*, courses(code, title)")
    .eq("id", params.quizId)
    .single();

  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const { data: attempts } = await supabase
    .from("student_attempts")
    .select(`
      *,
      student_answers(
        *,
        questions(question_text, correct_answer, question_type, explanation)
      )
    `)
    .eq("quiz_id", params.quizId)
    .neq("status", "reset")
    .order("submitted_at", { ascending: false });

  const submitted = ((attempts || []) as Attempt[]).filter(a => a.status === "submitted");

  const stats = {
    total_attempts: submitted.length,
    avg_score: submitted.length
      ? submitted.reduce((sum: number, a: Attempt) => sum + (a.score_percentage || 0), 0) / submitted.length
      : 0,
    highest_score: submitted.length
      ? Math.max(...submitted.map((a: Attempt) => a.score_percentage || 0))
      : 0,
    lowest_score: submitted.length
      ? Math.min(...submitted.map((a: Attempt) => a.score_percentage || 0))
      : 0
  };

  return NextResponse.json({ quiz, attempts: attempts || [], stats });
}
