import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { pageContentSchema, PAGE_THEMES, type PageContent, type PageTheme } from "@/lib/page-schema";
import { ResumePageView } from "@/components/resume-page/page-view";

// Published pages render per request with no CDN cache, so unpublish/delete
// takes effect immediately (privacy requirement).
export const dynamic = "force-dynamic";

type PublishedPage = { content: PageContent; theme: PageTheme };

async function loadPublishedPage(slug: string): Promise<PublishedPage | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    // Select only render-needed columns; never expose user_id or internal fields.
    const { data } = await supabase.from("resume_pages")
      .select("theme,content_json")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    const content = pageContentSchema.safeParse(data.content_json);
    if (!content.success) return null;
    const theme = PAGE_THEMES.includes(data.theme as PageTheme) ? (data.theme as PageTheme) : "clean-pro";
    return { content: content.data, theme };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) return { title: "页面不存在｜职达 AI", robots: { index: false } };
  const { name, headline, tagline } = page.content.profile;
  const title = `${name} · ${headline}`;
  const description = tagline.slice(0, 160);
  return {
    title,
    description,
    openGraph: { title, description, type: "profile", siteName: "职达 AI · 在线求职主页" },
  };
}

export default async function PublicResumePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) notFound();
  return <ResumePageView content={page.content} theme={page.theme} branded />;
}