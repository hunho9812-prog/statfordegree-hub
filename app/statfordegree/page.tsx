"use client";

import DashboardHub, { type DashCard } from "@/components/DashboardHub";

const DEFAULT_CARDS: DashCard[] = [
  { id: "accounting", emoji: "🧾", iconBg: "from-indigo-400 to-blue-600",   title: "회계",      href: "/accounting" },
  { id: "manual",     emoji: "📋", iconBg: "from-sky-500 to-blue-600",      title: "메뉴얼",    href: "/manual" },
  { id: "crm",        emoji: "👥", iconBg: "from-violet-400 to-purple-600", title: "고객관리",  href: "/crm" },
  { id: "keywords",   emoji: "🔑", iconBg: "from-teal-400 to-cyan-600",     title: "키워드 관리", href: "/statfordegree/keywords" },
];

// 추가할 수 있는 미리 정의된 링크 목록
const PRESET_LINKS: DashCard[] = [
  { id: "tasks",    emoji: "✅", iconBg: "from-amber-400 to-orange-500",  title: "업무 보드", href: "/tasks" },
  { id: "admin",    emoji: "⚙️", iconBg: "from-gray-400 to-slate-600",    title: "팀원관리",  href: "/admin" },
];

const STORAGE_KEY = "statfordegree_dash_cards_v2";

export default function StatfordegreePage() {
  return (
    <DashboardHub
      title="스탯포디그리"
      storageKey={STORAGE_KEY}
      defaultCards={DEFAULT_CARDS}
      presetLinks={PRESET_LINKS}
    />
  );
}
