"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, LoaderCircle, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ nextPath, verificationError }: { nextPath: string; verificationError: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(verificationError ? "验证链接无效或已过期，请重新登录。" : "");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        router.replace(nextPath);
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.replace(nextPath);
          router.refresh();
        } else {
          setMessage("验证邮件已发送。请前往邮箱完成验证，然后返回继续。");
        }
      }
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "操作失败，请稍后重试。";
      if (text.includes("Invalid login credentials")) setError("邮箱或密码不正确，请重试。");
      else if (text.includes("User already registered")) setError("该邮箱已注册，请直接登录。");
      else setError(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Link href="/" className="auth-back"><ArrowLeft size={16} /> 返回求职助手</Link>
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="brand"><span className="brand-mark"><BriefcaseBusiness size={21} /><span className="brand-spark"><Sparkles size={10} /></span></span><span className="brand-name">职达<span>AI</span></span></div>
          <span className="section-eyebrow">YOUR CAREER, YOUR DATA</span>
          <h1>保存每一次准备，<br />看见自己的进步。</h1>
          <p>登录后可保存简历版本、目标岗位和分析历史。游客模式仍然可以随时使用。</p>
          <div className="auth-benefits"><span><CheckCircle2 size={16} /> 简历文字私有保存，仅自己可见</span><span><CheckCircle2 size={16} /> 历史报告随时查看和复制</span><span><CheckCircle2 size={16} /> 你可以随时删除保存的记录</span></div>
        </section>
        <section className="auth-card">
          <div className="auth-tabs"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>登录</button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>注册</button></div>
          <h2>{mode === "signin" ? "欢迎回来" : "创建你的账户"}</h2>
          <p>{mode === "signin" ? "继续管理你的求职准备。" : "只需邮箱和密码，即可保存分析历史。"}</p>
          <form onSubmit={submit}>
            <label htmlFor="auth-email">邮箱地址</label>
            <div className="auth-input"><Mail size={17} /><input id="auth-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            <label htmlFor="auth-password">密码</label>
            <div className="auth-input"><LockKeyhole size={17} /><input id="auth-password" type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位字符" /></div>
            {error && <div className="auth-error" role="alert">{error}</div>}
            {message && <div className="auth-message" role="status">{message}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : null}{loading ? "请稍候…" : mode === "signin" ? "登录并继续" : "注册并继续"}</button>
          </form>
          <div className="auth-guest"><span>暂时不想注册？</span><Link href="/">继续使用游客模式</Link></div>
          <p className="auth-terms">继续即表示你同意服务条款与隐私政策。简历和分析仅在你的账户下保存。</p>
        </section>
      </div>
    </main>
  );
}

