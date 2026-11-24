import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";
import { modelName } from "@/lib/deepseek";
import {
  defaultPageTitle,
  generateSlug,
  isValidSlug,
  PAGE_CONTENT_MAX_CHARS,
  PAGE_CONTENT_SCHEMA_VERSION,
  PAGE_MAX_PER_USER,
  PAGE_PROMPT_VERSION,
  pageCreateSchema,
} from "@/lib/page-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireUser();
    const parsed = pageCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || "请检查页面内容。");
    const input = parsed.data;

    if (JSON.stringify(input.content).length > PAGE_CONTENT_MAX_CHARS) {
      throw new ApiError(413, "页面内容过大，请精简后再保存。");
    }
    if (input.slug !== undefined && !isValidSlug(input.slug)) {
      throw new ApiError(400, "链接需为 3—30 位小写字母、数字或连字符，且不能以连字符开头或使用保留字。");
    }

    const { count, error: countError } = await supabase.from("resume_pages")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (countError) throw new ApiError(500, `读取页面列表失败：${countError.message}`);
    if ((count ?? 0) >= PAGE_MAX_PER_USER) {
      throw new ApiError(409, `每个账户最多保存 ${PAGE_MAX_PER_USER} 个简历页，请先删除不用的页面。`);
    }

    // Source references are trace-only; drop stale ids instead of blocking the save
    // (e.g. a guest handoff whose source history was deleted before login).
    let sourceResumeVersionId: string | null = null;
    let sourceAnalysisRunId: string | null = null;
    if (input.sourceResumeVersionId) {
      const { data } = await supabase.from("resume_versions").select("id").eq("id", input.sourceResumeVersionId).maybeSingle();
      sourceResumeVersionId = (data?.id as string) ?? null;
    }
    if (input.sourceAnalysisRunId) {
      const { data } = await supabase.from("analysis_runs").select("id").eq("id", input.sourceAnalysisRunId).maybeSingle();
      sourceAnalysisRunId = (data?.id as string) ?? null;
    }

    const slug = input.slug || generateSlug();
    const { data, error } = await supabase.from("resume_pages").insert({
      user_id: userId,
      slug,
      status: "draft",
      theme: input.theme,
      title: input.title || defaultPageTitle(input.content),
      content_json: input.content,
      content_schema_version: PAGE_CONTENT_SCHEMA_VERSION,
      source_resume_version_id: sourceResumeVersionId,
      source_analysis_run_id: sourceAnalysisRunId,
      generation_model: modelName(),
      generation_prompt_version: PAGE_PROMPT_VERSION,
    }).select("id,slug").single();

    if (error) {
      if (error.code === "23505") throw new ApiError(409, "该链接已被使用，请换一个。");
      throw new ApiError(500, `页面保存失败：${error.message}`);
    }
    return NextResponse.json({ success: true, data: { id: data.id, slug: data.slug } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}