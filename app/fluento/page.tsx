"use client";

import DashboardHub, { type DashCard } from "@/components/DashboardHub";

const DEFAULT_CARDS: DashCard[] = [
  { id: "ledger",     emoji: "📒", iconBg: "from-green-400 to-emerald-600", title: "플루엔토 장부",     href: "/fluento/ledger" },
  { id: "calculator", emoji: "🧮", iconBg: "from-lime-400 to-green-600",    title: "플루엔토 계산기",   href: "/fluento/calculator" },
  { id: "crm",        emoji: "👥", iconBg: "from-teal-400 to-emerald-600",  title: "플루엔토 고객관리양식", href: "/fluento/crm" },
];

const STORAGE_KEY = "fluento_dash_cards_v1";

export default function FluentoHubPage() {
  return (
    <DashboardHub
      title="플루엔토"
      storageKey={STORAGE_KEY}
      defaultCards={DEFAULT_CARDS}
    />
  );
}
