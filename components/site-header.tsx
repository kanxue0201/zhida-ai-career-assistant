import Link from "next/link";
import { BriefcaseBusiness, Sparkles } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import type { CurrentUser } from "@/lib/supabase/server";

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return <header className="site-header"><Link className="brand" href="/" aria-label="职达 AI 首页"><span className="brand-mark"><BriefcaseBusiness size={21} strokeWidth={2.2} /><span className="brand-spark"><Sparkles size={10} /></span></span><span className="brand-name">职达<span>AI</span></span><span className="brand-divider" /><span className="brand-description">求职助手</span></Link><AuthControls user={user} /></header>;
}
