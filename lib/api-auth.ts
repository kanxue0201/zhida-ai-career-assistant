import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requireUser() {
  if (!isSupabaseConfigured()) throw new ApiError(503, "Supabase 尚未配置，暂时无法保存历史。");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) throw new ApiError(401, "请先登录后再保存历史。");
  return { supabase, userId: data.claims.sub };
}

export function apiError(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof ApiError ? error.message : "服务暂时异常，请稍后重试。";
  if (status === 500) console.error("Supabase API error", error instanceof Error ? error.message : "UnknownError");
  return NextResponse.json({ success: false, error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}
