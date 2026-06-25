"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useWorkspaceStore, MENU_IDS } from "@/lib/store";

const MENU_CARDS = [
  {
    id: "stats",
    emoji: "📊",
    iconBg: "from-indigo-400 to-blue-600",
    shadow: "shadow-indigo-200 dark:shadow-indigo-900/30",
    title: "통계",
    description: "매출·비용·순이익 그래프",
    href: "/stats",
  },
  {
    id: "transfer",
    emoji: "🔄",
    iconBg: "from-blue-400 to-indigo-500",
    shadow: "shadow-blue-200 dark:shadow-blue-900/30",
    title: "자동이체",
    description: "자동이체 내역 관리",
    href: "/transfer",
  },
  {
    id: "payroll",
    emoji: "👷",
    iconBg: "from-cyan-400 to-sky-500",
    shadow: "shadow-cyan-200 dark:shadow-cyan-900/30",
    title: "인건비",
    description: "인건비 지출 관리",
    href: "/payroll",
  },
  {
    id: "ledger",
    emoji: "📒",
    iconBg: "from-green-400 to-emerald-500",
    shadow: "shadow-green-200 dark:shadow-green-900/30",
    title: "장부",
    description: "수입/지출 장부",
    href: "/ledger",
  },
  {
    id: "manual",
    emoji: "📋",
    iconBg: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-200 dark:shadow-sky-900/30",
    title: "메뉴얼",
    description: "분석 가이드 문서",
    href: `/p/${MENU_IDS.MANUAL}`,
  },
  {
    id: "crm",
    emoji: "👥",
    iconBg: "from-violet-400 to-purple-600",
    shadow: "shadow-violet-200 dark:shadow-violet-900/30",
    title: "고객관리",
    description: "고객 정보 및 현황",
    href: "/crm",
  },
];

export default function StatfordegreePage() {
  const router = useRouter();
  const { loadFromSupabase, isRefreshing } = useWorkspaceStore();

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
            >
              <ArrowLeft size={14} />
              홈
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">
              스탯포디그리
            </h1>
          </div>
          <button
            onClick={() => loadFromSupabase()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Menu cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {MENU_CARDS.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group bg-white dark:bg-[#252525] rounded-2xl p-5 border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col items-center gap-3 text-center"
            >
              <div
                className={`w-[68px] h-[68px] rounded-[18px] bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-3xl shadow-md ${card.shadow}`}
              >
                {card.emoji}
              </div>
              <p className="font-medium text-sm text-[#37352f] dark:text-[#e6e6e4]">
                {card.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
