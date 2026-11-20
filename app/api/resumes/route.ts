import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireUser();
    const body = await request.json() as {
      extractedText?: string;
      originalFileName?: string;
      fileSizeBytes?: number;
      pageCount?: number;
    };
    const extractedText = body.extractedText?.trim() || "";
    const originalFileName = body.originalFileName?.trim() || "resume.pdf";
    const fileSizeBytes = Number(body.fileSizeBytes);
    const pageCount = Number(body.pageCount);

    if (!originalFileName.toLowerCase().endsWith(".pdf")) throw new ApiError(400, "请选择 PDF 简历。");
    if (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > 10 * 1024 * 1024) throw new ApiError(400, "PDF 大小必须在 10 MB 以内。");
    if (extractedText.length < 50 || extractedText.length > 30_000) throw new ApiError(400, "简历文字长度不符合要求。");
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 50) throw new ApiError(400, "PDF 页数不符合要求。");

    const resumeId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const title = originalFileName.replace(/\.pdf$/i, "").slice(0, 120) || "我的简历";

    const { error: resumeError } = await supabase.from("resumes").insert({
      id: resumeId,
      user_id: userId,
      title,
      updated_at: new Date().toISOString(),
    });
    if (resumeError) throw new ApiError(500, `简历记录保存失败：${resumeError.message}`);

    const { error: versionError } = await supabase.from("resume_versions").insert({
      id: versionId,
      resume_id: resumeId,
      user_id: userId,
      version_no: 1,
      original_file_name: originalFileName,
      storage_path: null,
      file_size_bytes: fileSizeBytes,
      page_count: pageCount,
      extracted_text: extractedText,
      parse_status: "ready",
      parser_version: "pdfjs-1",
    });
    if (versionError) {
      await supabase.from("resumes").delete().eq("id", resumeId);
      throw new ApiError(500, `简历版本保存失败：${versionError.message}`);
    }

    return NextResponse.json({ success: true, data: { resumeId, resumeVersionId: versionId } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
