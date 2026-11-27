"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Database,
  FileText,
  Globe,
  History,
  Home,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentUser } from "@/lib/supabase/server";

type InfoType = "workflow" | "privacy";

const infoContent = {
  workflow: {
    eyebrow: "HOW IT WORKS",
    title: "三步，开启你的求职策略",
    description: "从真实经历出发，为目标岗位做好充分准备。",
    icon: Sparkles,
  },
  privacy: {
    eyebrow: "PRIVACY FIRST",
    title: "你的信息，由你掌控",
    description: "清晰说明数据如何被使用，让每一次分析都更安心。",
    icon: ShieldCheck,
  },
} as const;

function InfoDialog({ type, onClose }: { type: InfoType; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const acknowledgeRef = useRef<HTMLButtonElement>(null);
  const content = infoContent[type];
  const Icon = content.icon;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Lock scrolling without letting the disappearing scrollbar resize the page.
    if (scrollbarWidth > 0) {
      const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    acknowledgeRef.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="info-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className={`info-dialog info-dialog-${type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`info-dialog-title-${type}`}
        aria-describedby={`info-dialog-description-${type}`}
      >
        <div className="info-dialog-glow" aria-hidden="true" />
        <button type="button" className="info-dialog-close" onClick={onClose} aria-label="关闭说明卡片"><X size={17} /></button>
        <div className="info-dialog-heading">
          <span className="info-dialog-icon"><Icon size={23} strokeWidth={1.8} /></span>
          <div>
            <span className="info-dialog-eyebrow">{content.eyebrow}</span>
            <h2 id={`info-dialog-title-${type}`}>{content.title}</h2>
          </div>
        </div>
        <p className="info-dialog-description" id={`info-dialog-description-${type}`}>{content.description}</p>

        {type === "workflow" ? (
          <ol className="workflow-dialog-steps">
            <li><span className="workflow-dialog-number">01</span><span className="workflow-dialog-step-icon"><FileText size={18} /></span><div><strong>上传 PDF 简历</strong><p>浏览器本地提取文字，原文件不上传。</p></div></li>
            <li><span className="workflow-dialog-number">02</span><span className="workflow-dialog-step-icon"><BriefcaseBusiness size={18} /></span><div><strong>粘贴目标岗位</strong><p>提供完整的简历描述，让建议更贴合你的求职目标。</p></div></li>
            <li><span className="workflow-dialog-number">03</span><span className="workflow-dialog-step-icon"><Sparkles size={18} /></span><div><strong>获取专属求职策略</strong><p>一次生成匹配分析、优化建议、求职信和面试问答。</p></div></li>
          </ol>
        ) : (
          <div className="privacy-dialog-list">
            <div><span><LockKeyhole size={18} /></span><div><strong>原文件留在本地</strong><p>PDF 仅在浏览器中解析，不上传原文件。</p></div></div>
            <div><span><ShieldCheck size={18} /></span><div><strong>处理范围清晰透明</strong><p>点击分析后，你填写的简历描述及提取的简历文字将发送至本站服务器及 DeepSeek 进行处理。</p></div></div>
            <div><span><Database size={18} /></span><div><strong>保存与否由你决定</strong><p>游客模式不保存历史；登录后可自行选择保存，并可随时删除已保存的数据。</p></div></div>
          </div>
        )}

        <button ref={acknowledgeRef} type="button" className="info-dialog-acknowledge" onClick={onClose}><Check size={16} />我已知晓</button>
        <p className="info-dialog-footnote">职达 AI · 让每一次投递更有准备</p>
      </div>
    </div>
  );
}

export function AuthControls({ user }: { user: CurrentUser | null }) {
  const router = useRouter();
  const [activeInfo, setActiveInfo] = useState<InfoType | null>(null);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <nav className="header-nav" aria-label="页面导航">
        <Link href="/"><Home size={14} />首页</Link>
        <Link href={user ? "/pages" : "/pages/new"}><Globe size={14} />在线简历页</Link>
        {user && <Link href="/history"><History size={14} />历史报告</Link>}
        <button type="button" className="header-info-trigger" onClick={() => setActiveInfo("workflow")}>使用流程</button>
        <button type="button" className="header-info-trigger" onClick={() => setActiveInfo("privacy")}>隐私说明</button>
      </nav>
      {user ? (
        <div className="user-controls">
          <span className="user-email" title={user.email}>{user.email || "我的账户"}</span>
          <button type="button" onClick={signOut} title="退出登录"><LogOut size={15} /><span>退出</span></button>
        </div>
      ) : (
        <Link href="/login" className="header-cta"><span className="header-cta-full">登录 / 保存历史</span><span className="header-cta-short">登录</span><ArrowUpRight size={16} /></Link>
      )}
      {activeInfo && <InfoDialog type={activeInfo} onClose={() => setActiveInfo(null)} />}
    </>
  );
}
