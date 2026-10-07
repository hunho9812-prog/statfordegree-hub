"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface HubCard {
  id: string;
  emoji: string;
  iconBg: string;
  title: string;
  desc: string;
  href: string;
}

const CARDS: HubCard[] = [
  { id: "ledger", emoji: "📒", iconBg: "from-green-400 to-emerald-600",  title: "장부",          desc: "월별 매출·비용 장부",        href: "/fluento/ledger" },
  { id: "crm",    emoji: "👥", iconBg: "from-violet-400 to-purple-600", title: "고객관리양식",  desc: "연도·월별 플루엔토 고객관리", href: "/fluento/crm" },
  { id: "cost",   emoji: "💸", iconBg: "from-teal-400 to-cyan-600",     title: "투자비용·손익분기", desc: "투자비용과 손익분기 달성률", href: "/fluento/cost" },
];

export default function FluentoHubPage() {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="px-8 pt-6 pb-0">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
          >
            <ArrowLeft size={14} /> 홈
          </button>
          <h1 className="text-xl font-bold">
            💡 <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">플루엔토</span>
          </h1>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-8 py-8">
        <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => router.push(card.href)}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all min-h-[140px] p-5"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-2xl shadow-sm`}>
                {card.emoji}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">{card.title}</p>
                <p className="text-xs text-[#9b9a97] mt-0.5">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
