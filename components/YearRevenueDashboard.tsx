"use client";

import { useMemo } from "react";
import { BarChart2, TrendingUp } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";

const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

// Extract month number from title "고객관리양식(YY년 N월)"
function monthFromTitle(title: string): number {
  const m = title.match(/\(\d{2}년\s*(\d{1,2})월\)$/);
  return m ? parseInt(m[1]) : 0;
}

export default function YearRevenueDashboard({ pageId }: { pageId: string }) {
  const { pages, customers } = useWorkspaceStore();
  const page = pages[pageId];

  const yearMatch = page?.title.match(/^(\d{4})년/);
  if (!yearMatch) return null;

  const year = parseInt(yearMatch[1]);
  const shortYear = year % 100; // 2025 → 25

  // Build monthly revenue data (indexes 0–11 = 1월–12월)
  const monthlyData = useMemo(() => {
    // Map month page IDs to month numbers
    const monthPageMap: Record<string, number> = {}; // pageId → month (1–12)
    page.children.forEach((childId) => {
      const child = pages[childId];
      if (!child) return;
      // Match "고객관리양식(YY년 N월)"
      const mTitle = child.title.match(
        new RegExp(`^고객관리양식\\(${shortYear}년\\s*(\\d{1,2})월\\)$`)
      );
      if (mTitle) {
        const m = parseInt(mTitle[1]);
        if (m >= 1 && m <= 12) monthPageMap[childId] = m;
      }
    });

    const revenue = new Array<number>(12).fill(0);
    customers.forEach((c) => {
      if (!c.monthPageId) return;
      const m = monthPageMap[c.monthPageId];
      if (m) revenue[m - 1] += c.total_amount ?? 0;
    });

    return revenue;
  }, [page.children, pages, customers, shortYear]);

  const maxRevenue = Math.max(...monthlyData, 1);
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
          <div className="flex items-end gap-1.5 h-36">
            {monthlyData.map((rev, idx) => {
              const pct = (rev / maxRevenue) * 100;
              const isBest = idx === bestMonthIdx && rev > 0;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 gap-1 group">
                  {/* Value label — only show when bar is tall enough */}
                  <span className="text-[9px] font-medium text-[#9b9a97] dark:text-[#6b6b6b] leading-none">
                    {rev > 0 ? `${Math.round(rev / 10000)}만` : ""}
                  </span>
                  {/* Bar */}
                  <div className="w-full flex items-end flex-1">
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: rev > 0 ? `${Math.max(pct, 4)}%` : "2px",
                        backgroundColor: isBest
                          ? "#3b82f6"
                          : rev > 0
                          ? "#93c5fd"
                          : "#e5e7eb",
                      }}
                    />
                  </div>
                  {/* Month label */}
                  <span className={`text-[9px] whitespace-nowrap ${isBest ? "font-bold text-blue-500" : "text-[#9b9a97] dark:text-[#6b6b6b]"}`}>
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
