import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireUser();
    const body = await request.json() as { description?: string; jobTitle?: string; companyName?: string };
    const description = body.description?.trim() || "";
    if (description.length < 20 || description.length > 20_000) throw new ApiError(400, "岗位描述长度不符合要求。");
    const firstLine = description.split("\n").map((line) => line.trim()).find(Boolean) || "目标岗位";
    const jobTitle = (body.jobTitle?.trim() || firstLine).slice(0, 160);

    const { data, error } = await supabase.from("job_posts").insert({
      user_id: userId,
      job_title: jobTitle,
      company_name: body.companyName?.trim() || null,
      description,
      updated_at: new Date().toISOString(),
    }).select("id").single();
    if (error) throw new ApiError(500, `岗位保存失败：${error.message}`);

    return NextResponse.json({ success: true, data: { jobPostId: data.id as string } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
