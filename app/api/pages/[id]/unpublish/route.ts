import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;
    // Unpublish takes effect immediately: the public route renders dynamically with no CDN cache.
    const { data, error } = await supabase.from("resume_pages").update({
      status: "draft",
      updated_at: new Date().toISOString(),
    }).eq("id", id).select("id");
    if (error) throw new ApiError(500, `撤回失败：${error.message}`);
    if (!data.length) throw new ApiError(404, "页面不存在或已经被删除。");
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}