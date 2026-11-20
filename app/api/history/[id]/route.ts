import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;
    const { data, error } = await supabase.from("analysis_runs").delete().eq("id", id).select("id");
    if (error) throw new ApiError(500, `删除失败：${error.message}`);
    if (!data.length) throw new ApiError(404, "记录不存在或已经被删除。");
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
