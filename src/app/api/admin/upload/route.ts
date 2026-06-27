// app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-check";
import { extractTextFromFile, cleanText } from "@/lib/extract-text";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const courseId = formData.get("course_id") as string;
    const weekNumber = parseInt(formData.get("week_number") as string);
    const title = formData.get("title") as string;

    if (!file || !courseId || !weekNumber || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Extract file type
    const fileType = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["pdf", "docx", "txt"].includes(fileType)) {
      return NextResponse.json({ error: "Only PDF, DOCX, and TXT files are supported" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    let rawText: string;
    try {
      rawText = await extractTextFromFile(buffer, fileType);
      rawText = cleanText(rawText);
    } catch (e) {
      return NextResponse.json({ error: `Failed to extract text: ${e}` }, { status: 422 });
    }

    if (!rawText || rawText.length < 100) {
      return NextResponse.json({ error: "File appears to be empty or unreadable" }, { status: 422 });
    }

    const supabase = createAdminSupabaseClient();

    // Insert material record
    const { data: material, error: insertError } = await supabase
      .from("course_materials")
      .insert({
        course_id: courseId,
        week_number: weekNumber,
        title,
        file_name: file.name,
        file_type: fileType,
        raw_text: rawText,
        processing_status: "done"
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      material,
      text_preview: rawText.slice(0, 200) + "..."
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
