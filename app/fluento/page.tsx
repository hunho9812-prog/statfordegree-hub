"use client";

import DashboardHub, { type DashCard } from "@/components/DashboardHub";

const DEFAULT_CARDS: DashCard[] = [
  { id: "accounting", emoji: "🧾", iconBg: "from-indigo-400 to-blue-600",  title: "회계",     href: "/fluento/accounting" },
  { id: "crm",        emoji: "👥", iconBg: "from-teal-400 to-emerald-600", title: "고객관리", href: "/fluento/crm" },
];

// v1 → v2: 기본 카드를 (장부/계산기/고객관리양식) 3개에서 스탯포디그리와 동일한
// (회계/고객관리) 2개 구성으로 정리하면서 저장 키를 올려, 이미 v1을 저장해둔 브라우저도
// 새 기본값을 그대로 받도록 함(장부·계산기 페이지 자체는 삭제하지 않고 /fluento/accounting 아래로 이동).
const STORAGE_KEY = "fluento_dash_cards_v2";

export default function FluentoHubPage() {
  return (
    <DashboardHub
      title="플루엔토"
      storageKey={STORAGE_KEY}
      defaultCards={DEFAULT_CARDS}
    />
  );
}
