import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PageList, type PageListItem } from "@/components/pages/page-list";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PAGE_THEMES, type PageTheme } from "@/lib/page-schema";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" });

type Row = { id: string; slug: string; title: string; theme: string; status: "draft" | "published"; updated_at: string; published_at: string | null };

export default async function PagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pages");
  const supabase = await createClient();
  const { data, error } = await supabase.from("resume_pages")
    .select("id,slug,title,theme,status,updated_at,published_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("无法读取简历页列表，请稍后重试。");

  const items: PageListItem[] = ((data || []) as Row[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    theme: PAGE_THEMES.includes(row.theme as PageTheme) ? (row.theme as PageTheme) : "clean-pro",
    status: row.status,
    updatedAt: dateFormatter.format(new Date(row.updated_at)),
  }));

  return (
    <div className="site-shell pages-page">
      <SiteHeader user={user} />
      <main className="pages-main">
        <div className="pages-heading">
          <div>
            <span className="section-eyebrow">YOUR CAREER PAGES</span>
            <h1>在线简历页</h1>
            <p>把经历变成一页有设计感的求职主页，发布后无需登录即可分享。</p>
          </div>
          <Link href="/pages/new" className="new-analysis-button"><Plus size={16} /> 新建简历页</Link>
        </div>
        <PageList items={items} />
      </main>
    </div>
  );
}