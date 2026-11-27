"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, CheckCircle2, ChevronDown, CircleAlert, Copy, Eye,
  Globe, Home, LoaderCircle, PencilLine, Plus, RefreshCw, Rocket, Trash2, Undo2, X,
} from "lucide-react";
import { ResumePageView } from "@/components/resume-page/page-view";
import {
  isValidSlug, PAGE_THEME_META, PAGE_THEMES,
  type PageContent, type PageSectionKey, type PageTheme,
} from "@/lib/page-schema";
import { clearLocalDraft, saveLocalDraft } from "@/lib/page-draft";
import { DegreeField, ExperienceField, LocationField, PeriodField, SkillCategoryField } from "./editor-fields";

export type EditorInitial = {
  id: string | null;
  title: string;
  slug: string;
  theme: PageTheme;
  status: "draft" | "published";
  content: PageContent;
  source?: { resumeVersionId?: string; analysisRunId?: string };
};

type SaveState = "saved" | "saving" | "error" | "local";

const SECTION_NAV = [
  ["profile", "个人定位"], ["highlights", "核心优势"], ["about", "关于我"],
  ["projects", "项目经历"], ["skills", "技能"], ["experience", "工作经历"],
  ["education", "教育背景"], ["contacts", "联系方式"], ["cta", "行动按钮"],
] as const;

/* ---------- small form primitives ---------- */

function FormLabel({ label }: { label: string }) {
  const optional = label.includes("（可选");
  const cleanLabel = label.replace(/（可选）/g, "").replace(/（可选，([^）]+)）/g, "（$1）");
  return <span className="ed-field-label"><span>{cleanLabel}</span>{optional && <small>可选</small>}</span>;
}

