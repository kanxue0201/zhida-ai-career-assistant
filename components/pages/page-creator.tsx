"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, FileText, History,
  LoaderCircle, LockKeyhole, RefreshCw, Sparkles, UploadCloud, X,
} from "lucide-react";
import { extractPdfText, PDF_MAX_BYTES, PdfError } from "@/lib/pdf";
import { defaultPageTitle, generateSlug, type PageContent } from "@/lib/page-schema";
import { loadLocalDraft, saveLocalDraft } from "@/lib/page-draft";

type Source = {
  analysisId: string;
  resumeVersionId: string;
  jobTitle: string;
  companyName: string | null;
  resumeTitle: string;
  versionNo: number;
  createdAt: string;
};

type Phase = "choose" | "upload" | "history";
type FileInfo = { name: string; characters: number };

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", timeZone: "Asia/Shanghai" });

export function PageCreator({ isLoggedIn, presetAnalysisId, presetResumeVersionId }: {
  isLoggedIn: boolean;
  presetAnalysisId: string | null;
  presetResumeVersionId: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(presetAnalysisId && isLoggedIn ? "history" : "choose");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [sourcesError, setSourcesError] = useState("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(presetAnalysisId);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const operationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setHasLocalDraft(Boolean(loadLocalDraft())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "history" || !isLoggedIn || sources !== null) return;
    let cancelled = false;
    fetch("/api/pages/sources")
      .then(async (response) => {
        const payload = await response.json() as { success: boolean; data?: Source[]; error?: { message?: string } };
        if (cancelled) return;
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "读取历史分析失败。");
        setSources(payload.data);
        if (presetAnalysisId && payload.data.some((item) => item.analysisId === presetAnalysisId)) {
          setSelectedAnalysis(presetAnalysisId);
        } else if (payload.data.length) {
          setSelectedAnalysis((current) => current ?? payload.data![0].analysisId);
        }
      })
      .catch((caught: unknown) => { if (!cancelled) setSourcesError(caught instanceof Error ? caught.message : "读取历史分析失败。"); });
    return () => { cancelled = true; };
  }, [phase, isLoggedIn, sources, presetAnalysisId]);

  async function handleFile(file?: File) {
    if (!file) return;
    operationRef.current += 1;
    const operation = operationRef.current;
    setError("");
    setFileInfo(null);
    setResumeText("");
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) { setError("请选择 PDF 格式的简历文件。"); return; }
    if (file.size > PDF_MAX_BYTES) { setError("文件超过 10 MB，请压缩或精简后重新上传。"); return; }
    setExtracting(true);
    try {
      const parsed = await extractPdfText(file);
      if (operation !== operationRef.current) return;
      setResumeText(parsed.text);
      setFileInfo({ name: file.name, characters: parsed.text.length });
    } catch (caught) {
      if (operation !== operationRef.current) return;
      setError(caught instanceof PdfError ? caught.message : "PDF 解析失败，请重新导出后再试。");
    } finally {
      if (operation === operationRef.current) setExtracting(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!extracting && !generating) void handleFile(event.dataTransfer.files[0]);
  }

  async function generate() {
    if (generating) return;
    const useUpload = phase === "upload";
    const selected = sources?.find((item) => item.analysisId === selectedAnalysis);
    if (useUpload && resumeText.trim().length < 50) return;
    if (!useUpload && !selected) return;

    setGenerating(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 110_000);
    try {
      const body = useUpload
        ? { resumeText }
        : { resumeVersionId: selected!.resumeVersionId, analysisId: selected!.analysisId };
      const response = await fetch("/api/pages/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal,
      });
      const payload = await response.json() as { success: boolean; data?: { content: PageContent }; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "生成失败，请稍后重试。");
      const content = payload.data.content;

      if (isLoggedIn) {
        const created = await fetch("/api/pages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            sourceResumeVersionId: useUpload ? undefined : selected!.resumeVersionId,
            sourceAnalysisRunId: useUpload ? undefined : selected!.analysisId,
          }),
          signal: controller.signal,
        });
        const createdPayload = await created.json() as { success: boolean; data?: { id: string }; error?: { message?: string } };
        if (!created.ok || !createdPayload.success || !createdPayload.data) throw new Error(createdPayload.error?.message || "草稿保存失败，请重试。");
        router.push(`/pages/${createdPayload.data.id}/edit`);
        return;
      }

      const saved = saveLocalDraft({ content, theme: "clean-pro", title: defaultPageTitle(content), slug: generateSlug() });
      if (!saved) throw new Error("当前浏览器无法保存本地草稿，请允许本地存储，或登录后再生成。");
      router.push("/pages/draft");
    } catch (caught) {
      setError(caught instanceof Error && caught.name === "AbortError" ? "等待时间过长，生成已停止。你的输入已保留，请重试。" : caught instanceof Error ? caught.message : "生成失败，请稍后重试。");
      setGenerating(false);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const canGenerate = phase === "upload" ? resumeText.trim().length >= 50 && !extracting : Boolean(selectedAnalysis && sources?.length);

  return (
    <main className="pages-main creator-main">
      <div className="pages-heading">
        <div>
          <span className="section-eyebrow">CAREER PAGE STUDIO</span>
          <h1>生成在线简历页</h1>
          <p>AI 把真实经历整理成个人主页：定位、优势、项目、技能、联系方式，一页呈现。</p>
        </div>
      </div>

      {hasLocalDraft && !generating && (
        <div className="creator-draft-note">
          <CircleAlert size={15} />
          <span>检测到本浏览器有一份未发布的草稿。</span>
          <Link href="/pages/draft">继续编辑 <ArrowUpRight size={12} /></Link>
          <span className="creator-draft-hint">重新生成会覆盖它。</span>
        </div>
      )}

      {phase === "choose" && (
        <div className="creator-choices">
          <button type="button" className="creator-choice" onClick={() => { setPhase("upload"); setError(""); }}>
            <span className="step-icon"><UploadCloud size={22} /></span>
            <h3>上传 PDF 简历</h3>
            <p>浏览器本地提取文字，原 PDF 不上传。游客也能直接生成和编辑。</p>
            <span className="creator-choice-cta">选择文件 <ArrowRight size={14} /></span>
          </button>
          <button type="button" className="creator-choice" onClick={() => { setPhase("history"); setError(""); }}>
            <span className="step-icon"><History size={22} /></span>
            <h3>从历史分析生成</h3>
            <p>{isLoggedIn ? "选择一份已保存的分析报告，直接用它的简历文字生成主页。" : "登录后可从已保存的分析报告一键生成，无需重新上传。"}</p>
            <span className="creator-choice-cta">{isLoggedIn ? "选择报告" : "登录后使用"} <ArrowRight size={14} /></span>
          </button>
        </div>
      )}

      {phase === "upload" && (
        <section className="creator-panel">
          <div className="creator-panel-head">
            <h2><FileText size={17} /> 上传 PDF 简历</h2>
            <button type="button" className="reset-button" onClick={() => { setPhase("choose"); setError(""); }} disabled={generating}>换个来源</button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="visually-hidden" id="page-resume-upload"
            onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void handleFile(file); }} disabled={extracting || generating} />
          {!fileInfo ? (
            <div className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
              <label htmlFor="page-resume-upload" className="upload-label">
                <span className="upload-icon"><UploadCloud size={27} /></span>
                <strong>点击上传，或拖拽简历到这里</strong>
                <p>仅支持文本型 PDF，最大 10 MB，最多 50 页</p>
                <span className="choose-file">选择 PDF 文件 <ArrowUpRight size={14} /></span>
              </label>
            </div>
          ) : (
            <div className="creator-file-ready">
              <CheckCircle2 size={17} />
              <span><strong>{fileInfo.name}</strong> · 已提取 {fileInfo.characters.toLocaleString()} 字符</span>
              {!generating && <button type="button" onClick={() => { setFileInfo(null); setResumeText(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="移除简历"><X size={16} /></button>}
            </div>
          )}
          {extracting && <p className="creator-extracting"><RefreshCw size={14} className="spin" /> 正在本地提取简历文字…</p>}
          <div className="local-note"><LockKeyhole size={13} /> PDF 仅在浏览器中解析，不保存原文件</div>
        </section>
      )}

      {phase === "history" && (
        <section className="creator-panel">
          <div className="creator-panel-head">
            <h2><History size={17} /> 从历史分析生成</h2>
            <button type="button" className="reset-button" onClick={() => { setPhase("choose"); setError(""); }} disabled={generating}>换个来源</button>
          </div>
          {!isLoggedIn ? (
            <div className="creator-login-note">
              <LockKeyhole size={18} />
              <p>历史分析保存在你的账户中，登录后即可选择。</p>
              <Link href="/login?next=/pages/new" className="editor-button primary">登录并继续 <ArrowRight size={14} /></Link>
            </div>
          ) : sourcesError ? (
            <p className="pages-error" role="alert">{sourcesError}</p>
          ) : sources === null ? (
            <p className="creator-extracting"><LoaderCircle size={14} className="spin" /> 正在读取历史分析…</p>
          ) : sources.length === 0 ? (
            <div className="creator-login-note">
              <FileText size={18} />
              <p>还没有已保存的分析报告。可以先做一次分析，或直接上传 PDF 生成。</p>
              <Link href="/" className="editor-button ghost">去做分析 <ArrowRight size={14} /></Link>
            </div>
          ) : (
            <div className="creator-sources" role="radiogroup" aria-label="选择历史分析">
              {sources.map((source) => (
                <label key={source.analysisId} className={`creator-source ${selectedAnalysis === source.analysisId ? "active" : ""}`}>
                  <input type="radio" name="source" checked={selectedAnalysis === source.analysisId} onChange={() => setSelectedAnalysis(source.analysisId)} disabled={generating} />
                  <span className="creator-source-main">
                    <strong>{source.resumeTitle} · 第 {source.versionNo} 版</strong>
                    <small>目标岗位：{source.jobTitle}{source.companyName ? `（${source.companyName}）` : ""} · {dateFormatter.format(new Date(source.createdAt))}</small>
                  </span>
                  {presetResumeVersionId === source.resumeVersionId && <span className="creator-source-tag">来自报告</span>}
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {error && <div className="error-banner" role="alert"><CircleAlert size={19} /><div><strong>这次没有顺利完成</strong><p>{error}</p></div>{canGenerate && !generating && <button type="button" onClick={() => void generate()}>重试 <RefreshCw size={14} /></button>}</div>}

      {phase !== "choose" && (
        <div className="creator-generate-row">
          <p className="creator-privacy"><Sparkles size={15} /> 点击生成即表示同意将简历文字发送至本站服务器及 DeepSeek 处理。{isLoggedIn ? "生成结果保存为你的私有草稿。" : "游客草稿仅保存在本浏览器，发布时登录一次即可。"}</p>
          <button type="button" className="analyze-button" disabled={!canGenerate || generating} onClick={() => void generate()}>
            {generating ? <><RefreshCw size={18} className="spin" /> 正在生成主页内容…</> : <><Sparkles size={18} /> AI 生成简历页 <ArrowRight size={18} /></>}
          </button>
        </div>
      )}

      {generating && (
        <div className="creator-progress" aria-live="polite">
          <LoaderCircle size={20} className="spin" />
          <div>
            <strong>AI 正在整理你的个人主页</strong>
            <p>提炼定位与优势、组织项目与技能，通常需要几十秒，请不要关闭页面。</p>
          </div>
        </div>
      )}
    </main>
  );
}