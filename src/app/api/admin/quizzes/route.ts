// app/api/admin/quizzes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-check";

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, courses(code, title)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  const { course_id, slug, title, week_number, mcq_count, short_answer_count, time_limit_minutes } = body;

  if (!course_id || !slug || !title || !week_number) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json({ error: "Slug must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  // Check that questions exist for this course up to this week
  const supabase = createAdminSupabaseClient();
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course_id)
    .lte("week_number", week_number)
    .eq("is_active", true);

  if (!count || count === 0) {
    return NextResponse.json({ 
      error: "No questions found for this course. Generate questions from course materials first." 
    }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      course_id,
      slug,
      title,
      week_number,
      mcq_count: mcq_count || 5,
      short_answer_count: short_answer_count || 5,
      time_limit_minutes: time_limit_minutes || null,
      is_published: false
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
