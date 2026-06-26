"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Minus } from "lucide-react";
import {
  LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useLedger } from "@/hooks/useLedger";

type ChartType = "line" | "bar";
type GroupBy = "monthly" | "quarterly" | "yearly";

type SeriesKey = "revenue" | "labor" | "expense" | "profit";
const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "revenue", label: "매출",    color: "#4f7bef" },
  { key: "labor",   label: "인건비",  color: "#f97316" },
  { key: "expense", label: "사업비용", color: "#a855f7" },
  { key: "profit",  label: "순이익",  color: "#22c55e" },
];

function fmt(v: number): string {
  if (Math.abs(v) >= 100_000_000) return `₩${(v / 100_000_000).toFixed(1)}억`;
  if (Math.abs(v) >= 10_000) return `₩${Math.round(v / 10_000)}만`;
  return `₩${v.toLocaleString()}`;
}

export default function StatsPage() {
  const router = useRouter();
  const { entries, loading } = useLedger();

  const currentYear = new Date().getFullYear();

  // 데이터가 있는 연도 + 현재 연도 기준 범위
  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => e.year));
    years.add(currentYear - 1);
    years.add(currentYear);
    return Array.from(years).sort((a, b) => a - b);
  }, [entries, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
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

  // 연도 탭 클릭 시 해당 연도 전체 선택
  const handleYearSelect = useCallback((yr: number | null) => {
    setSelectedYear(yr);
    if (yr === null) {
      // 전체: 가용 연도 전체 범위
      const min = availableYears[0] ?? currentYear;
      const max = availableYears[availableYears.length - 1] ?? currentYear;
      setStartYear(min); setStartMonth(1);
      setEndYear(max); setEndMonth(12);
    } else {
      setStartYear(yr); setStartMonth(1);
      setEndYear(yr); setEndMonth(12);
    }
    setSelectedMonth(null);
  }, [availableYears, currentYear]);

  // 기간 범위 내 데이터 필터링
  const rawMonthly = useMemo(() => {
    const result: { year: number; month: number; revenue: number; labor: number; expense: number; profit: number }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd = y === endYear ? endMonth : 12;
      for (let mo = mStart; mo <= mEnd; mo++) {
        if (selectedMonth !== null && mo !== selectedMonth) continue;
        const entry = entries.find((e) => e.year === y && e.month === mo);
        result.push({
          year: y,
          month: mo,
          revenue: entry?.sales ?? 0,
          labor: entry?.laborCost ?? 0,
          expense: entry?.businessCost ?? 0,
          profit: entry?.profit ?? 0,
        });
      }
    }
    return result;
  }, [entries, startYear, startMonth, endYear, endMonth, selectedMonth]);

  // 그룹핑
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
      const quarters: Record<string, { revenue: number; labor: number; expense: number }> = {};
      rawMonthly.forEach((d) => {
        const q = Math.ceil(d.month / 3);
        const key = `${d.year}-Q${q}`;
        if (!quarters[key]) quarters[key] = { revenue: 0, labor: 0, expense: 0 };
        quarters[key].revenue += d.revenue;
        quarters[key].labor += d.labor;
        quarters[key].expense += d.expense;
      });
      return Object.entries(quarters).map(([key, v]) => {
        const [y, q] = key.split("-");
        return {
          label: startYear !== endYear ? `${y}/${q}` : q,
          ...v,
          profit: v.revenue - v.labor - v.expense,
        };
      });
    }
    // yearly
    const years: Record<number, { revenue: number; labor: number; expense: number }> = {};
    rawMonthly.forEach((d) => {
      if (!years[d.year]) years[d.year] = { revenue: 0, labor: 0, expense: 0 };
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

  // 합계 카드
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

  // 월별 현황: 데이터가 있는 월만 표시 (선택된 연도의 전체 12개월)
  const monthlyCards = useMemo(() => {
    const yr = selectedYear ?? startYear;
    return Array.from({ length: 12 }, (_, i) => {
      const mo = i + 1;
      const entry = entries.find((e) => e.year === yr && e.month === mo);
      return {
        month: mo,
        revenue: entry?.sales ?? 0,
        labor: entry?.laborCost ?? 0,
        expense: entry?.businessCost ?? 0,
        profit: entry?.profit ?? 0,
        hasDat: !!entry,
      };
    });
  }, [entries, selectedYear, startYear]);

  const hover = "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)]";

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/statfordegree")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
            >
              <ArrowLeft size={14} /> 대시보드
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">통계</h1>
          </div>
          <button
            onClick={() => router.push("/ledger")}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            장부 입력 →
          </button>
        </div>

        {/* 연도 탭 */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-[#9b9a97] mr-1">연도</span>
          <button
            onClick={() => handleYearSelect(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
              selectedYear === null
                ? "bg-blue-500 text-white"
                : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
            )}
          >
            전체
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => handleYearSelect(yr)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                selectedYear === yr
                  ? "bg-blue-500 text-white"
                  : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
              )}
            >
              {yr}년
            </button>
          ))}
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
                setSelectedYear(null);
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
                setSelectedYear(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e6e6e4] text-sm outline-none"
            />
          </div>
          <div className="ml-auto flex gap-1">
            {(["line", "bar"] as ChartType[]).map((t) => (
              <button key={t} onClick={() => setChartType(t)}
                className={cn("px-4 py-1.5 text-sm rounded-lg font-medium transition-colors",
                  chartType === t ? "bg-blue-500 text-white" : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
                )}>{t === "line" ? "선형" : "막대"}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["monthly", "quarterly", "yearly"] as GroupBy[]).map((g) => (
              <button key={g} onClick={() => setGroupBy(g)}
                className={cn("px-4 py-1.5 text-sm rounded-lg font-medium transition-colors",
                  groupBy === g ? "bg-blue-500 text-white" : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
                )}>{g === "monthly" ? "월별" : g === "quarterly" ? "분기별" : "연별"}</button>
            ))}
          </div>
        </div>

        {/* Month filter */}
        {groupBy === "monthly" && (
          <div className="flex items-center gap-1.5 mb-5 flex-wrap">
            <span className="text-sm text-[#9b9a97] mr-1">월</span>
            {[null, ...Array.from({ length: 12 }, (_, i) => i + 1)].map((mo) => (
              <button key={mo ?? "all"} onClick={() => setSelectedMonth(mo)}
                className={cn("px-3 py-1 rounded-full text-sm transition-colors",
                  selectedMonth === mo ? "bg-blue-500 text-white font-semibold"
                  : `bg-white dark:bg-[#252525] text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] ${hover}`
                )}>{mo === null ? "전체" : `${mo}월`}</button>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] p-5 mb-6">
          {loading ? (
            <div className="h-80 flex items-center justify-center text-sm text-[#9b9a97]">데이터 로딩 중…</div>
          ) : chartData.every(d => !d.revenue && !d.labor && !d.expense) ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-[#9b9a97]">아직 장부 데이터가 없습니다.</p>
              <button onClick={() => router.push("/ledger")} className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                장부 입력하기 →
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              {chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9b9a97" }} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: "#9b9a97" }} width={70} />
                  <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                  <Legend />
                  {SERIES.filter(s => activeSeries.has(s.key)).map(s => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                      stroke={s.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "매출",    value: totals.revenue, icon: <TrendingUp size={16} />,   color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "인건비",  value: totals.labor,   icon: <TrendingDown size={16} />, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { label: "사업비용", value: totals.expense, icon: <DollarSign size={16} />,  color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
            { label: "순이익",  value: totals.profit,  icon: <Minus size={16} />,        color: "text-green-500",  bg: "bg-green-50 dark:bg-green-900/20" },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] p-4">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", bg, color)}>{icon}</div>
              <p className="text-xs text-[#9b9a97] mb-1">{label}</p>
              <p className={cn("text-lg font-bold", value < 0 ? "text-red-500" : color)}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* 월별 현황 카드 그리드 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4]">
              {selectedYear ?? `${startYear}~${endYear}`}년 월별 현황
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {monthlyCards.map((d) => (
              <div
                key={d.month}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  d.hasDat
                    ? "bg-white dark:bg-[#252525] border-[#e9e9e7] dark:border-[#2f2f2f]"
                    : "bg-[#f7f6f3] dark:bg-[#1e1e1e] border-[#e9e9e7] dark:border-[#2a2a2a] opacity-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#37352f] dark:text-[#e6e6e4]">{d.month}월</span>
                  {d.hasDat && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </div>
                {d.hasDat ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9b9a97]">매출</span>
                      <span className="text-blue-500 font-medium">{fmt(d.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9b9a97]">사업비</span>
                      <span className="text-purple-500">{fmt(d.expense)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9b9a97]">인건비</span>
                      <span className="text-orange-500">{fmt(d.labor)}</span>
                    </div>
                    <div className="border-t border-[#e9e9e7] dark:border-[#3f3f3f] mt-1 pt-1 flex justify-between text-xs">
                      <span className="text-[#9b9a97] font-medium">순이익</span>
                      <span className={cn("font-bold", d.profit >= 0 ? "text-green-500" : "text-red-500")}>{fmt(d.profit)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#9b9a97]">미입력</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Monthly table */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">상세 내역</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#1e1e1e]">
                  {["기간", "매출", "인건비", "사업비용", "순이익"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-[#9b9a97] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawMonthly.filter(d => d.revenue || d.labor || d.expense).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-[#9b9a97]">
                    데이터가 없습니다. 장부에서 입력해주세요.
                  </td></tr>
                ) : (
                  rawMonthly
                    .filter(d => d.revenue || d.labor || d.expense)
                    .map((d) => (
                      <tr key={`${d.year}-${d.month}`} className="border-b border-[#f0f0ef] dark:border-[#2f2f2f] hover:bg-[#fafaf9] dark:hover:bg-[#2a2a2a]">
                        <td className="px-4 py-2.5 font-medium text-[#37352f] dark:text-[#e6e6e4]">{d.year}년 {d.month}월</td>
                        <td className="px-4 py-2.5 text-blue-500 font-medium">{fmt(d.revenue)}</td>
                        <td className="px-4 py-2.5 text-orange-500">{fmt(d.labor)}</td>
                        <td className="px-4 py-2.5 text-purple-500">{fmt(d.expense)}</td>
                        <td className={cn("px-4 py-2.5 font-semibold", d.profit >= 0 ? "text-green-500" : "text-red-500")}>{fmt(d.profit)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
