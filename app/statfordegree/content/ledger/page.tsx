"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Pencil,
  Check, X, CheckCircle, XCircle,
} from "lucide-react";
import { useContentLedger } from "@/hooks/useContentLedger";
import { type ContentLedgerEntry, type ContentLedgerType } from "@/lib/db-content-ledger";
import { cn } from "@/lib/utils";

function getYM(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function shiftYM(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getYM(d);
}
function fmt(v: number) {
  const abs = Math.abs(Math.round(v));
  return (v < 0 ? "-" : "") + "₩" + abs.toLocaleString("ko-KR");
}

type RowDraft = {
  id: string;
  date: string;
  type: ContentLedgerType;
  item: string;
  channel: string;
  amount: string;
  memo: string;
};

const EMPTY_DRAFT = (date: string): RowDraft => ({
  id: "",
  date,
  type: "income",
  item: "",
  channel: "",
  amount: "",
  memo: "",
});

type Toast = { type: "success" | "error"; msg: string };

export default function ContentLedgerPage() {
  const router = useRouter();
  const { entries, upsert, remove } = useContentLedger();
  const [month, setMonth] = useState(getYM());
  const [draft, setDraft] = useState<RowDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentLedgerEntry | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month]
  );

  const totals = useMemo(() => {
    const income = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const expense = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income - expense };
  }, [monthEntries]);

  const openNewRow = () => setDraft(EMPTY_DRAFT(`${month}-01`));
  const openEditRow = (entry: ContentLedgerEntry) =>
    setDraft({
      id: entry.id,
      date: entry.date,
      type: entry.type,
      item: entry.item,
      channel: entry.channel,
      amount: String(entry.amount),
      memo: entry.memo,
    });

  const handleSaveDraft = useCallback(async () => {
    if (!draft) return;
    if (!draft.date || !draft.item.trim()) {
      showToast({ type: "error", msg: "날짜와 항목명을 입력해주세요." });
      return;
    }
    const entry: ContentLedgerEntry = {
      id: draft.id || uuidv4(),
      date: draft.date,
      type: draft.type,
      item: draft.item.trim(),
      channel: draft.channel.trim(),
      amount: Math.round(parseFloat(draft.amount) || 0),
      memo: draft.memo.trim(),
    };
    const result = await upsert(entry);
    if (result.success) {
      showToast({ type: "success", msg: "저장했습니다." });
      setDraft(null);
    } else {
      showToast({ type: "error", msg: result.error ?? "저장에 실패했습니다." });
    }
  }, [draft, upsert, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const result = await remove(deleteTarget.id);
    setDeleteTarget(null);
    if (result.success) showToast({ type: "success", msg: "삭제했습니다." });
    else showToast({ type: "error", msg: result.error ?? "삭제에 실패했습니다." });
  }, [deleteTarget, remove, showToast]);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/statfordegree/content")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
              <ArrowLeft size={14} /> 콘텐츠 관리
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">장부</h1>
          </div>
          <button
            onClick={openNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Plus size={14} /> 항목 추가
          </button>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMonth(shiftYM(month, -1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#9b9a97] hover:text-blue-500 hover:border-blue-400 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e6e6e4] outline-none" />
          <button onClick={() => setMonth(shiftYM(month, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#9b9a97] hover:text-blue-500 hover:border-blue-400 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-xl">
          <div className="bg-white dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] px-4 py-3">
            <p className="text-xs text-[#9b9a97] mb-1">수입 합계</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(totals.income)}</p>
          </div>
          <div className="bg-white dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] px-4 py-3">
            <p className="text-xs text-[#9b9a97] mb-1">지출 합계</p>
            <p className="text-base font-bold text-red-500">{fmt(totals.expense)}</p>
          </div>
          <div className="bg-white dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] px-4 py-3">
            <p className="text-xs text-[#9b9a97] mb-1">순액</p>
            <p className={cn("text-base font-bold", totals.net < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>{fmt(totals.net)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e9e9e7] dark:border-[#2f2f2f] text-left text-[#9b9a97]">
                <th className="px-4 py-2.5 font-medium">날짜</th>
                <th className="px-4 py-2.5 font-medium">구분</th>
                <th className="px-4 py-2.5 font-medium">항목명</th>
                <th className="px-4 py-2.5 font-medium">플랫폼/채널</th>
                <th className="px-4 py-2.5 font-medium text-right">금액</th>
                <th className="px-4 py-2.5 font-medium">메모</th>
                <th className="px-4 py-2.5 font-medium w-16" />
              </tr>
            </thead>
            <tbody>
              {monthEntries.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#9b9a97]">이번 달 등록된 항목이 없습니다.</td></tr>
              ) : monthEntries.map((e) => (
                <tr key={e.id} className="group border-b border-[#f0f0ed] dark:border-[#2a2a2a] last:border-0 hover:bg-[#f7f6f3] dark:hover:bg-[#2a2a2a]">
                  <td className="px-4 py-2.5 text-[#37352f] dark:text-[#e6e6e4]">{e.date}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      e.type === "income" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                    )}>
                      {e.type === "income" ? "수입" : "지출"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#37352f] dark:text-[#e6e6e4]">{e.item}</td>
                  <td className="px-4 py-2.5 text-[#5b635c] dark:text-[#a0a8a0]">{e.channel}</td>
                  <td className={cn("px-4 py-2.5 text-right font-semibold", e.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                    {e.type === "income" ? "+" : "-"}{fmt(e.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-[#9b9a97] max-w-[200px] truncate">{e.memo}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditRow(e)} className="p-1 text-[#9b9a97] hover:text-blue-500" title="수정"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteTarget(e)} className="p-1 text-[#9b9a97] hover:text-red-500" title="삭제"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDraft(null)}>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl w-96 mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
              <h2 className="font-bold text-sm text-[#37352f] dark:text-[#e6e6e4]">{draft.id ? "항목 수정" : "항목 추가"}</h2>
              <button onClick={() => setDraft(null)} className="text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"><X size={16} /></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex gap-2">
                <button onClick={() => setDraft({ ...draft, type: "income" })}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors",
                    draft.type === "income" ? "bg-emerald-500 text-white border-emerald-500" : "border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97]")}>
                  수입
                </button>
                <button onClick={() => setDraft({ ...draft, type: "expense" })}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors",
                    draft.type === "expense" ? "bg-red-500 text-white border-red-500" : "border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97]")}>
                  지출
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-[#9b9a97] block mb-1">날짜</label>
                <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-[#9b9a97] block mb-1">항목명</label>
                <input value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                  placeholder="예: 유튜브 광고 수익"
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-[#9b9a97] block mb-1">플랫폼/채널</label>
                <input value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
                  placeholder="예: 유튜브, 인스타그램"
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-[#9b9a97] block mb-1">금액</label>
                <div className="flex items-center border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] overflow-hidden focus-within:border-blue-400">
                  <span className="px-3 text-[#9b9a97] text-sm font-semibold">₩</span>
                  <input type="number" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                    placeholder="0"
                    className="flex-1 bg-transparent outline-none py-2 pr-3 text-sm text-[#37352f] dark:text-[#e6e6e4]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#9b9a97] block mb-1">메모</label>
                <input value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                  placeholder="선택 입력"
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400" />
              </div>

              <button onClick={handleSaveDraft}
                className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5">
                <Check size={14} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-xl p-6 w-80">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                <Trash2 size={16} />
              </div>
              <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">항목 삭제</h2>
            </div>
            <p className="text-sm text-[#9b9a97] mb-5">
              <span className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">{deleteTarget.item}</span> 항목을 삭제할까요?<br />
              삭제한 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors">
                취소
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
