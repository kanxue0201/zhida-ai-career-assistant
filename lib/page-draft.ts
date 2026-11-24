"use client";

import { generateSlug, isValidSlug, pageContentSchema, PAGE_THEMES, type PageContent, type PageTheme } from "@/lib/page-schema";

const DRAFT_KEY = "zhida.pageDraft.v1";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const DRAFT_MAX_CHARS = 200_000;

export type LocalPageDraft = {
  content: PageContent;
  theme: PageTheme;
  title: string;
  slug: string;
  savedAt: number;
  source?: { resumeVersionId?: string; analysisRunId?: string };
};

export function localStorageAvailable() {
  try {
    const probe = "__zhida_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function loadLocalDraft(): LocalPageDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalPageDraft>;
    if (!parsed || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    const content = pageContentSchema.safeParse(parsed.content);
    const theme = PAGE_THEMES.includes(parsed.theme as PageTheme) ? (parsed.theme as PageTheme) : "clean-pro";
    if (!content.success) return null;
    return {
      content: content.data,
      theme,
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.slice(0, 120) : "我的在线简历页",
      slug: typeof parsed.slug === "string" && isValidSlug(parsed.slug) ? parsed.slug : generateSlug(),
      savedAt: parsed.savedAt,
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export function saveLocalDraft(draft: Omit<LocalPageDraft, "savedAt">): boolean {
  try {
    const payload = JSON.stringify({ ...draft, savedAt: Date.now() });
    if (payload.length > DRAFT_MAX_CHARS) return false;
    window.localStorage.setItem(DRAFT_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function clearLocalDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}