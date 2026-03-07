"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CalendarDays, ChevronRight } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function getMonthNum(title: string): number {
  return parseInt(title.match(/(\d{1,2})월$/)?.[1] ?? "0");
}

export default function MonthPageManager({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { pages, createPage, updatePage, deletePage } = useWorkspaceStore();
  const page = pages[pageId];

  const [showPicker, setShowPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Only render for year pages (title starts with "YYYY년")
  const yearMatch = page?.title.match(/^(\d{4})년/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

  // Sorted month-page children of this year page
  const monthPages = useMemo(() => {
    const monthPattern = new RegExp(`^${year}년\\s*\\d{1,2}월$`);
    return page.children
      .map((id) => pages[id])
      .filter(Boolean)
      .filter((p) => monthPattern.test(p.title))
      .sort((a, b) => getMonthNum(a.title) - getMonthNum(b.title));
  }, [page.children, pages, year]);

  const existingMonthNums = new Set(monthPages.map((p) => getMonthNum(p.title)));
  const availableMonths = MONTH_NAMES.filter((_, i) => !existingMonthNums.has(i + 1));

  const handleAddMonth = (monthNum: number) => {
    const title = `${year}년 ${monthNum}월`;
    const id = createPage(pageId);
    updatePage(id, { title, emoji: "📄" });

    // Re-sort parent's children by month number immediately after store settles
    setTimeout(() => {
      const state = useWorkspaceStore.getState();
      const current = state.pages[pageId];
      if (!current) return;
      const sorted = [...current.children].sort((a, b) => {
        const pa = state.pages[a];
        const pb = state.pages[b];
        const aM = getMonthNum(pa?.title ?? "");
        const bM = getMonthNum(pb?.title ?? "");
        // Non-month children sort to the end
        return (aM || 999) - (bM || 999);
      });
      state.updatePage(pageId, { children: sorted });
    }, 0);

    setShowPicker(false);
    router.push(`/p/${id}`);
  };

  const handleDelete = (id: string) => {
    deletePage(id);
    setConfirmDeleteId(null);
  };

  return (
    <>
      {/* Month management panel */}
      <div className="mb-8 rounded-xl border border-[#e9e9e7] dark:border-[#3a3a3a] bg-[#fafaf9] dark:bg-[#1e1e1e] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e9e9e7] dark:border-[#3a3a3a]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
            <CalendarDays size={15} className="text-gray-400 dark:text-gray-500" />
            월 목록
          </div>
          <button
            onClick={() => setShowPicker(true)}
            disabled={availableMonths.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Plus size={13} />
            월 추가
          </button>
        </div>

        {/* Month list */}
        {monthPages.length === 0 ? (
          <p className="px-4 py-5 text-sm text-[#9b9a97] dark:text-[#6b6b6b] text-center">
            아직 월 페이지가 없습니다. '월 추가'를 눌러 생성하세요.
          </p>
        ) : (
          <ul className="divide-y divide-[#f0efed] dark:divide-[#2f2f2f]">
            {monthPages.map((p) => (
              <li key={p.id} className="group flex items-center justify-between px-4 py-2.5 hover:bg-[#f1f1ef] dark:hover:bg-[#252525] transition-colors">
                <button
                  onClick={() => router.push(`/p/${p.id}`)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <span className="text-base leading-none">{p.emoji || "📄"}</span>
                  <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] font-medium truncate">
                    {p.title}
                  </span>
                  <ChevronRight
                    size={13}
                    className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(p.id)}
                  className="ml-2 p-1.5 rounded-md text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title={`${p.title} 삭제`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Month picker modal */}
      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/20 dark:bg-black/40 backdrop-blur-[1px]"
            onClick={() => setShowPicker(false)}
          />
          <div className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-2xl shadow-2xl p-5">
            <h3 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-4">
              추가할 월을 선택하세요
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {MONTH_NAMES.map((name, i) => {
                const monthNum = i + 1;
                const exists = existingMonthNums.has(monthNum);
                return (
                  <button
                    key={name}
                    onClick={() => !exists && handleAddMonth(monthNum)}
                    disabled={exists}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      exists
                        ? "bg-gray-100 dark:bg-[#2a2a2a] text-gray-300 dark:text-gray-600 cursor-not-allowed line-through"
                        : "bg-[#f1f1ef] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] hover:bg-[#37352f] hover:text-white dark:hover:bg-[#e6e6e4] dark:hover:text-[#191919]"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-4 w-full py-2 text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors"
            >
              취소
            </button>
          </div>
        </>
      )}

      {/* Delete confirm dialog */}
      {confirmDeleteId && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/20 dark:bg-black/40 backdrop-blur-[1px]"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-2xl shadow-2xl p-5">
            <h3 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-2">
              페이지 삭제
            </h3>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mb-5">
              <span className="font-medium text-[#37352f] dark:text-[#e6e6e4]">
                {pages[confirmDeleteId]?.title}
              </span>{" "}
              페이지를 삭제하면 내부 데이터도 모두 삭제됩니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
