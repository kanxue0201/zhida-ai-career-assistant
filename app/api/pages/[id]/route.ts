import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";
import { isValidSlug, PAGE_CONTENT_MAX_CHARS, pagePatchSchema } from "@/lib/page-schema";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;
    const parsed = pagePatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || "请检查修改内容。");
    const input = parsed.data;

    if (input.content && JSON.stringify(input.content).length > PAGE_CONTENT_MAX_CHARS) {
      throw new ApiError(413, "页面内容过大，请精简后再保存。");
    }
    if (input.slug !== undefined && !isValidSlug(input.slug)) {
      throw new ApiError(400, "链接需为 3—30 位小写字母、数字或连字符，且不能以连字符开头或使用保留字。");
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) update.title = input.title;
    if (input.theme !== undefined) update.theme = input.theme;
    if (input.slug !== undefined) update.slug = input.slug;
    if (input.content !== undefined) update.content_json = input.content;

    // RLS restricts the update to the owner's row; empty result means not found.
    const { data, error } = await supabase.from("resume_pages").update(update).eq("id", id).select("id,slug");
    if (error) {
      if (error.code === "23505") throw new ApiError(409, "该链接已被使用，请换一个。");
      throw new ApiError(500, `保存失败：${error.message}`);
    }
    if (!data.length) throw new ApiError(404, "页面不存在或已经被删除。");
    return NextResponse.json({ success: true, data: { id, slug: data[0].slug } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;
    const { data, error } = await supabase.from("resume_pages").delete().eq("id", id).select("id");
    if (error) throw new ApiError(500, `删除失败：${error.message}`);
    if (!data.length) throw new ApiError(404, "页面不存在或已经被删除。");
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}