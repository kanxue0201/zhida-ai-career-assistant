import { NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api-auth";
import { isValidSlug, RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/page-schema";

export const runtime = "nodejs";

// Best-effort availability check for editor UX only. Under RLS this cannot see
// other users' draft rows; actual uniqueness is enforced by the DB unique
// constraint at insert/update time (surfaced as 409).
export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser();
    const url = new URL(request.url);
    const slug = (url.searchParams.get("slug") || "").trim().toLowerCase();
    const excludeId = url.searchParams.get("excludeId") || "";

    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json({ success: true, data: { available: false, reason: "format" } }, { headers: { "Cache-Control": "no-store" } });
    }
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json({ success: true, data: { available: false, reason: "reserved" } }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!isValidSlug(slug)) throw new ApiError(400, "链接不符合规则。");

    let query = supabase.from("resume_pages").select("id").eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.limit(1);
    if (error) throw new ApiError(500, `检查链接失败：${error.message}`);
    return NextResponse.json(
      { success: true, data: { available: data.length === 0, reason: data.length ? "taken" : null } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}