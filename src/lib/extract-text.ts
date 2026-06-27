// lib/extract-text.ts
// Extracts plain text from PDF, DOCX, TXT files

export async function extractTextFromFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const type = fileType.toLowerCase().replace(".", "");

  switch (type) {
    case "txt":
    case "text/plain":
      return buffer.toString("utf-8");

    case "pdf":
    case "application/pdf": {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text;
    }

    case "docx":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// Clean extracted text for AI processing
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")   // max 2 blank lines
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")        // collapse spaces
    .trim();
}

// Chunk text into segments for processing
export function chunkText(text: string, maxChars = 12000): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split("\n\n");
  let current = "";

  for (const para of paragraphs) {
    if ((current + para).length > maxChars) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}
