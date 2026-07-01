"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const CARDS = [
  { emoji: "📊", iconBg: "from-indigo-400 to-blue-600",   title: "통계",    href: "/accounting/stats" },
  { emoji: "🔄", iconBg: "from-blue-400 to-indigo-500",   title: "자동이체", href: "/accounting/transfer" },
  { emoji: "👷", iconBg: "from-cyan-400 to-sky-500",      title: "인건비",  href: "/accounting/payroll" },
  { emoji: "📒", iconBg: "from-green-400 to-emerald-500", title: "장부",    href: "/accounting/ledger" },
];

export default function AccountingPage() {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="px-8 pt-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/statfordegree")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
          >
            <ArrowLeft size={14} /> 스탯포디그리
          </button>
          <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">회계</h1>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-xl grid grid-cols-2 gap-4">
          {CARDS.map((card) => (
            <button
              key={card.href}
              onClick={() => router.push(card.href)}
              className="group bg-white dark:bg-[#252525] rounded-2xl p-6 border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col items-center gap-3 text-center"
            >
              <div className={`w-[68px] h-[68px] rounded-[18px] bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-3xl shadow-md`}>
                {card.emoji}
              </div>
              <p className="font-medium text-sm text-[#37352f] dark:text-[#e6e6e4]">{card.title}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
