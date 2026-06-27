// app/api/admin/generate-questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-check";
import { generateQuestionsFromMaterial } from "@/lib/ai/question-generator";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow up to 2 minutes for AI generation

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { material_id, mcq_count = 5, short_answer_count = 5 } = body;

    if (!material_id) {
      return NextResponse.json({ error: "material_id is required" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    // Fetch material + course info
    const { data: material, error: matError } = await supabase
      .from("course_materials")
      .select("*, courses(code, title)")
      .eq("id", material_id)
      .single();

    if (matError || !material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (!material.raw_text || material.raw_text.length < 100) {
      return NextResponse.json({ error: "Material has insufficient text for question generation" }, { status: 422 });
    }

    // Update status to processing
    await supabase
      .from("course_materials")
      .update({ processing_status: "processing" })
      .eq("id", material_id);

    // Generate questions via AI
    const course = (material as any).courses;
    const generatedQuestions = await generateQuestionsFromMaterial(
      material.raw_text,
      mcq_count,
      short_answer_count,
      course.code,
      material.week_number
    );

    if (!generatedQuestions.length) {
      await supabase
        .from("course_materials")
        .update({ processing_status: "error" })
        .eq("id", material_id);
      return NextResponse.json({ error: "AI could not generate questions from this material" }, { status: 422 });
    }

    // Insert questions into the permanent pool
    const questionsToInsert = generatedQuestions.map((q) => ({
      course_id: material.course_id,
      material_id: material_id,
      week_number: material.week_number,
      question_type: q.question_type,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      source_sentence: q.source_sentence,
      options: q.options || null,
      explanation: q.explanation,
      is_active: true
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      await supabase
        .from("course_materials")
        .update({ processing_status: "error" })
        .eq("id", material_id);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Mark material as done
    await supabase
      .from("course_materials")
      .update({ processing_status: "done" })
      .eq("id", material_id);

    return NextResponse.json({
      success: true,
      questions_generated: inserted?.length || 0,
      questions: inserted
    });
  } catch (e: any) {
    console.error("Question generation error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
