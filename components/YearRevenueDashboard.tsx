"use client";

import { useMemo } from "react";
import { BarChart2, TrendingUp } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";

const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

// Extract month number from title "N월" (child of a year page)
function monthFromTitle(title: string): number {
  const m = title.match(/^(\d{1,2})월$/);
  return m ? parseInt(m[1]) : 0;
}

export default function YearRevenueDashboard({ pageId }: { pageId: string }) {
  const pages = useWorkspaceStore((s) => s.pages);
  const customers = useWorkspaceStore((s) => s.customers);
  const page = pages[pageId];

  const yearMatch = page?.title.match(/^(\d{4})년/);
  if (!yearMatch) return null;

  const year = parseInt(yearMatch[1]);

  // Build monthly revenue data (indexes 0–11 = 1월–12월)
  const monthlyData = useMemo(() => {
    // Map month page IDs to month numbers (child pages titled "N월")
    const monthPageMap: Record<string, number> = {}; // pageId → month (1–12)
    page.children.forEach((childId) => {
      const child = pages[childId];
      if (!child) return;
      const m = monthFromTitle(child.title);
      if (m >= 1 && m <= 12) monthPageMap[childId] = m;
    });

    const revenue = new Array<number>(12).fill(0);
    customers.forEach((c) => {
      if (!c.monthPageId) return;
      const m = monthPageMap[c.monthPageId];
      if (m) revenue[m - 1] += c.total_amount ?? 0;
    });

    return revenue;
  }, [page.children, pages, customers]);

  const MAX_REVENUE = 30_000_000; // y축 최대값 3000만원
  const BAR_MAX_H = 110; // 막대 최대 높이(px)
  const totalRevenue = monthlyData.reduce((s, v) => s + v, 0);
  const bestMonthIdx = monthlyData.indexOf(Math.max(...monthlyData));

  return (
    <div className="mb-8 rounded-xl border border-[#e9e9e7] dark:border-[#3a3a3a] bg-[#fafaf9] dark:bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e9e9e7] dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
          <BarChart2 size={15} className="text-blue-400" />
          {year}년 월별 매출 현황
        </div>
        <div className="flex items-center gap-3 text-sm">
          {totalRevenue > 0 && (
            <>
              <span className="flex items-center gap-1 text-[#9b9a97] dark:text-[#6b6b6b]">
                <TrendingUp size={12} />
                최고 {MONTH_LABELS[bestMonthIdx]}
              </span>
              <span className="font-bold text-blue-500">
                연 매출 ₩{totalRevenue.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bar chart */}
      <div className="px-4 pt-5 pb-3">
        {totalRevenue === 0 ? (
          <p className="text-center text-sm text-[#9b9a97] dark:text-[#6b6b6b] py-6">
            아직 매출 데이터가 없습니다. 월 페이지에 고객을 추가하면 자동으로 집계됩니다.
          </p>
        ) : (
          /* 전체 컬럼 높이 = 막대영역(BAR_MAX_H) + 금액라벨(14px) + 월라벨(18px) */
          <div
            className="flex gap-1"
            style={{ height: BAR_MAX_H + 32, alignItems: "stretch" }}
          >
            {monthlyData.map((rev, idx) => {
              const barH = Math.round((rev / MAX_REVENUE) * BAR_MAX_H);
              const isBest = idx === bestMonthIdx && rev > 0;
              const label = rev > 0 ? String(Math.round(rev / 10000)) : "";
              return (
                <div key={idx} className="flex flex-col items-center flex-1">
                  {/* 막대 위 공백: flex-1로 남은 공간 모두 차지해 막대를 아래로 밀기 */}
                  <div style={{ flex: 1 }} />
                  {/* 금액 라벨 (막대 바로 위) */}
                  <span
                    className="leading-none mb-0.5"
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: isBest ? "#3b82f6" : "#9b9a97",
                      minHeight: 12,
                    }}
                  >
                    {label}
                  </span>
                  {/* 막대 */}
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{
                      height: barH > 0 ? barH : 2,
                      backgroundColor: isBest
                        ? "#3b82f6"
                        : rev > 0
                        ? "#93c5fd"
                        : "#e5e7eb",
                    }}
                  />
                  {/* 월 라벨 */}
                  <span
                    className={`text-[9px] mt-1 whitespace-nowrap ${isBest ? "font-bold text-blue-500" : "text-[#9b9a97] dark:text-[#6b6b6b]"}`}
                  >
                    {MONTH_LABELS[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
