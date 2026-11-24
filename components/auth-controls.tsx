"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, History, Home, LogOut, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentUser } from "@/lib/supabase/server";

export function AuthControls({ user }: { user: CurrentUser | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (user) {
    return <><nav className="header-nav" aria-label="页面导航"><Link href="/"><Home size={14} /> 首页</Link><Link href="/pages"><Globe size={14} /> 在线简历页</Link><Link href="/history"><History size={14} /> 历史报告</Link><a href="#privacy">隐私说明</a></nav><div className="user-controls"><span className="user-email" title={user.email}>{user.email || "我的账户"}</span><button type="button" onClick={signOut} title="退出登录"><LogOut size={15} /><span>退出</span></button></div></>;
  }

  return <><nav className="header-nav" aria-label="页面导航"><Link href="/"><Home size={14} /> 首页</Link><Link href="/pages/new"><Globe size={14} /> 在线简历页</Link><a href="#workflow">使用流程</a><a href="#privacy">隐私说明</a></nav><Link href="/login" className="header-cta">登录 / 保存历史 <ArrowUpRight size={16} /></Link></>;
}
