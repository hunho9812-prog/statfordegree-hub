"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Minus } from "lucide-react";
import {
  LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const QUARTERS = ["1분기","2분기","3분기","4분기"];

type ChartType = "line" | "bar";
type GroupBy = "monthly" | "quarterly" | "yearly";

type SeriesKey = "revenue" | "labor" | "expense" | "profit";
const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "revenue", label: "매출",   color: "#4f7bef" },
  { key: "labor",   label: "인건비", color: "#f97316" },
  { key: "expense", label: "사업비용", color: "#a855f7" },
  { key: "profit",  label: "순이익", color: "#22c55e" },
];

function monthNumFromPageTitle(title: string): number {
  const m = title.match(/^(\d{1,2})월$/);
  return m ? parseInt(m[1]) : 0;
}
function yearNumFromPageTitle(title: string): number {
  const m = title.match(/^(\d{4})년/);
  return m ? parseInt(m[1]) : 0;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 100_000_000) return `₩${(v / 100_000_000).toFixed(1)}억`;
  if (Math.abs(v) >= 10_000) return `₩${Math.round(v / 10_000)}만`;
  return `₩${v.toLocaleString()}`;
}

// ── Cost input modal ─────────────────────────────────────────────────────────
function CostModal({
  year, month, initial,
  onSave, onClose,
}: {
  year: number; month: number;
  initial: { labor: number; expense: number };
  onSave: (labor: number, expense: number) => void;
  onClose: () => void;
}) {
  const [labor, setLabor] = useState(String(initial.labor || ""));
  const [expense, setExpense] = useState(String(initial.expense || ""));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#252525] rounded-2xl p-6 shadow-xl w-80 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">
          {year}년 {month}월 비용 입력
        </h3>
        <label className="flex flex-col gap-1 text-sm text-[#9b9a97]">
          인건비
          <input
            type="number"
            value={labor}
            onChange={(e) => setLabor(e.target.value)}
            placeholder="0"
            className="px-3 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#1e1e1e] text-[#37352f] dark:text-[#e6e6e4] text-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#9b9a97]">
          사업비용
          <input
            type="number"
            value={expense}
            onChange={(e) => setExpense(e.target.value)}
            placeholder="0"
            className="px-3 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#1e1e1e] text-[#37352f] dark:text-[#e6e6e4] text-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]"
          >취소</button>
          <button
            onClick={() => { onSave(Number(labor) || 0, Number(expense) || 0); onClose(); }}
            className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >저장</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StatsPage() {
  const router = useRouter();
  const { pages, customers, monthlyCosts, upsertMonthlyCost } = useWorkspaceStore();

  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(12);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [groupBy, setGroupBy] = useState<GroupBy>("monthly");
  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(
    new Set(["revenue", "labor", "expense", "profit"])
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [costModal, setCostModal] = useState<{ year: number; month: number } | null>(null);

  // Build month→year page map from page tree
  const monthPageMap = useMemo(() => {
    const map: Record<string, { year: number; month: number }> = {};
    Object.values(pages).forEach((p) => {
      const year = yearNumFromPageTitle(p.title);
      if (!year) return;
      p.children.forEach((childId) => {
        const child = pages[childId];
        if (!child) return;
        const month = monthNumFromPageTitle(child.title);
        if (month) map[childId] = { year, month };
      });
    });
    return map;
  }, [pages]);

  // Build raw monthly data
  const rawMonthly = useMemo(() => {
    type MonthKey = string; // "YYYY-MM"
    const revenueMap: Record<MonthKey, number> = {};

    customers.forEach((c) => {
      if (!c.monthPageId) return;
      const info = monthPageMap[c.monthPageId];
      if (!info) return;
      const key = `${info.year}-${String(info.month).padStart(2, "0")}`;
      revenueMap[key] = (revenueMap[key] ?? 0) + (c.total_amount ?? 0);
    });

    const costMap: Record<MonthKey, { labor: number; expense: number }> = {};
    monthlyCosts.forEach((mc) => {
      const key = `${mc.year}-${String(mc.month).padStart(2, "0")}`;
      costMap[key] = { labor: mc.labor, expense: mc.expense };
    });

    // Build list of all months in range
    const result: { year: number; month: number; revenue: number; labor: number; expense: number; profit: number }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd = y === endYear ? endMonth : 12;
      for (let m = mStart; m <= mEnd; m++) {
        if (selectedMonth !== null && m !== selectedMonth) continue;
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const revenue = revenueMap[key] ?? 0;
        const labor = costMap[key]?.labor ?? 0;
        const expense = costMap[key]?.expense ?? 0;
        const profit = revenue - labor - expense;
        result.push({ year: y, month: m, revenue, labor, expense, profit });
      }
    }
    return result;
  }, [customers, monthPageMap, monthlyCosts, startYear, startMonth, endYear, endMonth, selectedMonth]);

  // Group data
  const chartData = useMemo(() => {
    if (groupBy === "monthly") {
      return rawMonthly.map((d) => ({
        label: startYear !== endYear ? `${d.year}/${d.month}월` : `${d.month}월`,
        revenue: d.revenue,
        labor: d.labor,
        expense: d.expense,
        profit: d.profit,
      }));
    }
    if (groupBy === "quarterly") {
      const quarters: Record<string, { revenue: number; labor: number; expense: number; profit: number }> = {};
      rawMonthly.forEach((d) => {
        const q = Math.ceil(d.month / 3);
        const key = `${d.year}-Q${q}`;
        if (!quarters[key]) quarters[key] = { revenue: 0, labor: 0, expense: 0, profit: 0 };
        quarters[key].revenue += d.revenue;
        quarters[key].labor += d.labor;
        quarters[key].expense += d.expense;
      });
      return Object.entries(quarters).map(([key, v]) => {
        const [y, q] = key.split("-");
        const label = startYear !== endYear ? `${y}/${q}` : q;
        return { label, ...v, profit: v.revenue - v.labor - v.expense };
      });
    }
    // yearly
    const years: Record<number, { revenue: number; labor: number; expense: number; profit: number }> = {};
    rawMonthly.forEach((d) => {
      if (!years[d.year]) years[d.year] = { revenue: 0, labor: 0, expense: 0, profit: 0 };
      years[d.year].revenue += d.revenue;
      years[d.year].labor += d.labor;
      years[d.year].expense += d.expense;
    });
    return Object.entries(years).map(([y, v]) => ({
      label: `${y}년`,
      ...v,
      profit: v.revenue - v.labor - v.expense,
    }));
  }, [rawMonthly, groupBy, startYear, endYear]);

  // Totals
  const totals = useMemo(() => {
    const revenue = rawMonthly.reduce((s, d) => s + d.revenue, 0);
    const labor = rawMonthly.reduce((s, d) => s + d.labor, 0);
    const expense = rawMonthly.reduce((s, d) => s + d.expense, 0);
    return { revenue, labor, expense, profit: revenue - labor - expense };
  }, [rawMonthly]);

  const toggleSeries = useCallback((key: SeriesKey) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }, []);

  const currentCost = costModal
    ? monthlyCosts.find((c) => c.year === costModal.year && c.month === costModal.month) ?? { labor: 0, expense: 0 }
    : null;

  const hover = "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)]";

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/statfordegree")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
            >
              <ArrowLeft size={14} />
              대시보드
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">통계</h1>
          </div>
          <button
            onClick={() => {
              const now = new Date();
              setCostModal({ year: now.getFullYear(), month: now.getMonth() + 1 });
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            + 비용 입력
          </button>
        </div>

        {/* Series toggles */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SERIES.map(({ key, label, color }) => {
            const active = activeSeries.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleSeries(key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  active ? "text-white shadow-md" : "bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f]"
                )}
                style={active ? { backgroundColor: color } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? "#fff" : color }} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-[#9b9a97]">
            기간
            <input
              type="month"
              value={`${startYear}-${String(startMonth).padStart(2, "0")}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                setStartYear(Number(y)); setStartMonth(Number(m));
              }}
              className="px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e6e6e4] text-sm outline-none"
            />
            ~
            <input
              type="month"
              value={`${endYear}-${String(endMonth).padStart(2, "0")}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                setEndYear(Number(y)); setEndMonth(Number(m));
              }}
              className="px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e6e6e4] text-sm outline-none"
            />
          </div>
          <div className="ml-auto flex gap-1">
            {(["line","bar"] as ChartType[]).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={cn(
                  "px-4 py-1.5 text-sm rounded-lg font-medium transition-colors",
                  chartType === t
                    ? "bg-blue-500 text-white"
                    : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
                )}
              >{t === "line" ? "선형" : "막대"}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["monthly","quarterly","yearly"] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={cn(
                  "px-4 py-1.5 text-sm rounded-lg font-medium transition-colors",
                  groupBy === g
                    ? "bg-blue-500 text-white"
                    : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
                )}
              >{g === "monthly" ? "월별" : g === "quarterly" ? "분기별" : "연별"}</button>
            ))}
          </div>
        </div>

        {/* Month filter (monthly only) */}
        {groupBy === "monthly" && (
          <div className="flex items-center gap-1.5 mb-5 flex-wrap">
            <span className="text-sm text-[#9b9a97] mr-1">월</span>
            {[null, ...Array.from({length:12},(_,i)=>i+1)].map((m) => (
              <button
                key={m ?? "all"}
                onClick={() => setSelectedMonth(m)}
                className={cn(
                  "px-3 py-1 rounded-full text-sm transition-colors",
                  selectedMonth === m
                    ? "bg-blue-500 text-white font-semibold"
                    : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
                )}
              >{m === null ? "전체" : `${m}월`}</button>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] p-5 mb-6">
          <ResponsiveContainer width="100%" height={320}>
            {chartType === "line" ? (
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9b9a97" }} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: "#9b9a97" }} width={70} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                {SERIES.filter(s => activeSeries.has(s.key)).map(s => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9b9a97" }} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: "#9b9a97" }} width={70} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                {SERIES.filter(s => activeSeries.has(s.key)).map(s => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4,4,0,0]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "매출",   value: totals.revenue, icon: <TrendingUp size={16} />,  color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "인건비", value: totals.labor,   icon: <TrendingDown size={16} />, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { label: "사업비용", value: totals.expense, icon: <DollarSign size={16} />, color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-900/20" },
            { label: "순이익", value: totals.profit,  icon: <Minus size={16} />,       color: "text-green-500",  bg: "bg-green-50 dark:bg-green-900/20" },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] p-4">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", bg, color)}>
                {icon}
              </div>
              <p className="text-xs text-[#9b9a97] mb-1">{label}</p>
              <p className={cn("text-lg font-bold", color)}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* Monthly cost entry table */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f] flex items-center justify-between">
            <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">월별 비용 현황</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#1e1e1e]">
                  {["기간","매출","인건비","사업비용","순이익",""].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-[#9b9a97] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawMonthly.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-[#9b9a97]">데이터가 없습니다</td></tr>
                ) : (
                  rawMonthly.map((d) => (
                    <tr key={`${d.year}-${d.month}`} className="border-b border-[#f0f0ef] dark:border-[#2f2f2f] hover:bg-[#fafaf9] dark:hover:bg-[#2a2a2a]">
                      <td className="px-4 py-2.5 font-medium text-[#37352f] dark:text-[#e6e6e4]">{d.year}년 {d.month}월</td>
                      <td className="px-4 py-2.5 text-blue-500 font-medium">{fmt(d.revenue)}</td>
                      <td className="px-4 py-2.5 text-orange-500">{fmt(d.labor)}</td>
                      <td className="px-4 py-2.5 text-purple-500">{fmt(d.expense)}</td>
                      <td className={cn("px-4 py-2.5 font-semibold", d.profit >= 0 ? "text-green-500" : "text-red-500")}>{fmt(d.profit)}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setCostModal({ year: d.year, month: d.month })}
                          className="text-xs px-2.5 py-1 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f0f0ef] dark:hover:bg-[#333] transition-colors"
                        >수정</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {costModal && currentCost && (
        <CostModal
          year={costModal.year}
          month={costModal.month}
          initial={currentCost}
          onSave={(labor, expense) => upsertMonthlyCost({ year: costModal.year, month: costModal.month, labor, expense })}
          onClose={() => setCostModal(null)}
        />
      )}
    </div>
  );
}
