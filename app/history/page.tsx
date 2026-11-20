import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ClearHistoryButton } from "@/components/clear-history-button";
import { HistoryList, type HistoryItem } from "@/components/history-list";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" });

type JoinedRow = {
  id: string;
  status: "processing" | "succeeded" | "failed";
  match_score: number | null;
  created_at: string;
  job_posts: { job_title: string; company_name: string | null } | null;
  resume_versions: { version_no: number; resumes: { title: string } | null } | null;
};

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/history");
  const supabase = await createClient();
  const { data, error } = await supabase.from("analysis_runs").select("id,status,match_score,created_at,job_posts(job_title,company_name),resume_versions(version_no,resumes(title))").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("无法读取历史报告，请稍后重试。");

  const rows = (data || []) as unknown as JoinedRow[];
  const items: HistoryItem[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    matchScore: row.match_score,
    jobTitle: row.job_posts?.job_title || "目标岗位",
    companyName: row.job_posts?.company_name || null,
    resumeTitle: row.resume_versions?.resumes?.title || "我的简历",
    versionNo: row.resume_versions?.version_no || 1,
    createdAt: dateFormatter.format(new Date(row.created_at)),
  }));

  return <div className="site-shell history-page"><SiteHeader user={user} /><main className="history-main"><div className="history-heading"><div><span className="section-eyebrow">YOUR CAREER LIBRARY</span><h1>历史分析报告</h1><p>每一次针对性准备，都为下一次机会积累经验。</p></div><div className="history-heading-actions"><ClearHistoryButton disabled={!items.length} /><Link href="/" className="new-analysis-button"><Plus size={16} /> 新建分析</Link></div></div><HistoryList items={items} /></main></div>;
}

