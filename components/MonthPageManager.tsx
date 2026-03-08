"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function getMonthNum(title: string): number {
  return parseInt(title.match(/^(\d{1,2})월$/)?.[1] ?? "0");
}

export default function MonthPageManager({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { pages, createPage, updatePage } = useWorkspaceStore();
  const page = pages[pageId];

  // Only render for year pages (title starts with "YYYY년")
  const yearMatch = page?.title.match(/^(\d{4})년/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

  // Map month number → child page ID for already-existing month pages
  const monthPageMap = useMemo(() => {
    const map: Record<number, string> = {};
    page.children.forEach((id) => {
      const child = pages[id];
      if (!child) return;
      const m = getMonthNum(child.title);
      if (m >= 1 && m <= 12) map[m] = id;
    });
    return map;
  }, [page.children, pages]);

  const handleMonthClick = (monthNum: number) => {
    const existingId = monthPageMap[monthNum];
    if (existingId) {
      router.push(`/p/${existingId}`);
      return;
    }
    // Auto-create the month page under this year page
    const id = createPage(pageId);
    updatePage(id, { title: `${monthNum}월`, emoji: "📋" });
    router.push(`/p/${id}`);
  };

  return (
    <div className="mb-8 rounded-xl border border-[#e9e9e7] dark:border-[#3a3a3a] bg-[#fafaf9] dark:bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e9e9e7] dark:border-[#3a3a3a] text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
        <CalendarDays size={15} className="text-gray-400 dark:text-gray-500" />
        {year}년 월별 페이지
      </div>

      {/* 4-column month grid — blue = page exists, gray = auto-create on click */}
      <div className="grid grid-cols-4 gap-2 p-4">
        {MONTH_NAMES.map((name, i) => {
          const monthNum = i + 1;
          const exists = monthNum in monthPageMap;
          return (
            <button
              key={name}
              onClick={() => handleMonthClick(monthNum)}
              className={`py-3 rounded-lg text-sm font-medium transition-all ${
                exists
                  ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                  : "bg-[#f1f1ef] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] hover:bg-[#37352f] hover:text-white dark:hover:bg-[#e6e6e4] dark:hover:text-[#191919]"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
