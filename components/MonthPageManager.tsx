"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, X, AlertTriangle } from "lucide-react";
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
  const { pages, createPage, updatePage, deletePage } = useWorkspaceStore();
  const page = pages[pageId];

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string; title: string;
  } | null>(null);

  const yearMatch = page?.title.match(/^(\d{4})년/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

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
    const id = createPage(pageId);
    updatePage(id, { title: `${monthNum}월`, emoji: "📋" });
    router.push(`/p/${id}`);
  };

  return (
    <>
      <div className="mb-8 rounded-xl border border-[#e9e9e7] dark:border-[#3a3a3a] bg-[#fafaf9] dark:bg-[#1e1e1e] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e9e9e7] dark:border-[#3a3a3a] text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
          <CalendarDays size={15} className="text-gray-400 dark:text-gray-500" />
          {year}년 월별 페이지
        </div>

        <div className="grid grid-cols-4 gap-2 p-4">
          {MONTH_NAMES.map((name, i) => {
            const monthNum = i + 1;
            const monthPageId = monthPageMap[monthNum];
            const exists = !!monthPageId;
            return (
              <div key={name} className="relative group/month">
                <button
                  onClick={() => handleMonthClick(monthNum)}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
                    exists
                      ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                      : "bg-[#f1f1ef] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] hover:bg-[#37352f] hover:text-white dark:hover:bg-[#e6e6e4] dark:hover:text-[#191919]"
                  }`}
                >
                  {name}
                </button>
                {exists && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: monthPageId, title: name });
                    }}
                    title={`${year}년 ${name} 삭제`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-400 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/month:opacity-100 transition-opacity shadow-sm"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 월 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                  {year}년 {deleteTarget.title} 삭제
                </h3>
                <p className="text-sm text-[#9b9a97] mt-1">
                  해당 월의 고객관리 페이지와 모든 고객 데이터가 삭제됩니다.
                </p>
              </div>
            </div>
            <p className="text-xs text-red-500 dark:text-red-400 mb-4">
              삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deletePage(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-2 text-sm rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
