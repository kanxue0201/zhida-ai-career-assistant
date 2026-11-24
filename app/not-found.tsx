import Link from "next/link";
import { BriefcaseBusiness, Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="site-shell not-found-shell">
      <main className="not-found-main">
        <Link className="brand" href="/" aria-label="职达 AI 首页">
          <span className="brand-mark"><BriefcaseBusiness size={21} strokeWidth={2.2} /><span className="brand-spark"><Sparkles size={10} /></span></span>
          <span className="brand-name">职达<span>AI</span></span>
        </Link>
        <span className="not-found-code">404</span>
        <h1>这个页面不存在或已被撤回</h1>
        <p>链接可能输错了，或者这份在线简历页已被作者撤回。</p>
        <Link href="/" className="new-analysis-button"><Home size={15} /> 返回首页</Link>
      </main>
    </div>
  );
}