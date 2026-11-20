"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

export function ClearHistoryButton({ disabled }: { disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function clear() {
    if (!window.confirm("确定清空全部保存数据吗？这将删除所有历史报告、岗位和简历文字记录，且无法撤销。")) return;
    setLoading(true);
    const response = await fetch("/api/history", { method: "DELETE" });
    if (response.ok) router.refresh();
    else {
      const payload = await response.json() as { error?: { message?: string } };
      window.alert(payload.error?.message || "清空失败，请稍后重试。");
      setLoading(false);
    }
  }

  return <button type="button" className="clear-history-button" onClick={clear} disabled={disabled || loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}清空保存数据</button>;
}

