"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Copy, Eye, Globe, LoaderCircle, PencilLine, Plus, Trash2, Undo2 } from "lucide-react";
import { PAGE_THEME_META, type PageTheme } from "@/lib/page-schema";

export type PageListItem = {
  id: string;
  slug: string;
  title: string;
  theme: PageTheme;
  status: "draft" | "published";
  updatedAt: string;
};

export function PageList({ items }: { items: PageListItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  async function act(id: string, action: "delete" | "unpublish") {
    const confirmText = action === "delete"
      ? "确定删除这个简历页吗？已发布的公开链接会立即失效，此操作无法撤销。"
      : "确定撤回发布吗？公开链接将立即失效，内容会保留为草稿。";
    if (!window.confirm(confirmText)) return;
    setBusyId(id);
    setError("");
    const response = await fetch(action === "delete" ? `/api/pages/${id}` : `/api/pages/${id}/unpublish`, {
      method: action === "delete" ? "DELETE" : "POST",
    });
    const payload = await response.json() as { success: boolean; error?: { message?: string } };
    setBusyId("");
    if (!response.ok || !payload.success) { setError(payload.error?.message || "操作失败，请重试。"); return; }
    router.refresh();
  }

  async function copy(slug: string, id: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${slug}`);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(""), 2_000);
    } catch {
      setError(`复制失败，请手动复制：/u/${slug}`);
    }
  }

  if (!items.length) {
    return (
      <div className="pages-empty">
        <Globe size={30} />
        <h2>还没有在线简历页</h2>
        <p>上传一份 PDF 简历，或从历史分析中选择内容，AI 帮你生成一页有设计感的求职主页。</p>
        <Link href="/pages/new" className="new-analysis-button"><Plus size={16} /> 立即创建</Link>
      </div>
    );
  }

  return (
    <div className="pages-list">
      {error && <p className="pages-error" role="alert">{error}</p>}
      {items.map((item) => (
        <article key={item.id} className="page-card">
          <div className="page-card-main">
            <div className="page-card-top">
              <h3>{item.title}</h3>
              <span className={`page-status ${item.status}`}>{item.status === "published" ? "已发布" : "草稿"}</span>
            </div>
            <p className="page-card-meta">
              <span className={`theme-swatch swatch-${item.theme}`} /> {PAGE_THEME_META[item.theme].name}
              <span>·</span> 更新于 {item.updatedAt}
            </p>
            {item.status === "published" && <a className="page-card-url" href={`/u/${item.slug}`} target="_blank" rel="noopener noreferrer">/u/{item.slug} <ArrowUpRight size={12} /></a>}
          </div>
          <div className="page-card-actions">
            <Link href={`/pages/${item.id}/edit`} className="editor-button ghost"><PencilLine size={13} /> 编辑</Link>
            {item.status === "published" && <>
              <button type="button" className="editor-button ghost" onClick={() => copy(item.slug, item.id)}>
                {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />} {copiedId === item.id ? "已复制" : "复制链接"}
              </button>
              <a className="editor-button ghost" href={`/u/${item.slug}`} target="_blank" rel="noopener noreferrer"><Eye size={13} /> 查看</a>
              <button type="button" className="editor-button ghost" disabled={busyId === item.id} onClick={() => act(item.id, "unpublish")}><Undo2 size={13} /> 撤回</button>
            </>}
            <button type="button" className="editor-button danger" disabled={busyId === item.id} onClick={() => act(item.id, "delete")}>
              {busyId === item.id ? <LoaderCircle size={13} className="spin" /> : <Trash2 size={13} />} 删除
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}