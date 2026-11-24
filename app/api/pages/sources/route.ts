import { NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

type SourceRow = {
  id: string;
  created_at: string;
  resume_version_id: string;
  job_posts: { job_title: string; company_name: string | null } | null;
  resume_versions: { version_no: number; resumes: { title: string } | null } | null;
};

// Recent succeeded analyses as generation sources for the page creator.
export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("analysis_runs")
      .select("id,created_at,resume_version_id,job_posts(job_title,company_name),resume_versions(version_no,resumes(title))")
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    const rows = (data || []) as unknown as SourceRow[];
    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        analysisId: row.id,
        resumeVersionId: row.resume_version_id,
        jobTitle: row.job_posts?.job_title || "目标岗位",
        companyName: row.job_posts?.company_name || null,
        resumeTitle: row.resume_versions?.resumes?.title || "我的简历",
        versionNo: row.resume_versions?.version_no || 1,
        createdAt: row.created_at,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}