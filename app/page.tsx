"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store";
import { MENU_IDS } from "@/lib/store";

const MENU_CARDS = [
  {
    id: "manual",
    emoji: "📋",
    title: "메뉴얼",
    description: "분석 가이드, 체크리스트, 업무 문서를 정리하세요",
    href: `/p/${MENU_IDS.MANUAL}`,
    color: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
    border: "border-blue-100 dark:border-blue-900/50",
    badge: "blue",
  },
  {
    id: "crm",
    emoji: "👤",
    title: "고객관리양식",
    description: "고객 정보, 진행 상태, 후기 현황을 한눈에 관리하세요",
    href: "/crm",
    color: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
    border: "border-emerald-100 dark:border-emerald-900/50",
    badge: "emerald",
  },
  {
    id: "tax",
    emoji: "💰",
    title: "세금 메뉴얼",
    description: "세금 처리 절차와 관련 문서를 정리하세요",
    href: `/p/${MENU_IDS.TAX}`,
    color: "from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    border: "border-yellow-100 dark:border-yellow-900/50",
    badge: "yellow",
  },
  {
    id: "admatch",
    emoji: "📢",
    title: "AdMatch",
    description: "광고 매칭 관련 프로세스와 가이드라인을 관리하세요",
    href: `/p/${MENU_IDS.ADMATCH}`,
    color: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30",
    border: "border-purple-100 dark:border-purple-900/50",
    badge: "purple",
  },
  {
    id: "statgenie",
    emoji: "🤖",
    title: "스탯지니",
    description: "AI 분석 도구 사용법과 관련 문서를 정리하세요",
    href: `/p/${MENU_IDS.STATGENIE}`,
    color: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
    border: "border-rose-100 dark:border-rose-900/50",
    badge: "rose",
  },
];

const BADGE_COLORS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export default function HomePage() {
  const router = useRouter();
  const { createPage, tasks } = useWorkspaceStore();

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;

  function handleNewPage() {
    const id = createPage(null);
    router.push(`/p/${id}`);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-4xl mx-auto px-8 pt-16 pb-12">
        {/* Logo + Title */}
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
            📚
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#37352f] dark:text-[#e6e6e4] tracking-tight">
              Statfordegree Hub
            </h1>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-0.5">
              팀 지식관리 시스템
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mt-8 mb-10 flex-wrap">
          <StatChip label="진행중 업무" value={inProgressCount} color="blue" />
          <StatChip label="할 일" value={todoCount} color="orange" />
        </div>

        {/* Menu section */}
        <SectionDivider label="메뉴" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {MENU_CARDS.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className={`group flex flex-col gap-3 p-5 rounded-xl border bg-gradient-to-br ${card.color} ${card.border} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{card.emoji}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_COLORS[card.badge]}`}>
                  열기 →
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-[#37352f] dark:text-[#e6e6e4] text-base">
                  {card.title}
                </h2>
                <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <SectionDivider label="빠른 액션" />
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleNewPage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] hover:bg-[#efefed] dark:hover:bg-[#383838] text-sm text-[#37352f] dark:text-[#e6e6e4] transition-colors"
          >
            <span>✏️</span> 새 페이지 만들기
          </button>
          <Link
            href="/tasks"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] hover:bg-[#efefed] dark:hover:bg-[#383838] text-sm text-[#37352f] dark:text-[#e6e6e4] transition-colors"
          >
            <span>📋</span> 업무 보드
          </Link>
          <Link
            href="/crm"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] hover:bg-[#efefed] dark:hover:bg-[#383838] text-sm text-[#37352f] dark:text-[#e6e6e4] transition-colors"
          >
            <span>👤</span> 고객 관리
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "orange" | "green" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50",
    orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-900/50",
    green: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50",
    red: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/50",
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${colors[color]}`}>
      <span className="font-bold text-base">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#e9e9e7] dark:bg-[#2f2f2f]" />
    </div>
  );
}
