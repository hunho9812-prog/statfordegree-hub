"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";

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

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-28 flex-shrink-0 text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">{label}</span>
      <div className="flex items-center border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] overflow-hidden max-w-72 w-full focus-within:border-blue-400 transition-colors">
        <span className="px-3 text-[#9b9a97] text-sm font-semibold">₩</span>
        <input
          type="number" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 bg-transparent outline-none py-2 pr-3 text-sm text-[#37352f] dark:text-[#e6e6e4]"
        />
      </div>
    </div>
  );
}

type DataState = { sales: string; bizCost: string; laborTotal: string; eunhoLabor: string; hyunhoLabor: string; reserve: string };

const EMPTY: DataState = { sales: "", bizCost: "", laborTotal: "", eunhoLabor: "", hyunhoLabor: "", reserve: "" };

export default function LedgerPage() {
  const router = useRouter();
  const { entries, upsert } = useLedger();
  const [month, setMonth] = useState(getYM());
  const [data, setData] = useState<DataState>(EMPTY);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // entries가 바뀌거나 month가 바뀌면 해당 월 데이터 로드
  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    const entry = entries.find((e) => e.year === y && e.month === m);
    if (entry) {
      setData({
        sales: entry.sales ? String(entry.sales) : "",
        bizCost: entry.businessCost ? String(entry.businessCost) : "",
        laborTotal: entry.laborCost ? String(entry.laborCost) : "",
        eunhoLabor: "",
        hyunhoLabor: "",
        reserve: "",
      });
    } else {
      setData(EMPTY);
    }
    setSaveStatus("saved");
  }, [month, entries]);

  const g = (k: keyof DataState) => parseFloat(data[k]) || 0;
  const sales = g("sales"), bizCost = g("bizCost"), laborTotal = g("laborTotal");
  const profit = sales - bizCost - laborTotal;
  const eunhoLabor = g("eunhoLabor"), hyunhoLabor = g("hyunhoLabor"), reserve = g("reserve");
  const dividend = profit - eunhoLabor - hyunhoLabor - reserve;
  const eunhoDiv = dividend * 0.7, hyunhoDiv = dividend * 0.3;
  const eunhoTotal = eunhoLabor + eunhoDiv, hyunhoTotal = hyunhoLabor + hyunhoDiv;
  const [y, m] = month.split("-");

  const update = useCallback((key: keyof DataState) => (v: string) => {
    setData((prev) => ({ ...prev, [key]: v }));
    setSaveStatus("unsaved");
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    const [yr, mo] = month.split("-").map(Number);
    const s = parseFloat(data.sales) || 0;
    const b = parseFloat(data.bizCost) || 0;
    const l = parseFloat(data.laborTotal) || 0;
    await upsert({
      year: yr,
      month: mo,
      sales: s,
      businessCost: b,
      laborCost: l,
      profit: s - b - l,
    });
    setSaveStatus("saved");
  }, [month, data, upsert]);

  // 자동 저장 (3초 디바운스)
  useEffect(() => {
    if (saveStatus !== "unsaved") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { handleSave(); }, 3000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [saveStatus, handleSave]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/statfordegree")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
              <ArrowLeft size={14} /> 스탯포디그리
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">장부</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              saveStatus === "saved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : saveStatus === "saving" ? "bg-blue-100 text-blue-600"
              : "bg-amber-100 text-amber-700"
            }`}>
              {saveStatus === "saved" ? "● 저장됨" : saveStatus === "saving" ? "● 저장 중…" : "○ 미저장"}
            </span>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Save size={13} /> 저장
            </button>
          </div>
        </div>

        {/* Month nav */}
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
          <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">{y}년 {parseInt(m)}월</span>
        </div>

        {/* Step 1 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">1</div>
            <span className="font-bold text-[#37352f] dark:text-[#e6e6e4]">매출 / 비용 입력</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <MoneyInput label="매출" value={data.sales} onChange={update("sales")} />
            <MoneyInput label="사업비용" value={data.bizCost} onChange={update("bizCost")} />
            <MoneyInput label="인건비 합계" value={data.laborTotal} onChange={update("laborTotal")} />
          </div>
          <div className={`flex items-center justify-between px-5 py-3 ${profit < 0 ? "bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500" : "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500"}`}>
            <div>
              <span className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4]">순이익</span>
              <span className="ml-2 text-xs text-[#9b9a97]">= 매출 − 사업비용 − 인건비</span>
            </div>
            <span className={`text-lg font-extrabold ${profit < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400"}`}>{fmt(profit)}</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">2</div>
            <span className="font-bold text-[#37352f] dark:text-[#e6e6e4]">배당금 배분</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <MoneyInput label="은호 인건비" value={data.eunhoLabor} onChange={update("eunhoLabor")} />
            <MoneyInput label="현호 인건비" value={data.hyunhoLabor} onChange={update("hyunhoLabor")} />
            <MoneyInput label="예비비" value={data.reserve} onChange={update("reserve")} />
          </div>
          <div className={`flex items-center justify-between px-5 py-3 border-t border-[#e9e9e7] dark:border-[#2f2f2f] ${dividend < 0 ? "bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500" : "bg-violet-50 dark:bg-violet-950/30 border-l-4 border-violet-500"}`}>
            <div>
              <span className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4]">배당금</span>
              <span className="ml-2 text-xs text-[#9b9a97]">= 순이익 − 인건비들 − 예비비</span>
            </div>
            <span className={`text-lg font-extrabold ${dividend < 0 ? "text-red-500" : "text-violet-600 dark:text-violet-400"}`}>{fmt(dividend)}</span>
          </div>
          <div className="grid grid-cols-2 border-t border-[#e9e9e7] dark:border-[#2f2f2f]">
            {[
              { name: "은호", pct: 70, val: eunhoDiv, bg: "bg-orange-50 dark:bg-orange-950/20", color: "text-orange-600", border: "border-r border-[#e9e9e7] dark:border-[#2f2f2f]" },
              { name: "현호", pct: 30, val: hyunhoDiv, bg: "bg-teal-50 dark:bg-teal-950/20", color: "text-teal-600", border: "" },
            ].map(p => (
              <div key={p.name} className={`${p.bg} ${p.border} flex flex-col items-center gap-1 py-5`}>
                <span className="text-xs font-bold text-[#9b9a97] uppercase tracking-wider">{p.name} <span className="opacity-60">{p.pct}%</span></span>
                <span className={`text-2xl font-extrabold ${p.val < 0 ? "text-red-500" : p.color}`}>{fmt(p.val)}</span>
                <span className="text-xs text-[#9b9a97]">배당금 × {p.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border-2 border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xs font-bold flex items-center justify-center">3</div>
            <span className="font-bold text-[#37352f] dark:text-[#e6e6e4]">총 수령금</span>
          </div>
          <div className="grid grid-cols-2">
            {[
              { name: "은호", laborVal: eunhoLabor, divVal: eunhoDiv, total: eunhoTotal, bg: "bg-gradient-to-b from-orange-50 to-orange-100/40 dark:from-orange-950/20 dark:to-transparent", color: "text-orange-700 dark:text-orange-400", border: "border-r border-[#e9e9e7] dark:border-[#2f2f2f]" },
              { name: "현호", laborVal: hyunhoLabor, divVal: hyunhoDiv, total: hyunhoTotal, bg: "bg-gradient-to-b from-teal-50 to-teal-100/40 dark:from-teal-950/20 dark:to-transparent", color: "text-teal-700 dark:text-teal-400", border: "" },
            ].map(p => (
              <div key={p.name} className={`${p.bg} ${p.border} px-5 py-6 flex flex-col items-center gap-2 text-center`}>
                <span className="text-xs font-extrabold text-[#9b9a97] uppercase tracking-widest">{p.name}</span>
                <div className="text-xs text-[#9b9a97]">인건비 {fmt(p.laborVal)} + 배당금 {fmt(p.divVal)}</div>
                <span className={`text-3xl font-black tracking-tight ${p.total < 0 ? "text-red-500" : p.color}`}>{fmt(p.total)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
