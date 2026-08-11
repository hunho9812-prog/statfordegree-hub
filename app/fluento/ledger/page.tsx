"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Save, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useFluentoLedger } from "@/hooks/useFluentoLedger";
import { cn } from "@/lib/utils";

function fmt(v: number) {
  const abs = Math.abs(Math.round(v));
  const sign = v < 0 ? "-" : "";
  return sign + "₩" + abs.toLocaleString("ko-KR");
}

function getYM(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function shiftYM(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getYM(d);
}

function MoneyInput({ label, value, onChange, allowNegative }: { label: string; value: string; onChange: (v: string) => void; allowNegative?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-32 flex-shrink-0 text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">{label}</span>
      <div className="flex items-center border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] overflow-hidden max-w-72 w-full focus-within:border-green-400 transition-colors">
        <span className="px-3 text-[#9b9a97] text-sm font-semibold">₩</span>
        <input
          type="number" min={allowNegative ? undefined : "0"} step="1" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 bg-transparent outline-none py-2 pr-3 text-sm text-[#37352f] dark:text-[#e6e6e4]"
        />
      </div>
    </div>
  );
}

function ReadonlyMoney({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const abs = Math.abs(Math.round(value));
  const sign = value < 0 ? "-" : "";
  const display = sign + "₩" + abs.toLocaleString("ko-KR");
  return (
    <div className="flex items-center gap-4">
      <span className="w-32 flex-shrink-0 text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">{label}</span>
      <div className="flex items-center border border-dashed border-[#d0d0cc] dark:border-[#4a4a4a] rounded-lg bg-[#f0f0ed] dark:bg-[#272727] overflow-hidden max-w-72 w-full px-3 py-2 gap-2">
        <span className="text-[10px] text-[#9b9a97] border border-[#d0d0cc] dark:border-[#4a4a4a] rounded px-1">자동</span>
        <span className={`text-sm font-bold ${accent ?? "text-[#37352f] dark:text-[#e6e6e4]"}`}>{display}</span>
      </div>
    </div>
  );
}

function calcVat(sales: number) { return Math.floor(sales * 0.1 / 10) * 10; }

type DataState = { sales: string; bizCost: string; laborCost: string; nonOpIncome: string };
type Toast = { type: "success" | "error"; msg: string };
const EMPTY: DataState = { sales: "", bizCost: "", laborCost: "", nonOpIncome: "" };

export default function FluentoLedgerPage() {
  const router = useRouter();
  const { entries, upsert, remove } = useFluentoLedger();
  const [month, setMonth] = useState(getYM());
  const [data, setData] = useState<DataState>(EMPTY);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [toast, setToast] = useState<Toast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ year: number; month: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [y, m] = month.split("-");
  const currentYear = parseInt(y);

  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => e.year));
    const now = new Date().getFullYear();
    years.add(now - 1); years.add(now); years.add(now + 1);
    return Array.from(years).sort((a, b) => a - b);
  }, [entries]);

  const savedMonthsInYear = useMemo(() => {
    return new Set(entries.filter((e) => e.year === currentYear).map((e) => e.month));
  }, [entries, currentYear]);

  useEffect(() => {
    const [yy, mm] = month.split("-").map(Number);
    const entry = entries.find((e) => e.year === yy && e.month === mm);
    if (entry) {
      setData({
        sales: entry.sales ? String(entry.sales) : "",
        bizCost: entry.businessCost ? String(entry.businessCost) : "",
        laborCost: entry.laborCost ? String(entry.laborCost) : "",
        nonOpIncome: entry.nonOperatingIncome ? String(entry.nonOperatingIncome) : "",
      });
    } else {
      setData(EMPTY);
    }
    setSaveStatus("saved");
  }, [month, entries]);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const g = (k: keyof DataState) => parseFloat(data[k]) || 0;
  const sales = g("sales"), bizCost = g("bizCost"), laborCost = g("laborCost"), nonOpIncome = g("nonOpIncome");
  const vat = calcVat(sales);
  const operatingProfit = sales - vat - bizCost - laborCost;
  const profit = operatingProfit + nonOpIncome;

  const update = useCallback((key: keyof DataState) => (v: string) => {
    setData((prev) => ({ ...prev, [key]: v }));
    setSaveStatus("unsaved");
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    const [yr, mo] = month.split("-").map(Number);
    const s = Math.round(parseFloat(data.sales) || 0);
    const b = Math.round(parseFloat(data.bizCost) || 0);
    const l = Math.round(parseFloat(data.laborCost) || 0);
    const n = Math.round(parseFloat(data.nonOpIncome) || 0);
    const v = calcVat(s);
    const op = s - v - b - l;
    const result = await upsert({
      year: yr, month: mo,
      sales: s,
      businessCost: b,
      laborCost: l,
      nonOperatingIncome: n,
      profit: op + n,
    });
    if (result.success) {
      setSaveStatus("saved");
      showToast({ type: "success", msg: `${yr}년 ${mo}월 장부가 저장됐습니다.` });
    } else {
      setSaveStatus("unsaved");
      showToast({ type: "error", msg: result.error ?? "저장에 실패했습니다." });
    }
  }, [month, data, upsert, showToast]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  useEffect(() => {
    if (saveStatus !== "unsaved") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => handleSaveRef.current(), 3000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [saveStatus]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await remove(deleteTarget.year, deleteTarget.month);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.success) {
      showToast({ type: "success", msg: `${deleteTarget.year}년 ${deleteTarget.month}월 데이터를 삭제했습니다.` });
      const [yy, mm] = month.split("-").map(Number);
      if (deleteTarget.year === yy && deleteTarget.month === mm) { setData(EMPTY); setSaveStatus("saved"); }
    } else {
      showToast({ type: "error", msg: result.error ?? "삭제에 실패했습니다." });
    }
  }, [deleteTarget, remove, showToast, month]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold",
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
            <button onClick={() => router.push("/fluento")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
              <ArrowLeft size={14} /> 플루엔토
            </button>
            <h1 className="text-xl font-bold">
              💡 <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">플루엔토</span>
              <span className="text-[#37352f] dark:text-[#e6e6e4] ml-2">장부</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              saveStatus === "saved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : saveStatus === "saving" ? "bg-blue-100 text-blue-600"
              : "bg-green-100 text-green-700"
            }`}>
              {saveStatus === "saved" ? "● 저장됨" : saveStatus === "saving" ? "● 저장 중…" : "○ 미저장"}
            </span>
            <button onClick={handleSave} disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-400 text-green-950 font-bold hover:bg-green-500 disabled:opacity-50 transition-colors">
              <Save size={13} /> 저장
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* 사이드바 */}
          <div className="w-48 flex-shrink-0">
            <div className="flex flex-wrap gap-1 mb-3">
              {availableYears.map((yr) => (
                <button key={yr}
                  onClick={() => setMonth(`${yr}-${String(parseInt(m)).padStart(2, "0")}`)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                    currentYear === yr
                      ? "bg-green-400 text-green-950"
                      : "bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#2f2f2f] hover:border-green-400"
                  )}>
                  {yr}년
                </button>
              ))}
            </div>
            <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
                <span className="text-xs font-bold text-[#37352f] dark:text-[#e6e6e4]">{currentYear}년 저장 목록</span>
              </div>
              <div className="py-1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
                  const saved = savedMonthsInYear.has(mo);
                  const active = parseInt(m) === mo;
                  return (
                    <div key={mo} className={cn("group flex items-center transition-colors",
                      active ? "bg-green-50 dark:bg-green-950/20" : "hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]")}>
                      <button onClick={() => setMonth(`${currentYear}-${String(mo).padStart(2, "0")}`)}
                        className={cn("flex-1 flex items-center justify-between px-4 py-2 text-sm",
                          active ? "text-green-600 dark:text-green-400 font-semibold" : "text-[#37352f] dark:text-[#e6e6e4]")}>
                        <span>{mo}월</span>
                        {saved && <CheckCircle size={13} className="text-emerald-500" />}
                      </button>
                      {saved && (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ year: currentYear, month: mo }); }}
                          className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#9b9a97] hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 메인 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setMonth(shiftYM(month, -1))}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#9b9a97] hover:text-green-500 hover:border-green-400 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e6e6e4] outline-none" />
              <button onClick={() => setMonth(shiftYM(month, 1))}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#9b9a97] hover:text-green-500 hover:border-green-400 transition-colors">
                <ChevronRight size={16} />
              </button>
              <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">{y}년 {parseInt(m)}월</span>
              {savedMonthsInYear.has(parseInt(m)) && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle size={13} /> 저장됨
                </span>
              )}
            </div>

            {/* 입력 카드 */}
            <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] border-t-4 border-t-green-400 shadow-sm overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
                <div className="w-7 h-7 rounded-full bg-green-400 text-green-950 text-xs font-bold flex items-center justify-center">1</div>
                <span className="font-bold text-[#37352f] dark:text-[#e6e6e4]">매출 / 비용 입력</span>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <MoneyInput label="매출" value={data.sales} onChange={update("sales")} />
                <ReadonlyMoney label="부가세 (10%)" value={vat} accent="text-orange-500" />
                <MoneyInput label="사업비용" value={data.bizCost} onChange={update("bizCost")} />
                <MoneyInput label="인건비" value={data.laborCost} onChange={update("laborCost")} />
              </div>
              <div className={`flex items-center justify-between px-5 py-2.5 border-y border-[#e9e9e7] dark:border-[#3f3f3f] ${operatingProfit < 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-slate-50 dark:bg-slate-900/20"}`}>
                <div>
                  <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">영업이익</span>
                  <span className="ml-2 text-xs text-[#9b9a97]">= 매출 − 부가세 − 사업비용 − 인건비</span>
                </div>
                <span className={`text-base font-bold ${operatingProfit < 0 ? "text-red-500" : "text-slate-600 dark:text-slate-300"}`}>{fmt(operatingProfit)}</span>
              </div>
              <div className="px-5 py-4">
                <MoneyInput label="영업외이익" value={data.nonOpIncome} onChange={update("nonOpIncome")} allowNegative />
              </div>
              <div className={`flex items-center justify-between px-5 py-3 ${profit < 0 ? "bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500" : "bg-green-50 dark:bg-green-950/20 border-l-4 border-green-400"}`}>
                <div>
                  <span className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4]">순이익</span>
                  <span className="ml-2 text-xs text-[#9b9a97]">= 영업이익 + 영업외이익</span>
                </div>
                <span className={`text-lg font-extrabold ${profit < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{fmt(profit)}</span>
              </div>
            </div>

            {/* 요약 */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "매출", value: sales, color: "text-blue-500" },
                { label: "총 비용", value: bizCost + laborCost, color: "text-red-500" },
                { label: "순이익", value: profit, color: profit < 0 ? "text-red-500" : "text-emerald-600" },
              ].map(c => (
                <div key={c.label} className="bg-white dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-4">
                  <p className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide mb-1">{c.label}</p>
                  <p className={`text-xl font-extrabold ${c.color}`}>{fmt(c.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-xl p-6 w-80 mx-4" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4] mb-1">{deleteTarget.year}년 {deleteTarget.month}월 장부 삭제</p>
            <p className="text-xs text-red-400 mb-5">삭제한 데이터는 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors">취소</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 transition-colors">
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
