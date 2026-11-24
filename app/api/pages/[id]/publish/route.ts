import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";
import { isValidSlug, pageContentSchema, validatePublishable } from "@/lib/page-schema";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;
    const { data: row, error } = await supabase.from("resume_pages")
      .select("id,slug,status,content_json").eq("id", id).maybeSingle();
    if (error) throw new ApiError(500, `读取页面失败：${error.message}`);
    if (!row) throw new ApiError(404, "页面不存在或已经被删除。");

    const content = pageContentSchema.safeParse(row.content_json);
    if (!content.success) throw new ApiError(400, "页面内容格式不完整，请在编辑器中检查后再发布。");
    const publishError = validatePublishable(content.data);
    if (publishError) throw new ApiError(400, publishError);
    if (!isValidSlug(row.slug as string)) throw new ApiError(400, "当前链接不符合规则，请先修改链接。");

    // Single-row status flip: readers see either draft (404) or published, never an in-between state.
    const { error: updateError } = await supabase.from("resume_pages").update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (updateError) throw new ApiError(500, `发布失败：${updateError.message}`);

    return NextResponse.json({ success: true, data: { slug: row.slug } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}