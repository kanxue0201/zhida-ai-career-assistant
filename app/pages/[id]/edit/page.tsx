import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { PageEditor } from "@/components/pages/page-editor";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { pageContentSchema, PAGE_THEMES, type PageTheme } from "@/lib/page-schema";

export default async function PageEditPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publish?: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/pages/${id}/edit`);
  const query = await searchParams;

  const supabase = await createClient();
  // Filter by owner explicitly: RLS also exposes other users' published rows for reading.
  const { data } = await supabase.from("resume_pages")
    .select("id,slug,title,theme,status,content_json")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const content = pageContentSchema.safeParse(data.content_json);
  if (!content.success) {
    return (
      <main className="pages-main" style={{ paddingTop: 80 }}>
        <h1>页面内容格式不兼容</h1>
        <p>这份草稿的内容版本无法在当前编辑器中打开，请返回「在线简历页」列表删除后重新生成。</p>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <Link href="/pages" className="editor-button ghost"><ArrowLeft size={14} /> 返回简历页列表</Link>
          <Link href="/" className="editor-button ghost"><Home size={14} /> 返回首页</Link>
        </div>
      </main>
    );
  }
  const theme = PAGE_THEMES.includes(data.theme as PageTheme) ? (data.theme as PageTheme) : "clean-pro";

  return (
    <PageEditor
      isLoggedIn
      autoOpenPublish={query.publish === "1" && data.status !== "published"}
      initial={{
        id: data.id as string,
        title: data.title as string,
        slug: data.slug as string,
        theme,
        status: data.status as "draft" | "published",
        content: content.data,
      }}
    />
  );
}