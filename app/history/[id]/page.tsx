import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, FileText, Globe } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Results } from "@/components/results";
import { DeleteAnalysisButton } from "@/components/delete-analysis-button";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { analysisSchema } from "@/lib/analysis-schema";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Shanghai" });

type DetailRow = {
  id: string;
  status: "processing" | "succeeded" | "failed";
  error_code: string | null;
  result_json: unknown;
  created_at: string;
  resume_version_id: string;
  job_posts: { job_title: string; company_name: string | null; description: string } | null;
  resume_versions: { version_no: number; resumes: { title: string } | null } | null;
};

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/history/${id}`);
  const supabase = await createClient();
  const { data, error } = await supabase.from("analysis_runs").select("id,status,error_code,result_json,created_at,resume_version_id,job_posts(job_title,company_name,description),resume_versions(version_no,resumes(title))").eq("id", id).maybeSingle();
  if (error || !data) notFound();
  const row = data as unknown as DetailRow;
  const parsed = analysisSchema.safeParse(row.result_json);

  return <div className="site-shell history-detail-page"><SiteHeader user={user} /><main className="history-detail-main"><div className="history-detail-nav"><Link href="/history"><ArrowLeft size={16} /> 返回历史报告</Link>{row.status === "succeeded" && <Link href={`/pages/new?analysisId=${row.id}&resumeVersionId=${row.resume_version_id}`} className="new-analysis-button"><Globe size={15} /> 生成在线简历页</Link>}<DeleteAnalysisButton id={row.id} redirectAfter /></div><section className="history-report-meta"><span className="section-eyebrow">SAVED ANALYSIS</span><h1>{row.job_posts?.job_title || "目标岗位"}</h1>{row.job_posts?.company_name && <p className="history-company">{row.job_posts.company_name}</p>}<div><span><FileText size={14} />{row.resume_versions?.resumes?.title || "我的简历"} · 第 {row.resume_versions?.version_no || 1} 版</span><span><CalendarDays size={14} />{dateFormatter.format(new Date(row.created_at))}</span><span><BriefcaseBusiness size={14} />{row.status === "succeeded" ? "分析完成" : row.status === "failed" ? "分析失败" : "分析中"}</span></div></section>{parsed.success ? <Results result={{ ...parsed.data, disclaimer: parsed.data.disclaimer || "以上结果由 AI 生成，仅供求职准备参考，请核对事实后再使用。" }} /> : <div className="history-unavailable"><h2>暂时无法展示这份报告</h2><p>{row.status === "failed" ? `分析未完成，错误码：${row.error_code || "UNKNOWN"}` : "报告仍在处理中，或保存的结果格式已不兼容。"}</p><Link href="/">重新分析</Link></div>}</main></div>;
}
