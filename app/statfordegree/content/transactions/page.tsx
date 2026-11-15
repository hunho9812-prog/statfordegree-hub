"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useContentTransactions } from "@/hooks/useContentTransactions";
import { usePageTitles } from "@/hooks/usePageTitles";
import { useAuth } from "@/components/AuthProvider";
import { EditableTitle } from "@/components/EditableTitle";
import type { TransactionType } from "@/lib/db-content-transactions";
import { cn } from "@/lib/utils";

const PAGE_TITLE_KEY = "content_transactions_title";
const DEFAULT_PAGE_TITLE = "거래 기록";

function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function fmtAmount(v: number) {
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

type Toast = { type: "success" | "error"; msg: string };

export default function ContentTransactionsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { getTitle, setTitle } = usePageTitles();
  const pageTitle = getTitle(PAGE_TITLE_KEY, DEFAULT_PAGE_TITLE);
  const { entries, add, remove } = useContentTransactions();

  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAdd = useCallback(async () => {
    const amt = Math.round(parseFloat(amount) || 0);
    if (amt <= 0) {
      showToast({ type: "error", msg: "금액을 입력해주세요." });
      return;
    }
    if (!date) {
      showToast({ type: "error", msg: "날짜를 입력해주세요." });
      return;
    }
    setSaving(true);
    const result = await add({ type, amount: amt, occurredOn: date, memo: memo.trim() });
    setSaving(false);
    if (result.success) {
      setAmount("");
      setMemo("");
      showToast({ type: "success", msg: "기록이 추가됐습니다." });
    } else {
      showToast({ type: "error", msg: result.error ?? "추가에 실패했습니다." });
    }
  }, [type, amount, date, memo, add, showToast]);

  const handleRemove = useCallback(async (id: string) => {
    await remove(id);
    showToast({ type: "success", msg: "기록을 삭제했습니다." });
  }, [remove, showToast]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all",
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        )}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/statfordegree/content")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
          >
            <ArrowLeft size={14} /> 콘텐츠 관리
          </button>
          <EditableTitle
            value={pageTitle}
            isAdmin={isAdmin}
            onSave={(next) => setTitle(PAGE_TITLE_KEY, next)}
            className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]"
          />
        </div>

        {/* 입력 영역 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-4 mb-5 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] overflow-hidden">
            <button
              onClick={() => setType("income")}
              className={cn(
                "px-3 py-2 text-sm font-semibold transition-colors",
                type === "income" ? "bg-emerald-500 text-white" : "bg-transparent text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]"
              )}
            >
              수입
            </button>
            <button
              onClick={() => setType("expense")}
              className={cn(
                "px-3 py-2 text-sm font-semibold transition-colors",
                type === "expense" ? "bg-red-500 text-white" : "bg-transparent text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]"
              )}
            >
              지출
            </button>
          </div>

          <div className="flex items-center border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] overflow-hidden">
            <span className="px-2.5 text-[#9b9a97] text-sm font-semibold">₩</span>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액"
              className="w-28 bg-transparent outline-none py-2 pr-3 text-sm text-[#37352f] dark:text-[#e6e6e4]"
            />
          </div>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-[#e6e6e4] outline-none"
          />

          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모"
            className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-[#e6e6e4] outline-none"
          />

          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Plus size={14} /> 추가
          </button>
        </div>

        {/* 거래 목록 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e9e9e7] dark:border-[#2f2f2f] text-left text-[#9b9a97]">
                <th className="px-4 py-3 font-semibold">날짜</th>
                <th className="px-4 py-3 font-semibold">구분</th>
                <th className="px-4 py-3 font-semibold text-right">금액</th>
                <th className="px-4 py-3 font-semibold">메모</th>
                <th className="px-4 py-3 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#9b9a97]">
                    아직 기록된 거래가 없습니다.
                  </td>
                </tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="group border-b border-[#f0f0ed] dark:border-[#2a2a2a] last:border-0 hover:bg-[#f7f6f3] dark:hover:bg-[#2a2a2a]">
                  <td className="px-4 py-3 text-[#37352f] dark:text-[#e6e6e4]">{e.occurredOn}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      e.type === "income" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                    )}>
                      {e.type === "income" ? "수입" : "지출"}
                    </span>
                  </td>
                  <td className={cn(
                    "px-4 py-3 text-right font-semibold",
                    e.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  )}>
                    {e.type === "income" ? "+" : "−"}{fmtAmount(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-[#37352f] dark:text-[#e6e6e4]">{e.memo}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#9b9a97] hover:text-red-500 transition-opacity"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
