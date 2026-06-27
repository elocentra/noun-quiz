// app/api/quiz/[slug]/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = await request.json();
  const { student_name, device_fingerprint, question_ids } = body;

  if (!student_name?.trim() || !device_fingerprint || !question_ids?.length) {
    return NextResponse.json({ error: "student_name, device_fingerprint and question_ids are required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // Get quiz
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .eq("is_active", true)
    .single();

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Check for existing active attempt from this device
  const { data: existing } = await supabase
    .from("student_attempts")
    .select("id, status")
    .eq("quiz_id", quiz.id)
    .eq("device_fingerprint", device_fingerprint)
    .neq("status", "reset")
    .maybeSingle();

  if (existing) {
    if (existing.status === "submitted") {
      return NextResponse.json({ 
        error: "You have already completed this quiz. Contact your instructor to reset your attempt.",
        attempt_id: existing.id,
        already_submitted: true
      }, { status: 409 });
    }
    // Return existing in_progress attempt
    return NextResponse.json({ attempt_id: existing.id, resuming: true });
  }

  // Create new attempt
  const { data: attempt, error } = await supabase
    .from("student_attempts")
    .insert({
      quiz_id: quiz.id,
      student_name: student_name.trim(),
      device_fingerprint,
      status: "in_progress",
      question_order: question_ids
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attempt_id: attempt.id });
}
