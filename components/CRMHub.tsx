"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronRight, Users, Trash2, X, AlertTriangle } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function getMonthNum(title: string): number {
  return parseInt(title.match(/^(\d{1,2})월$/)?.[1] ?? "0");
}

// ─── 삭제 확인 모달 ────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">{title}</h3>
            <p className="text-sm text-[#9b9a97] mt-1">{description}</p>
          </div>
        </div>
        <p className="text-xs text-red-500 dark:text-red-400 mb-4">
          삭제된 데이터는 복구할 수 없습니다.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-sm rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CRMHub ────────────────────────────────────────────────────────────────────

export default function CRMHub() {
  const router = useRouter();
  const { pages, createPage, updatePage, deletePage } = useWorkspaceStore();

  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set());
  const [showYearInput, setShowYearInput] = useState(false);
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));

  // 삭제 확인 모달
  const [deleteModal, setDeleteModal] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // 년도 페이지 목록 (최신순)
  const yearPages = useMemo(() => {
    return Object.values(pages)
      .filter((p) => /^(\d{4})년/.test(p.title))
      .sort((a, b) => {
        const aY = parseInt(a.title.match(/^(\d{4})/)?.[1] ?? "0");
        const bY = parseInt(b.title.match(/^(\d{4})/)?.[1] ?? "0");
        return bY - aY;
      });
  }, [pages]);

  // yearPageId 아래에서 월번호 → 페이지ID 매핑
  const getMonthMap = (yearPageId: string): Record<number, string> => {
    const map: Record<number, string> = {};
    pages[yearPageId]?.children.forEach((id) => {
      const child = pages[id];
      if (!child) return;
      const m = getMonthNum(child.title);
      if (m >= 1 && m <= 12) map[m] = id;
    });
    return map;
  };

  // 월 클릭: 없으면 생성 후 이동, 있으면 바로 이동
  const handleMonthClick = (yearPageId: string, monthNum: number) => {
    const monthMap = getMonthMap(yearPageId);
    const existingId = monthMap[monthNum];
    if (existingId) {
      router.push(`/p/${existingId}`);
      return;
    }
    const id = createPage(yearPageId);
    updatePage(id, { title: `${monthNum}월`, emoji: "📋" });
    router.push(`/p/${id}`);
  };

  // 년도 추가
  const handleAddYear = () => {
    const y = parseInt(yearInput.trim());
    if (!y || y < 2000 || y > 2100) return;
    const title = `${y}년 고객관리양식`;
    const already = Object.values(pages).find((p) => p.title === title);
    if (already) {
      setExpandedYears((prev) => new Set([...prev, already.id]));
      setShowYearInput(false);
      return;
    }
    const id = createPage(null);
    updatePage(id, { title, emoji: "📅" });
    setShowYearInput(false);
    setExpandedYears((prev) => new Set([...prev, id]));
  };

  // 년도 삭제 확인
  const handleDeleteYear = (yearPage: { id: string; title: string }) => {
    const yearNum = yearPage.title.match(/^(\d{4})/)?.[1] ?? "";
    const monthCount = Object.keys(getMonthMap(yearPage.id)).length;
    setDeleteModal({
      title: `${yearNum}년 삭제`,
      description: monthCount > 0
        ? `${yearNum}년 데이터와 하위 ${monthCount}개 월 페이지(고객 데이터 포함)가 모두 삭제됩니다.`
        : `${yearNum}년 데이터가 삭제됩니다.`,
      onConfirm: () => {
        deletePage(yearPage.id);
        setExpandedYears((prev) => {
          const next = new Set(prev);
          next.delete(yearPage.id);
          return next;
        });
        setDeleteModal(null);
      },
    });
  };

  // 월 삭제 확인
  const handleDeleteMonth = (monthPageId: string, monthTitle: string, yearNum: string) => {
    setDeleteModal({
      title: `${yearNum}년 ${monthTitle} 삭제`,
      description: `${monthTitle} 고객관리 페이지와 해당 월의 데이터가 모두 삭제됩니다.`,
      onConfirm: () => {
        deletePage(monthPageId);
        setDeleteModal(null);
      },
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-16 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users size={32} className="text-[#37352f] dark:text-[#e6e6e4]" />
              <h1 className="text-4xl font-bold text-[#37352f] dark:text-[#e6e6e4]">
                고객관리양식
              </h1>
            </div>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b]">
              년도를 펼친 뒤 월을 클릭하면 해당 월 고객관리 페이지로 이동합니다.
            </p>
          </div>
          <button
            onClick={() => setShowYearInput((v) => !v)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] hover:opacity-80 transition-opacity"
          >
            <Plus size={13} />
            년도 추가
          </button>
        </div>

        {/* Year input */}
        {showYearInput && (
          <div className="mb-6 flex gap-2">
            <input
              type="number"
              autoFocus
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddYear();
                if (e.key === "Escape") setShowYearInput(false);
              }}
              placeholder="년도 입력 (예: 2026)"
              className="flex-1 px-3 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-sm text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400"
            />
            <button
              onClick={handleAddYear}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
            >
              추가
            </button>
            <button
              onClick={() => setShowYearInput(false)}
              className="px-4 py-2 rounded-lg text-sm text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors"
            >
              취소
            </button>
          </div>
        )}

        {/* Year list */}
        {yearPages.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-dashed border-[#e9e9e7] dark:border-[#3a3a3a]">
            <p className="text-[#9b9a97] dark:text-[#6b6b6b] text-base">
              아직 년도 페이지가 없습니다.
            </p>
            <p className="text-sm text-[#c4c3bf] dark:text-[#4f4f4f] mt-1">
              상단의 '년도 추가' 버튼을 눌러 시작하세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {yearPages.map((yearPage) => {
              const yearNum = yearPage.title.match(/^(\d{4})/)?.[1] ?? "";
              const monthMap = getMonthMap(yearPage.id);
              const existingCount = Object.keys(monthMap).length;
              const expanded = expandedYears.has(yearPage.id);

              return (
                <div
                  key={yearPage.id}
                  className="rounded-xl border border-[#e9e9e7] dark:border-[#3a3a3a] overflow-hidden"
                >
                  {/* Year header */}
                  <div className="flex items-center bg-[#fafaf9] dark:bg-[#1e1e1e] hover:bg-[#f1f1ef] dark:hover:bg-[#252525] transition-colors group">
                    <button
                      onClick={() => toggleExpand(yearPage.id)}
                      className="flex-1 flex items-center gap-3 px-5 py-4 text-left"
                    >
                      <span className="text-xl leading-none">{yearPage.emoji || "📅"}</span>
                      <span className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                        {yearNum}년
                      </span>
                      {existingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                          {existingCount}개월
                        </span>
                      )}
                      {expanded
                        ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                        : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />
                      }
                    </button>
                    {/* 년도 삭제 버튼 (hover 시 표시) */}
                    <button
                      onClick={() => handleDeleteYear(yearPage)}
                      title={`${yearNum}년 삭제`}
                      className="mr-3 p-1.5 rounded text-[#c4c3bf] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Month grid */}
                  {expanded && (
                    <div className="grid grid-cols-4 gap-2 p-4 bg-white dark:bg-[#191919]">
                      {MONTH_NAMES.map((name, i) => {
                        const monthNum = i + 1;
                        const monthPageId = monthMap[monthNum];
                        const exists = !!monthPageId;
                        return (
                          <div key={name} className="relative group/month">
                            <button
                              onClick={() => handleMonthClick(yearPage.id, monthNum)}
                              className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
                                exists
                                  ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                                  : "bg-[#f1f1ef] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] hover:bg-[#37352f] hover:text-white dark:hover:bg-[#e6e6e4] dark:hover:text-[#191919]"
                              }`}
                            >
                              {name}
                            </button>
                            {/* 월 삭제 버튼 (생성된 월에만, hover 시 표시) */}
                            {exists && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMonth(monthPageId, name, yearNum);
                                }}
                                title={`${yearNum}년 ${name} 삭제`}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-400 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/month:opacity-100 transition-opacity shadow-sm"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteModal && (
        <DeleteConfirmModal
          title={deleteModal.title}
          description={deleteModal.description}
          onConfirm={deleteModal.onConfirm}
          onCancel={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
