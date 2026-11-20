"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  FileText,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { Results } from "@/components/results";
import { SiteHeader } from "@/components/site-header";
import type { CurrentUser } from "@/lib/supabase/server";
import { extractPdfText, PDF_MAX_BYTES, PdfError } from "@/lib/pdf";
import type { AnalysisResult } from "@/lib/analysis-schema";

type Status = "idle" | "extracting" | "ready" | "analyzing" | "success" | "error";
type FileInfo = { name: string; size: number; pages?: number; characters?: number };

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CareerAssistant({ initialUser }: { initialUser: CurrentUser | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [inputChanged, setInputChanged] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const operationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const resumeVersionIdRef = useRef<string | null>(null);
  const jobPostIdRef = useRef<string | null>(null);

  const isAnalyzing = status === "analyzing";
  const isExtracting = status === "extracting";
  const canAnalyze = resumeText.trim().length >= 50 && jobDescription.trim().length >= 20 && jobDescription.length <= 20_000 && !isAnalyzing && !isExtracting;

  async function handleFile(file?: File) {
    if (!file) return;
    const operation = ++operationRef.current;
    abortRef.current?.abort();
    setResult(null);
    setSavedAnalysisId(null);
    setSaveWarning("");
    setResumeFile(null);
    resumeVersionIdRef.current = null;
    setInputChanged(false);
    setError("");
    setResumeText("");

    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      setStatus("error");
      setFileInfo(null);
      setError("请选择 PDF 格式的简历文件。");
      return;
    }
    if (file.size > PDF_MAX_BYTES) {
      setStatus("error");
      setFileInfo(null);
      setError("文件超过 10 MB，请压缩或精简后重新上传。");
      return;
    }

    setResumeFile(file);
    setFileInfo({ name: file.name, size: file.size });
    setStatus("extracting");
    try {
      const parsed = await extractPdfText(file);
      if (operation !== operationRef.current) return;
      setResumeText(parsed.text);
      setFileInfo({ name: file.name, size: file.size, pages: parsed.pageCount, characters: parsed.text.length });
      setStatus("ready");
    } catch (caught) {
      if (operation !== operationRef.current) return;
      setStatus("error");
      setError(caught instanceof PdfError ? caught.message : "PDF 解析失败，请重新导出后再试。");
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!isAnalyzing && !isExtracting) void handleFile(event.dataTransfer.files[0]);
  }

  async function analyze() {
    if (!canAnalyze) return;
    const operation = ++operationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 110_000);
    setStatus("analyzing");
    setError("");
    setSavedAnalysisId(null);
    setSaveWarning("");
    setInputChanged(false);

    try {
      let resumeVersionId = resumeVersionIdRef.current;
      let jobPostId = jobPostIdRef.current;
      const shouldSave = Boolean(initialUser && saveHistory);

      if (shouldSave && !resumeVersionId) {
        if (!resumeFile || !fileInfo?.pages) throw new Error("请重新选择需要保存的 PDF 简历。");
        const savedResume = await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractedText: resumeText,
            originalFileName: resumeFile.name,
            fileSizeBytes: resumeFile.size,
            pageCount: fileInfo.pages,
          }),
          signal: controller.signal,
        });
        const payload = await savedResume.json() as { success: boolean; data?: { resumeVersionId: string }; error?: { message?: string } };
        if (!savedResume.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "简历保存失败。");
        resumeVersionId = payload.data.resumeVersionId;
        resumeVersionIdRef.current = resumeVersionId;
      }

      if (shouldSave && !jobPostId) {
        const savedJob = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: jobDescription.trim() }),
          signal: controller.signal,
        });
        const payload = await savedJob.json() as { success: boolean; data?: { jobPostId: string }; error?: { message?: string } };
        if (!savedJob.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "岗位保存失败。");
        jobPostId = payload.data.jobPostId;
        jobPostIdRef.current = jobPostId;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription: jobDescription.trim(), saveHistory: shouldSave, resumeVersionId, jobPostId }),
        signal: controller.signal,
      });
      const payload = await response.json() as { success: boolean; data?: AnalysisResult; analysisId?: string; warning?: string; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message || "分析未完成，请稍后重试。");
      }
      if (operation !== operationRef.current) return;
      setResult(payload.data);
      setSavedAnalysisId(payload.analysisId || null);
      setSaveWarning(payload.warning || "");
      setStatus("success");
      window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (caught) {
      if (operation !== operationRef.current) return;
      setStatus("error");
      setError(caught instanceof Error && caught.name === "AbortError" ? "等待时间过长，分析已停止。你的输入已保留，请重试。" : caught instanceof Error ? caught.message : "分析失败，请稍后重试。");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function removeResume() {
    operationRef.current += 1;
    abortRef.current?.abort();
    setStatus("idle");
    setFileInfo(null);
    setResumeFile(null);
    setResumeText("");
    setResult(null);
    setError("");
    setInputChanged(false);
    setSavedAnalysisId(null);
    setSaveWarning("");
    resumeVersionIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearAll() {
    operationRef.current += 1;
    abortRef.current?.abort();
    setStatus("idle");
    setFileInfo(null);
    setResumeFile(null);
    setResumeText("");
    setJobDescription("");
    setResult(null);
    setError("");
    setInputChanged(false);
    setSavedAnalysisId(null);
    setSaveWarning("");
    resumeVersionIdRef.current = null;
    jobPostIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  return (
    <div className="site-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <SiteHeader user={initialUser} />
      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-kicker"><span><WandSparkles size={14} /></span> AI CAREER COPILOT <i /> 让好经历被看见</div>
            <h1>不只是投递简历，<br /><em>更精准地</em>抵达理想工作。</h1>
            <p>上传简历，粘贴目标岗位。AI 为你梳理匹配优势、优化表达，<br className="desktop-break" />并提前准备好求职信和面试答案。</p>
            <div className="hero-proof"><span><Check size={14} /> 无需注册</span><span><Check size={14} /> {initialUser ? "私有保存可选" : "原 PDF 不上传"}</span><span><Check size={14} /> 针对岗位生成</span></div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="strategy-card">
              <div className="strategy-top"><span>你的求职策略</span><span className="live-pill"><i /> 4 IN 1</span></div>
              <div className="strategy-score"><div className="mini-score"><Target size={24} /></div><div><strong>从经历到机会</strong><p>一次分析，四个关键环节</p></div></div>
              <div className="strategy-items"><span><Target size={15} /> 岗位匹配分析<CheckCircle2 size={15} /></span><span><FileCheck2 size={15} /> 简历优化建议<CheckCircle2 size={15} /></span><span><FileText size={15} /> 专属求职信<CheckCircle2 size={15} /></span><span><Sparkles size={15} /> 10 组面试问答<CheckCircle2 size={15} /></span></div>
              <div className="strategy-bottom"><Zap size={14} /> 把更多时间，留给真正重要的事</div>
            </div>
            <div className="floating-note"><Sparkles size={15} /><span>为每一次投递<br /><strong>量身定制</strong></span></div>
          </div>
        </section>

        <section className="workflow-strip" id="workflow" aria-label="使用流程">
          <div><span>01</span><p><strong>上传 PDF 简历</strong>浏览器本地提取文字</p></div><ChevronRight size={18} />
          <div><span>02</span><p><strong>粘贴目标岗位</strong>让分析更有针对性</p></div><ChevronRight size={18} />
          <div><span>03</span><p><strong>获取求职策略</strong>四份结果，一次生成</p></div>
        </section>

        <section className="workspace-section" id="workspace">
          <div className="section-heading"><div><span className="section-number">01 / 输入信息</span><h2>先告诉我们，你想去哪里</h2></div><button type="button" className="reset-button" onClick={clearAll} disabled={!fileInfo && !jobDescription && !result}><RotateCcw size={14} /> 清空重填</button></div>
          <div className="input-grid">
            <div className="input-card">
              <div className="input-card-heading"><span className="step-icon"><FileText size={20} /></span><div><h3>你的简历</h3><p>上传一份文本型 PDF 文件</p></div><span className="required-tag">必填</span></div>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="visually-hidden" id="resume-upload" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void handleFile(file); }} disabled={isAnalyzing || isExtracting} />
              {!fileInfo ? (
                <div className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
                  <label htmlFor="resume-upload" className="upload-label">
                    <span className="upload-icon"><UploadCloud size={27} /></span>
                    <strong>点击上传，或拖拽简历到这里</strong>
                    <p>仅支持 PDF，最大 10 MB，最多 50 页</p>
                    <span className="choose-file">选择 PDF 文件 <ArrowUpRight size={14} /></span>
                  </label>
                </div>
              ) : (
                <div className={`file-preview ${status === "error" ? "has-error" : ""}`}>
                  <div className="file-preview-top"><span className="pdf-icon">PDF</span><div className="file-name"><strong>{fileInfo.name}</strong><p>{formatFileSize(fileInfo.size)}{fileInfo.pages ? ` · ${fileInfo.pages} 页` : ""}{fileInfo.characters ? ` · ${fileInfo.characters.toLocaleString()} 字符` : ""}</p></div>{!isExtracting && !isAnalyzing && <button type="button" onClick={removeResume} aria-label="移除简历"><X size={18} /></button>}</div>
                  {isExtracting ? <div className="extraction-progress"><RefreshCw size={16} className="spin" /><span>正在本地提取简历文字…</span></div> : resumeText ? <div className="extraction-success"><CheckCircle2 size={16} /><span>文字提取完成，可以开始分析</span><label htmlFor="resume-upload">更换</label></div> : null}
                </div>
              )}
              {resumeText && <details className="text-preview"><summary>查看提取的文字 <ChevronRight size={14} /></summary><pre>{resumeText}</pre></details>}
              <div className="local-note"><LockKeyhole size={13} /> {"PDF 仅在浏览器中解析，不保存原文件"}</div>
            </div>

            <div className="input-card jd-card">
              <div className="input-card-heading"><span className="step-icon"><BriefcaseBusiness size={20} /></span><div><h3>目标岗位描述</h3><p>粘贴完整 JD，分析会更准确</p></div><span className="required-tag">必填</span></div>
              <div className="textarea-wrap">
                <textarea value={jobDescription} maxLength={20_000} disabled={isAnalyzing} onChange={(event) => { setJobDescription(event.target.value); jobPostIdRef.current = null; if (result) setInputChanged(true); }} placeholder={"例如：\n\n岗位职责：\n1. 负责产品需求分析与功能规划…\n2. 协同设计和研发团队推进项目…\n\n任职要求：\n1. 3 年以上相关经验…"} aria-label="目标岗位描述" />
                {jobDescription && !isAnalyzing && <button type="button" className="clear-textarea" onClick={() => { setJobDescription(""); jobPostIdRef.current = null; if (result) setInputChanged(true); }} aria-label="清空岗位描述"><X size={15} /></button>}
                <div className="character-count"><span>{jobDescription.trim().length > 0 && jobDescription.trim().length < 20 ? "至少输入 20 个字符" : "支持粘贴完整岗位职责与任职要求"}</span><span className={jobDescription.length > 19_000 ? "near-limit" : ""}>{jobDescription.length.toLocaleString()} / 20,000</span></div>
              </div>
              <div className="jd-tip"><Sparkles size={14} /><span>小提示：包含岗位职责、任职要求和技能关键词的完整 JD，能带来更有针对性的建议。</span></div>
            </div>
          </div>

          {error && <div className="error-banner" role="alert"><CircleAlert size={19} /><div><strong>这次没有顺利完成</strong><p>{error}</p></div>{resumeText && jobDescription.trim().length >= 20 && !isAnalyzing && <button type="button" onClick={() => void analyze()}>重试 <RefreshCw size={14} /></button>}</div>}
          {inputChanged && result && <div className="changed-banner"><CircleAlert size={16} />岗位描述已变更，当前结果仍基于上一次输入。</div>}

          {initialUser && <label className="save-history-toggle"><input type="checkbox" checked={saveHistory} disabled={isAnalyzing} onChange={(event) => setSaveHistory(event.target.checked)} /><span><strong>保存本次分析到历史</strong><small>{saveHistory ? "不保存原 PDF，只保存解析文字、JD 和报告，仅当前账户可见。" : "本次不保存历史，也不写入数据库。"}</small></span></label>}
          <div className="analyze-row">
            <div className="analyze-privacy"><ShieldCheck size={17} /><p>点击分析即表示你同意将<strong>提取的简历文字和 JD</strong>发送至本站服务器及 DeepSeek 进行处理。{initialUser && saveHistory ? "仅保存解析文字与报告，不上传原 PDF。" : "本次不保存历史。"}</p></div>
            <button type="button" className="analyze-button" disabled={!canAnalyze} onClick={() => void analyze()}>{isAnalyzing ? <><RefreshCw size={18} className="spin" /> 正在生成求职策略…</> : <><Sparkles size={18} /> 开始 AI 分析 <ArrowRight size={18} /></>}</button>
          </div>
        </section>

        {isAnalyzing && <section className="analysis-loading" aria-live="polite"><div className="loading-visual"><div className="loading-rings"><Sparkles size={29} /></div></div><span className="section-eyebrow">AI IS WORKING</span><h2>正在把你的经历，转化为求职竞争力</h2><p>通常需要一些时间，请不要关闭页面。</p><div className="loading-steps"><span className="done"><CheckCircle2 size={17} /> 简历文字已提取</span><span className="active"><RefreshCw size={17} className="spin" /> 正在对照岗位深度分析</span><span><span className="empty-dot" /> 整理四类求职材料</span></div></section>}

        {savedAnalysisId && <div className="saved-banner"><CheckCircle2 size={16} /><span>报告已保存到你的历史记录。</span><a href={`/history/${savedAnalysisId}`}>查看已保存报告 <ArrowUpRight size={14} /></a></div>}
        {saveWarning && <div className="changed-banner"><CircleAlert size={16} />{saveWarning}</div>}
        {result && !isAnalyzing && <Results result={result} />}

        {!result && !isAnalyzing && <section className="empty-results"><div className="empty-heading"><span className="section-number">02 / 获取结果</span><h2>一次分析，做好四重准备</h2><p>完成上方信息，AI 将在这里为你生成专属求职策略。</p></div><div className="benefit-grid"><article><span><Target size={21} /></span><div><small>01</small><h3>岗位匹配度分析</h3><p>看清优势与差距，不再盲目投递。</p></div></article><article><span><FileCheck2 size={21} /></span><div><small>02</small><h3>简历优化建议</h3><p>围绕 JD 提供具体、可执行的修改方向。</p></div></article><article><span><FileText size={21} /></span><div><small>03</small><h3>一封专属求职信</h3><p>让你的真实经历与岗位需求产生连接。</p></div></article><article><span><Sparkles size={21} /></span><div><small>04</small><h3>10 组面试问答</h3><p>提前演练可能的问题，表达更从容。</p></div></article></div></section>}
      </main>

      <footer className="site-footer" id="privacy"><div className="footer-brand"><span className="brand-mark"><BriefcaseBusiness size={18} /></span><strong>职达 AI</strong><span>让每一次投递更有准备。</span></div><div className="footer-privacy"><ShieldCheck size={15} /><span>{initialUser ? "保存由你控制 · RLS 数据隔离 · 可随时删除历史" : "游客模式不保存历史 · 不记录简历正文 · 刷新页面后结果清除"}</span></div><a href="#top">回到顶部 <ArrowDown size={14} /></a></footer>
    </div>
  );
}






