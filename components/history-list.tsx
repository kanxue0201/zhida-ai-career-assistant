import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText, Target, XCircle } from "lucide-react";
import { DeleteAnalysisButton } from "@/components/delete-analysis-button";

export type HistoryItem = {
  id: string;
  status: "processing" | "succeeded" | "failed";
  matchScore: number | null;
  jobTitle: string;
  companyName: string | null;
  resumeTitle: string;
  versionNo: number;
  createdAt: string;
};

export function HistoryList({ items }: { items: HistoryItem[] }) {
  if (!items.length) {
    return <div className="history-empty"><span><FileText size={28} /></span><h2>还没有保存的分析报告</h2><p>完成一次分析并开启“保存本次分析到历史”，报告就会出现在这里。</p><Link href="/">开始第一次分析 <ArrowUpRight size={16} /></Link></div>;
  }

  return <div className="history-list">{items.map((item) => <article className="history-card" key={item.id}>
    <div className="history-card-main">
      <div className="history-card-top"><span className={`history-status status-${item.status}`}>{item.status === "succeeded" ? <CheckCircle2 size={13} /> : item.status === "failed" ? <XCircle size={13} /> : <Clock3 size={13} />}{item.status === "succeeded" ? "分析完成" : item.status === "failed" ? "分析失败" : "分析中"}</span><time>{item.createdAt}</time></div>
      <h2><BriefcaseBusiness size={19} />{item.jobTitle}</h2>
      {item.companyName && <p className="history-company">{item.companyName}</p>}
      <div className="history-resume"><FileText size={14} />{item.resumeTitle} · 第 {item.versionNo} 版</div>
    </div>
    <div className="history-score">{item.matchScore !== null ? <><Target size={18} /><strong>{item.matchScore}</strong><span>匹配分</span></> : <><Target size={18} /><strong>—</strong><span>暂无评分</span></>}</div>
    <div className="history-actions"><Link href={`/history/${item.id}`}>{item.status === "succeeded" ? "查看报告" : "查看详情"}<ArrowUpRight size={15} /></Link><DeleteAnalysisButton id={item.id} /></div>
  </article>)}</div>;
}

