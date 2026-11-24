"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import { PageEditor } from "@/components/pages/page-editor";
import { clearLocalDraft, loadLocalDraft, type LocalPageDraft } from "@/lib/page-draft";

// Guest local-draft editor and post-login handoff recovery.
// Logged-in visitors landing here (next=/pages/draft after login) get their
// localStorage draft promoted to a server row exactly once, then move to the editor.
export function GuestDraftGate({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "editor" | "restoring" | "error">("loading");
  const [draft, setDraft] = useState<LocalPageDraft | null>(null);
  const [error, setError] = useState("");
  const restoreSeq = useRef(0);

  async function restore(current: LocalPageDraft) {
    const seq = ++restoreSeq.current;
    setPhase("restoring");
    setError("");
    try {
      const body = {
        content: current.content,
        theme: current.theme,
        title: current.title,
        slug: current.slug,
        sourceResumeVersionId: current.source?.resumeVersionId,
        sourceAnalysisRunId: current.source?.analysisRunId,
      };
      let response = await fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let payload = await response.json() as { success: boolean; data?: { id: string }; error?: { message?: string } };
      // Slug taken meanwhile: retry once with a server-generated slug.
      if (response.status === 409) {
        response = await fetch("/api/pages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, slug: undefined }),
        });
        payload = await response.json() as typeof payload;
      }
      if (seq !== restoreSeq.current) return;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "草稿云端保存失败，请重试。");
      clearLocalDraft();
      router.replace(`/pages/${payload.data.id}/edit`);
    } catch (caught) {
      if (seq !== restoreSeq.current) return;
      setError(caught instanceof Error ? caught.message : "草稿云端保存失败，请重试。");
      setPhase("error");
    }
  }

  useEffect(() => {
    // Deferred so state updates happen outside the effect body; cleanup keeps
    // this single-shot under StrictMode double-invocation.
    const timer = window.setTimeout(() => {
      const local = loadLocalDraft();
      if (!local) { router.replace(isLoggedIn ? "/pages" : "/pages/new"); return; }
      setDraft(local);
      if (isLoggedIn) void restore(local);
      else setPhase("editor");
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "editor" && draft) {
    return (
      <PageEditor
        isLoggedIn={false}
        initial={{ id: null, title: draft.title, slug: draft.slug, theme: draft.theme, status: "draft", content: draft.content, source: draft.source }}
      />
    );
  }

  return (
    <main className="pages-main draft-gate">
      {phase === "error" ? (
        <div className="draft-gate-card">
          <CircleAlert size={26} />
          <h1>草稿恢复没有完成</h1>
          <p>{error}</p>
          <p className="draft-gate-note">你的草稿仍保留在本浏览器中，重试不会丢失内容。</p>
          <button type="button" className="editor-button primary" onClick={() => draft && void restore(draft)}><RefreshCw size={14} /> 重试云端保存</button>
        </div>
      ) : (
        <div className="draft-gate-card">
          <LoaderCircle size={26} className="spin" />
          <h1>{phase === "restoring" ? "正在把草稿保存到你的账户…" : "正在读取本地草稿…"}</h1>
          <p>马上就好，请不要关闭页面。</p>
        </div>
      )}
    </main>
  );
}