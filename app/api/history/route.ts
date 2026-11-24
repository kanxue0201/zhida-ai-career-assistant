import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    const { supabase, userId } = await requireUser();
    // "Clear all saved data" includes online resume pages: published pages hold
    // personal data and must not survive the wipe.
    const { error: pagesError } = await supabase.from("resume_pages").delete().eq("user_id", userId);
    if (pagesError) throw new ApiError(500, `简历页删除失败：${pagesError.message}`);
    const { error: analysisError } = await supabase.from("analysis_runs").delete().eq("user_id", userId);
    if (analysisError) throw new ApiError(500, `分析记录删除失败：${analysisError.message}`);
    const { error: jobsError } = await supabase.from("job_posts").delete().eq("user_id", userId);
    if (jobsError) throw new ApiError(500, `岗位记录删除失败：${jobsError.message}`);
    const { error: resumesError } = await supabase.from("resumes").delete().eq("user_id", userId);
    if (resumesError) throw new ApiError(500, `简历记录删除失败：${resumesError.message}`);

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
