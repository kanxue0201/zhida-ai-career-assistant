"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

export function DeleteAnalysisButton({ id, redirectAfter = false }: { id: string; redirectAfter?: boolean }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function remove() {
    if (!window.confirm("确定删除这份分析报告吗？此操作无法撤销。")) return;
    setDeleting(true);
    setError("");
    const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
    const payload = await response.json() as { success: boolean; error?: { message?: string } };
    if (!response.ok || !payload.success) {
      setError(payload.error?.message || "删除失败，请重试。");
      setDeleting(false);
      return;
    }
    if (redirectAfter) router.replace("/history");
    else router.refresh();
  }

  return <span className="delete-analysis-control"><button type="button" className="delete-analysis-button" onClick={remove} disabled={deleting} title="删除报告">{deleting ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}<span>{deleting ? "删除中" : "删除"}</span></button>{error && <span className="delete-error">{error}</span>}</span>;
}