function useAutoGrow(value: string, rows: number) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const minHeight = Math.max(80, rows * 24 + 18);
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, minHeight), 240)}px`;
  }, [value, rows]);
  return ref;
}

function Field({ label, value, onChange, maxLength, placeholder, type = "text" }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number; placeholder?: string; type?: string;
}) {
  return <label className="ed-field"><FormLabel label={label} /><input type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{maxLength && <small className="ed-char-count">{value.length}/{maxLength}</small>}</label>;
}

function Area({ label, value, onChange, maxLength, rows = 3, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number; rows?: number; placeholder?: string;
}) {
  const ref = useAutoGrow(value, rows);
  return <label className="ed-field"><FormLabel label={label} /><textarea ref={ref} value={value} maxLength={maxLength} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{maxLength && <small className="ed-char-count">{value.length}/{maxLength}</small>}</label>;
}

// Raw text stays local while typing; commit parsed tokens on blur so separators
// are not swallowed mid-input. External value changes re-sync via the guarded
// render-time adjustment pattern.
function TokensInput({ label, value, onCommit, placeholder }: {
  label: string; value: string[]; onCommit: (items: string[]) => void; placeholder?: string;
}) {
  const [raw, setRaw] = useState(value.join("、"));
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) { setPrevValue(value); setRaw(value.join("、")); }
  return (
    <label className="ed-field"><FormLabel label={label} />
      <input value={raw} placeholder={placeholder || "用顿号或逗号分隔"} onChange={(event) => setRaw(event.target.value)}
        onBlur={() => onCommit(raw.split(/[,，、;；\n]+/).map((item) => item.trim()).filter(Boolean).slice(0, 12))} />
    </label>
  );
}

function LinesInput({ label, value, onCommit, max, placeholder }: {
  label: string; value: string[]; onCommit: (items: string[]) => void; max: number; placeholder?: string;
}) {
  const [raw, setRaw] = useState(value.join("\n"));
  const [prevValue, setPrevValue] = useState(value);
  const ref = useAutoGrow(raw, 3);
  if (prevValue !== value) { setPrevValue(value); setRaw(value.join("\n")); }
  return (
    <label className="ed-field"><FormLabel label={label} />
      <textarea ref={ref} value={raw} rows={3} placeholder={placeholder || "每行一条"} onChange={(event) => setRaw(event.target.value)}
        onBlur={() => onCommit(raw.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, max))} />
      <small className="ed-char-count">{raw.split("\n").map((item) => item.trim()).filter(Boolean).length}/{max} 条</small>
    </label>
  );
}

function ItemControls({ index, count, onMove, onRemove }: {
  index: number; count: number; onMove: (dir: -1 | 1) => void; onRemove: () => void;
}) {
  return (
    <span className="ed-item-controls">
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)} title="上移">↑</button>
      <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} title="下移">↓</button>
      <button type="button" onClick={onRemove} title="删除这条"><Trash2 size={13} /></button>
    </span>
  );
}

function ItemCard({ title, subtitle, open, onToggle, children, controls }: {
  title: string; subtitle?: string; open: boolean; onToggle: () => void;
  children: React.ReactNode; controls: React.ReactNode;
}) {
  return <div className={`ed-item ${open ? "is-open" : ""}`}>
    <div className="ed-item-head">
      <button type="button" className="ed-item-toggle" aria-expanded={open} onClick={onToggle}>
        <ChevronDown size={14} className="ed-item-chevron" />
        <span><strong>{title || "未命名"}</strong>{subtitle && <small>{subtitle}</small>}</span>
      </button>
      {controls}
    </div>
    {open && <div className="ed-item-content">{children}</div>}
  </div>;
}

function Section({ id, sectionKey, title, count, visible, onVisibleChange, open, onToggle, children }: {
  id: string; sectionKey?: PageSectionKey; title: string; count?: number; visible?: boolean;
  onVisibleChange?: (visible: boolean) => void; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <details id={`ed-section-${id}`} className="ed-section" open={open}>
      <summary onClick={(event) => { event.preventDefault(); onToggle(); }}>
        <ChevronDown size={15} className="ed-section-chevron" />
        <strong>{title}</strong>
        {typeof count === "number" && <span className="ed-section-count">{count}</span>}
        {sectionKey && onVisibleChange && (
          <label className="ed-visibility" onClick={(event) => event.stopPropagation()}>
            <input type="checkbox" checked={visible} onChange={(event) => onVisibleChange(event.target.checked)} />
            <span>{visible ? "显示" : "隐藏"}</span>
          </label>
        )}
      </summary>
      {open && <div className="ed-section-body">{children}</div>}
    </details>
  );
}

function move<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const next = [...items];
  const target = index + dir;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/* ---------- editor ---------- */

export function PageEditor({ initial, isLoggedIn, autoOpenPublish = false }: { initial: EditorInitial; isLoggedIn: boolean; autoOpenPublish?: boolean }) {
  const router = useRouter();
  const isLocal = initial.id === null;
  const [content, setContent] = useState<PageContent>(initial.content);
  const [theme, setTheme] = useState<PageTheme>(initial.theme);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugDraft, setSlugDraft] = useState(initial.slug);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "saving">("idle");
  const [status, setStatus] = useState(initial.status);
  const [saveState, setSaveState] = useState<SaveState>(isLocal ? "local" : "saved");
  const [saveError, setSaveError] = useState("");
  const [banner, setBanner] = useState("");
  const [publishOpen, setPublishOpen] = useState(autoOpenPublish);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [openSection, setOpenSection] = useState<string | null>("profile");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const skipFirstSave = useRef(true);
  const saveSeq = useRef(0);

  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const publicUrl = `${origin}/u/${slug}`;

  const persistLocal = useCallback((nextContent: PageContent, nextTheme: PageTheme, nextTitle: string, nextSlug: string) => {
    const ok = saveLocalDraft({ content: nextContent, theme: nextTheme, title: nextTitle, slug: nextSlug, source: initial.source });
    setSaveState("local");
    setSaveError(ok ? "" : "当前浏览器无法保存本地草稿，建议登录后云端保存。");
    return ok;
  }, [initial.source]);

  const saveServer = useCallback(async (nextContent: PageContent, nextTheme: PageTheme, nextTitle: string) => {
    const seq = ++saveSeq.current;
    setSaveState("saving");
    setSaveError("");
    try {
      const response = await fetch(`/api/pages/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent, theme: nextTheme, title: nextTitle.trim() || "我的在线简历页" }),
      });
      const payload = await response.json() as { success: boolean; error?: { message?: string } };
      if (seq !== saveSeq.current) return;
      if (!response.ok || !payload.success) {
        setSaveState("error");
        setSaveError(payload.error?.message || "保存失败，请重试。");
        return;
      }
      setSaveState("saved");
    } catch {
      if (seq !== saveSeq.current) return;
      setSaveState("error");
      setSaveError("网络异常，修改暂存于本页，请重试保存。");
    }
  }, [initial.id]);

  // Debounced autosave: server rows PATCH after 2s idle; guest drafts write localStorage immediately.
  useEffect(() => {
    if (skipFirstSave.current) { skipFirstSave.current = false; return; }
    if (isLocal) {
      const timer = window.setTimeout(() => persistLocal(content, theme, title, slug), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => void saveServer(content, theme, title), 2_000);
    return () => window.clearTimeout(timer);
  }, [content, theme, title, slug, isLocal, persistLocal, saveServer]);

  // Warn before leaving with an unsaved guest draft.
  useEffect(() => {
    if (!isLocal) return;
    function onBeforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isLocal]);

  function mutate(next: PageContent) { setContent(next); }
  function setProfile(patch: Partial<PageContent["profile"]>) { mutate({ ...content, profile: { ...content.profile, ...patch } }); }
  function setContacts(patch: Partial<PageContent["contacts"]>) { mutate({ ...content, contacts: { ...content.contacts, ...patch } }); }
  function setCta(patch: Partial<PageContent["cta"]>) { mutate({ ...content, cta: { ...content.cta, ...patch } }); }
  function setSectionVisible(key: PageSectionKey, visible: boolean) {
    mutate({ ...content, settings: { sections: { ...content.settings.sections, [key]: visible } } });
  }
  function selectSection(id: string | null) {
    setOpenSection(id);
    setOpenItem(null);
  }
  function toggleSection(id: string) {
    selectSection(openSection === id ? null : id);
  }
  function jumpToSection(id: string) {
    selectSection(id);
    window.setTimeout(() => {
      const element = document.getElementById(`ed-section-${id}`);
      if (!element) return;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      if (window.innerWidth <= 860) {
        const topbarHeight = document.querySelector(".editor-topbar")?.getBoundingClientRect().height || 0;
        const top = element.getBoundingClientRect().top + window.scrollY - topbarHeight - 12;
        window.scrollTo({ top, behavior });
      } else {
        element.scrollIntoView({ block: "start", behavior });
      }
    }, 0);
  }
  function toggleItem(key: string) {
    setOpenItem(openItem === key ? null : key);
  }

  async function applySlug() {
    const next = slugDraft.trim().toLowerCase();
    if (!isValidSlug(next)) { setSlugState("invalid"); return; }
    if (next === slug) { setSlugState("idle"); return; }
    if (isLocal) { setSlug(next); setSlugState("idle"); return; }
    setSlugState("checking");
    try {
      const check = await fetch(`/api/pages/slug-check?slug=${encodeURIComponent(next)}&excludeId=${initial.id}`);
      const checkPayload = await check.json() as { success: boolean; data?: { available: boolean } };
      if (check.ok && checkPayload.success && !checkPayload.data?.available) { setSlugState("taken"); return; }
      setSlugState("saving");
      const response = await fetch(`/api/pages/${initial.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: next }),
      });
      const payload = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok || !payload.success) {
        setSlugState(response.status === 409 ? "taken" : "invalid");
        setBanner(payload.error?.message || "链接保存失败，请重试。");
        return;
      }
      setSlug(next);
      setSlugState("idle");
      if (status === "published") setBanner("链接已更新，旧链接已失效，请重新分享新链接。");
    } catch {
      setSlugState("idle");
      setBanner("网络异常，链接未保存，请重试。");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setBanner(`复制失败，请手动复制：${publicUrl}`);
    }
  }

  function startPublish() {
    setPublishError("");
    if (isLocal && !isLoggedIn) {
      // Single login handoff: draft survives in localStorage and is restored on /pages/draft.
      const ok = persistLocal(content, theme, title, slug);
      if (!ok) {
        setBanner("当前浏览器无法保存本地草稿，登录后内容将无法恢复。请允许本地存储或更换浏览器后再发布。");
        return;
      }
      router.push("/login?next=/pages/draft");
      return;
    }
    setPublishOpen(true);
  }

  async function confirmPublish() {
    if (isLocal) {
      // Logged-in user editing a local draft: create the server row first.
      setPublishBusy(true);
      try {
        const created = await fetch("/api/pages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, theme, title: title.trim() || undefined, slug, sourceResumeVersionId: initial.source?.resumeVersionId, sourceAnalysisRunId: initial.source?.analysisRunId }),
        });
        const payload = await created.json() as { success: boolean; data?: { id: string }; error?: { message?: string } };
        if (!created.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "草稿保存失败，请重试。");
        clearLocalDraft();
        router.replace(`/pages/${payload.data.id}/edit?publish=1`);
      } catch (caught) {
        setPublishError(caught instanceof Error ? caught.message : "草稿保存失败，请重试。");
        setPublishBusy(false);
      }
      return;
    }
    setPublishBusy(true);
    setPublishError("");
    try {
      // Flush pending edits before publishing so the public page matches the preview.
      await saveServer(content, theme, title);
      const response = await fetch(`/api/pages/${initial.id}/publish`, { method: "POST" });
      const payload = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "发布失败，请重试。");
      setStatus("published");
      setPublishOpen(false);
      setBanner("发布成功！公开链接已生效，无需登录即可访问。");
    } catch (caught) {
      setPublishError(caught instanceof Error ? caught.message : "发布失败，请重试。");
    } finally {
      setPublishBusy(false);
    }
  }

  async function unpublish() {
    if (!window.confirm("确定撤回发布吗？公开链接将立即失效。")) return;
    const response = await fetch(`/api/pages/${initial.id}/unpublish`, { method: "POST" });
    const payload = await response.json() as { success: boolean; error?: { message?: string } };
    if (!response.ok || !payload.success) { setBanner(payload.error?.message || "撤回失败，请重试。"); return; }
    setStatus("draft");
    setBanner("已撤回发布，公开链接已失效。");
  }

  const contactPreview = [
    content.contacts.email && `邮箱：${content.contacts.email}`,
    content.contacts.phone && `电话：${content.contacts.phone}`,
    content.contacts.wechat && `微信：${content.contacts.wechat}`,
    content.contacts.github && `GitHub：${content.contacts.github}`,
    content.contacts.website && `网站：${content.contacts.website}`,
  ].filter(Boolean) as string[];

  return (
    <div className="editor-shell">
      <div className="editor-topbar">
        <div className="editor-topbar-row">
          <Link href={isLoggedIn ? "/pages" : "/"} className="editor-back"><ArrowLeft size={15} /> {isLoggedIn ? "我的简历页" : "首页"}</Link>
          {isLoggedIn && <Link href="/" className="editor-back" aria-label="返回首页" title="返回首页"><Home size={15} /></Link>}
          <input className="editor-title-input" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} aria-label="页面管理名称" />
          <span className={`editor-save-state is-${saveState}`}>
            {saveState === "saving" && <><LoaderCircle size={13} className="spin" /> 保存中</>}
            {saveState === "saved" && <><CheckCircle2 size={13} /> 已保存</>}
            {saveState === "error" && <><CircleAlert size={13} /> 保存失败</>}
            {saveState === "local" && <><PencilLine size={13} /> 本地草稿</>}
          </span>
          <div className="editor-actions">
            {status === "published" && !isLocal && <>
              <button type="button" className="editor-button ghost" onClick={copyLink}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "已复制" : "复制链接"}</button>
              <a className="editor-button ghost" href={`/u/${slug}`} target="_blank" rel="noopener noreferrer"><Eye size={14} /> 查看</a>
              <button type="button" className="editor-button ghost" onClick={unpublish}><Undo2 size={14} /> 撤回</button>
            </>}
            <button type="button" className="editor-button primary" onClick={startPublish}>
              <Rocket size={14} /> {status === "published" ? "已发布" : isLocal && !isLoggedIn ? "发布（需登录）" : "发布上线"}
            </button>
          </div>
        </div>
        <div className="editor-topbar-row secondary">
          <div className="editor-themes" role="radiogroup" aria-label="主题">
            {PAGE_THEMES.map((key) => (
              <button key={key} type="button" role="radio" aria-checked={theme === key}
                className={`editor-theme-card ${theme === key ? "active" : ""}`}
                onClick={() => setTheme(key)} title={PAGE_THEME_META[key].description}>
                <span className={`theme-swatch swatch-${key}`} />
                {PAGE_THEME_META[key].name}
              </button>
            ))}
          </div>
          <div className="editor-slug">
            <span className="editor-slug-prefix">/u/</span>
            <input value={slugDraft} maxLength={30} onChange={(event) => { setSlugDraft(event.target.value.toLowerCase()); setSlugState("idle"); }} aria-label="公开链接" />
            <button type="button" className="editor-button ghost" onClick={applySlug} disabled={slugState === "checking" || slugState === "saving" || slugDraft === slug}>
              {slugState === "checking" || slugState === "saving" ? <LoaderCircle size={13} className="spin" /> : <Check size={13} />} 应用
            </button>
            {slugState === "invalid" && <span className="editor-slug-hint error">3—30 位小写字母/数字/连字符，避开保留字</span>}
            {slugState === "taken" && <span className="editor-slug-hint error">该链接已被使用</span>}
            {status === "published" && slugDraft !== slug && <span className="editor-slug-hint">修改后旧链接将失效</span>}
          </div>
        </div>
        {(banner || saveError) && (
          <div className="editor-banner" role="status">
            <CircleAlert size={14} /> <span>{saveError || banner}</span>
            {saveState === "error" && <button type="button" onClick={() => void saveServer(content, theme, title)}><RefreshCw size={12} /> 重试保存</button>}
            <button type="button" className="editor-banner-close" onClick={() => { setBanner(""); setSaveError(""); if (saveState === "error") setSaveState("saved"); }} aria-label="关闭提示"><X size={13} /></button>
          </div>
        )}
        <div className="editor-mobile-tabs">
          <button type="button" className={mobileTab === "edit" ? "active" : ""} onClick={() => setMobileTab("edit")}><PencilLine size={14} /> 编辑</button>
          <button type="button" className={mobileTab === "preview" ? "active" : ""} onClick={() => setMobileTab("preview")}><Eye size={14} /> 预览</button>
        </div>
      </div>

      <div className={`editor-body show-${mobileTab}`}>
        <div className="editor-form">
          {isLocal && <p className="editor-local-note"><CircleAlert size={13} /> 草稿仅保存在当前浏览器，登录后可云端保存并发布。</p>}
          <div className="ed-form-toolbar">
            <select aria-label="快速跳转分区" value={openSection || ""} onChange={(event) => jumpToSection(event.target.value)}>
              <option value="" disabled>快速跳转分区</option>
              {SECTION_NAV.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <button type="button" disabled={!openSection} onClick={() => selectSection(null)}>全部收起</button>
          </div>

          <Section id="profile" title="个人定位" open={openSection === "profile"} onToggle={() => toggleSection("profile")}>
            <Field label="姓名" value={content.profile.name} maxLength={60} onChange={(value) => setProfile({ name: value })} />
            <Field label="一句话定位" value={content.profile.headline} maxLength={80} placeholder="如：5 年经验的 B 端产品经理" onChange={(value) => setProfile({ headline: value })} />
            <Area label="价值主张（2—3 句）" value={content.profile.tagline} maxLength={400} onChange={(value) => setProfile({ tagline: value })} />
            <div className="ed-field-row ed-profile-meta-row">
              <LocationField value={content.profile.location || ""} onChange={(value) => setProfile({ location: value || undefined })} />
              <ExperienceField value={content.profile.yearsLabel || ""} onChange={(value) => setProfile({ yearsLabel: value || undefined })} />
            </div>
          </Section>

          <Section id="highlights" title="核心优势" count={content.highlights.length} sectionKey="highlights" visible={content.settings.sections.highlights} onVisibleChange={(v) => setSectionVisible("highlights", v)} open={openSection === "highlights"} onToggle={() => toggleSection("highlights")}>
            {content.highlights.map((item, index) => (
              <ItemCard key={index} title={item.title} open={openItem === `highlights:${index}`} onToggle={() => toggleItem(`highlights:${index}`)} controls={<ItemControls index={index} count={content.highlights.length}
                onMove={(dir) => { setOpenItem(null); mutate({ ...content, highlights: move(content.highlights, index, dir) }); }}
                onRemove={() => { setOpenItem(null); mutate({ ...content, highlights: content.highlights.filter((_, i) => i !== index) }); }} />}>
                <Field label="优势标题" value={item.title} maxLength={40} onChange={(value) => mutate({ ...content, highlights: content.highlights.map((it, i) => i === index ? { ...it, title: value } : it) })} />
                <Area label="真实依据" value={item.description} maxLength={300} rows={2} onChange={(value) => mutate({ ...content, highlights: content.highlights.map((it, i) => i === index ? { ...it, description: value } : it) })} />
              </ItemCard>
            ))}
            <button type="button" className="ed-add" disabled={content.highlights.length >= 5} onClick={() => { const nextIndex = content.highlights.length; setOpenItem(`highlights:${nextIndex}`); mutate({ ...content, highlights: [...content.highlights, { title: "新优势", description: "补充真实依据" }] }); }}><Plus size={13} /> 添加优势（最多 5 条）</button>
          </Section>

          <Section id="about" title="关于我" sectionKey="about" visible={content.settings.sections.about} onVisibleChange={(v) => setSectionVisible("about", v)} open={openSection === "about"} onToggle={() => toggleSection("about")}>
            <Area label="职业画像" value={content.about} maxLength={2000} rows={5} onChange={(value) => mutate({ ...content, about: value })} />
          </Section>

          <Section id="projects" title="项目经历" count={content.projects.length} sectionKey="projects" visible={content.settings.sections.projects} onVisibleChange={(v) => setSectionVisible("projects", v)} open={openSection === "projects"} onToggle={() => toggleSection("projects")}>
            {content.projects.map((project, index) => (
              <ItemCard key={index} title={project.name} subtitle={project.period} open={openItem === `projects:${index}`} onToggle={() => toggleItem(`projects:${index}`)} controls={<ItemControls index={index} count={content.projects.length}
                onMove={(dir) => { setOpenItem(null); mutate({ ...content, projects: move(content.projects, index, dir) }); }}
                onRemove={() => { setOpenItem(null); mutate({ ...content, projects: content.projects.filter((_, i) => i !== index) }); }} />}>
                <Field label="项目名" value={project.name} maxLength={80} onChange={(value) => mutate({ ...content, projects: content.projects.map((it, i) => i === index ? { ...it, name: value } : it) })} />
                <Field label="角色（可选）" value={project.role || ""} maxLength={60} onChange={(value) => mutate({ ...content, projects: content.projects.map((it, i) => i === index ? { ...it, role: value || undefined } : it) })} />
                <PeriodField value={project.period || ""} presentLabel="进行中" onChange={(value) => mutate({ ...content, projects: content.projects.map((it, i) => i === index ? { ...it, period: value || undefined } : it) })} />
                <Area label="项目概述" value={project.summary} maxLength={600} rows={2} onChange={(value) => mutate({ ...content, projects: content.projects.map((it, i) => i === index ? { ...it, summary: value } : it) })} />
                <LinesInput label="成果亮点（每行一条，最多 4 条）" value={project.achievements} max={4} onCommit={(items) => mutate({ ...content, projects: content.projects.map((it, i) => i === index ? { ...it, achievements: items } : it) })} />
                <TokensInput label="标签（顿号分隔，最多 6 个）" value={project.tags} onCommit={(items) => mutate({ ...content, projects: content.projects.map((it, i) => i === index ? { ...it, tags: items.slice(0, 6) } : it) })} />
                <Field label="链接（可选，http/https）" value={project.link || ""} maxLength={300} onChange={(value) => mutate({ ...content, projects: content.projects.map((it, i) => i === index ? { ...it, link: value || undefined } : it) })} />
              </ItemCard>
            ))}
            <button type="button" className="ed-add" disabled={content.projects.length >= 8} onClick={() => { const nextIndex = content.projects.length; setOpenItem(`projects:${nextIndex}`); mutate({ ...content, projects: [...content.projects, { name: "新项目", summary: "补充项目概述", achievements: [], tags: [] }] }); }}><Plus size={13} /> 添加项目（最多 8 个）</button>
          </Section>

          <Section id="skills" title="技能" count={content.skills.length} sectionKey="skills" visible={content.settings.sections.skills} onVisibleChange={(v) => setSectionVisible("skills", v)} open={openSection === "skills"} onToggle={() => toggleSection("skills")}>
            {content.skills.map((group, index) => (
              <ItemCard key={index} title={group.category} subtitle={`${group.items.length} 项技能`} open={openItem === `skills:${index}`} onToggle={() => toggleItem(`skills:${index}`)} controls={<ItemControls index={index} count={content.skills.length}
                onMove={(dir) => { setOpenItem(null); mutate({ ...content, skills: move(content.skills, index, dir) }); }}
                onRemove={() => { setOpenItem(null); mutate({ ...content, skills: content.skills.filter((_, i) => i !== index) }); }} />}>
                <SkillCategoryField value={group.category} onChange={(value) => mutate({ ...content, skills: content.skills.map((it, i) => i === index ? { ...it, category: value } : it) })} />
                <TokensInput label="技能项（顿号分隔）" value={group.items} onCommit={(items) => mutate({ ...content, skills: content.skills.map((it, i) => i === index ? { ...it, items: items.length ? items : ["待补充"] } : it) })} />
              </ItemCard>
            ))}
            <button type="button" className="ed-add" disabled={content.skills.length >= 6} onClick={() => { const nextIndex = content.skills.length; setOpenItem(`skills:${nextIndex}`); mutate({ ...content, skills: [...content.skills, { category: "新类别", items: ["新技能"] }] }); }}><Plus size={13} /> 添加分组（最多 6 组）</button>
          </Section>

          <Section id="experience" title="工作经历" count={content.experience.length} sectionKey="experience" visible={content.settings.sections.experience} onVisibleChange={(v) => setSectionVisible("experience", v)} open={openSection === "experience"} onToggle={() => toggleSection("experience")}>
            {content.experience.map((item, index) => (
              <ItemCard key={index} title={item.company} subtitle={[item.title, item.period].filter(Boolean).join(" · ")} open={openItem === `experience:${index}`} onToggle={() => toggleItem(`experience:${index}`)} controls={<ItemControls index={index} count={content.experience.length}
                onMove={(dir) => { setOpenItem(null); mutate({ ...content, experience: move(content.experience, index, dir) }); }}
                onRemove={() => { setOpenItem(null); mutate({ ...content, experience: content.experience.filter((_, i) => i !== index) }); }} />}>
                <div className="ed-field-row">
                  <Field label="公司" value={item.company} maxLength={80} onChange={(value) => mutate({ ...content, experience: content.experience.map((it, i) => i === index ? { ...it, company: value } : it) })} />
                  <Field label="职位" value={item.title} maxLength={60} onChange={(value) => mutate({ ...content, experience: content.experience.map((it, i) => i === index ? { ...it, title: value } : it) })} />
                </div>
                <PeriodField value={item.period || ""} onChange={(value) => mutate({ ...content, experience: content.experience.map((it, i) => i === index ? { ...it, period: value || undefined } : it) })} />
                <Area label="概述" value={item.summary} maxLength={600} rows={2} onChange={(value) => mutate({ ...content, experience: content.experience.map((it, i) => i === index ? { ...it, summary: value } : it) })} />
              </ItemCard>
            ))}
            <button type="button" className="ed-add" disabled={content.experience.length >= 8} onClick={() => { const nextIndex = content.experience.length; setOpenItem(`experience:${nextIndex}`); mutate({ ...content, experience: [...content.experience, { company: "公司名", title: "职位", summary: "" }] }); }}><Plus size={13} /> 添加经历</button>
          </Section>

          <Section id="education" title="教育背景" count={content.education.length} sectionKey="education" visible={content.settings.sections.education} onVisibleChange={(v) => setSectionVisible("education", v)} open={openSection === "education"} onToggle={() => toggleSection("education")}>
            {content.education.map((item, index) => (
              <ItemCard key={index} title={item.school} subtitle={[item.degree, item.period].filter(Boolean).join(" · ")} open={openItem === `education:${index}`} onToggle={() => toggleItem(`education:${index}`)} controls={<ItemControls index={index} count={content.education.length}
                onMove={(dir) => { setOpenItem(null); mutate({ ...content, education: move(content.education, index, dir) }); }}
                onRemove={() => { setOpenItem(null); mutate({ ...content, education: content.education.filter((_, i) => i !== index) }); }} />}>
                <Field label="学校" value={item.school} maxLength={80} onChange={(value) => mutate({ ...content, education: content.education.map((it, i) => i === index ? { ...it, school: value } : it) })} />
                <DegreeField value={item.degree || ""} onChange={(value) => mutate({ ...content, education: content.education.map((it, i) => i === index ? { ...it, degree: value || undefined } : it) })} />
                <PeriodField value={item.period || ""} onChange={(value) => mutate({ ...content, education: content.education.map((it, i) => i === index ? { ...it, period: value || undefined } : it) })} />
              </ItemCard>
            ))}
            <button type="button" className="ed-add" disabled={content.education.length >= 4} onClick={() => { const nextIndex = content.education.length; setOpenItem(`education:${nextIndex}`); mutate({ ...content, education: [...content.education, { school: "学校名" }] }); }}><Plus size={13} /> 添加教育经历</button>
          </Section>

          <Section id="contacts" title="联系方式" sectionKey="contacts" visible={content.settings.sections.contacts} onVisibleChange={(v) => setSectionVisible("contacts", v)} open={openSection === "contacts"} onToggle={() => toggleSection("contacts")}>
            <p className="ed-hint">只保留你愿意公开的联系方式，清空即不展示。发布前会再次确认。</p>
            <div className="ed-field-row">
              <Field label="邮箱（可选）" value={content.contacts.email || ""} maxLength={120} onChange={(value) => setContacts({ email: value || undefined })} />
              <Field label="电话（可选）" value={content.contacts.phone || ""} maxLength={40} onChange={(value) => setContacts({ phone: value || undefined })} />
            </div>
            <div className="ed-field-row">
              <Field label="微信（可选）" value={content.contacts.wechat || ""} maxLength={60} onChange={(value) => setContacts({ wechat: value || undefined })} />
              <Field label="GitHub（可选）" value={content.contacts.github || ""} maxLength={300} onChange={(value) => setContacts({ github: value || undefined })} />
            </div>
            <Field label="个人网站（可选）" value={content.contacts.website || ""} maxLength={300} onChange={(value) => setContacts({ website: value || undefined })} />
          </Section>

          <Section id="cta" title="行动按钮" open={openSection === "cta"} onToggle={() => toggleSection("cta")}>
            <Field label="按钮文案" value={content.cta.label} maxLength={30} onChange={(value) => setCta({ label: value })} />
            <label className="ed-field"><FormLabel label="按钮类型" />
              <select value={content.cta.type} onChange={(event) => setCta({ type: event.target.value as "email" | "link" })}>
                <option value="email">发送邮件</option>
                <option value="link">跳转链接</option>
              </select>
            </label>
            <Field label={content.cta.type === "email" ? "邮箱地址" : "链接（http/https）"} value={content.cta.value} maxLength={300} onChange={(value) => setCta({ value })} />
          </Section>
        </div>

        <div className="editor-preview" aria-label="实时预览">
          <ResumePageView content={content} theme={theme} />
        </div>
      </div>

      {publishOpen && (
        <div className="editor-modal-overlay" role="dialog" aria-modal="true" aria-label="发布确认">
          <div className="editor-modal">
            <h3><Globe size={17} /> 发布公开简历页</h3>
            <p>发布后，任何人都可以通过以下链接访问此页面，<strong>无需登录</strong>：</p>
            <code className="editor-modal-url">{publicUrl}</code>
            {contactPreview.length > 0 ? (
              <div className="editor-modal-contacts">
                <p>以下联系方式将对外公开：</p>
                <ul>{contactPreview.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </div>
            ) : <p className="editor-modal-note">当前未填写联系方式，页面只展示行动按钮。</p>}
            <p className="editor-modal-note">已发布页面的后续修改会立即生效；随时可以撤回。</p>
            {publishError && <p className="editor-modal-error" role="alert">{publishError}</p>}
            <div className="editor-modal-actions">
              <button type="button" className="editor-button ghost" onClick={() => setPublishOpen(false)} disabled={publishBusy}>再改改</button>
              <button type="button" className="editor-button primary" onClick={confirmPublish} disabled={publishBusy}>
                {publishBusy ? <LoaderCircle size={14} className="spin" /> : <Rocket size={14} />} 确认发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}