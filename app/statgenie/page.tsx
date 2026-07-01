"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Bell } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const TOOLS = [
  {
    id: "sobel",
    icon: "💡",
    title: "소벨 테스트",
    desc: "매개효과의 통계적 유의성을 검증합니다. 간접효과의 표준오차를 계산하여 Z-값과 p-값을 산출합니다.",
    tags: ["매개효과 분석", "간접효과 검증"],
    href: null,
  },
  {
    id: "ave-cr",
    icon: "💡",
    title: "AVE, CR 계산기",
    desc: "평균분산추출(AVE)과 복합신뢰도(CR)를 계산합니다. 구성개념의 수렴타당성과 내적일관성을 평가할 수 있습니다.",
    tags: ["수렴타당성", "복합신뢰도"],
    href: null,
  },
  {
    id: "effect-size",
    icon: "💡",
    title: "효과크기 계산기",
    desc: "두 집단 간 평균 차이의 효과 크기를 계산합니다. Cohen's d와 Hedges' g를 통해 실질적 유의성을 평가할 수 있습니다.",
    tags: ["Cohen's d", "Hedges' g"],
    href: null,
  },
];

const NAV_TABS = ["데이터 가공", "표 제작", "고객지원"];

export default function StatGeniePage() {
  const router = useRouter();
  const { profile } = useAuth();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fffbf0]">

      {/* Top header bar */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#f5a623] to-[#f7b731] px-6 py-3 flex items-center gap-4 shadow-sm">
        {/* Logo */}
        <button onClick={() => router.push("/")} className="flex items-center gap-3 mr-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
            💡
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-[15px] leading-tight">스탯지니</p>
            <p className="text-white/70 text-[10px] leading-tight">Statistical Analysis Tools</p>
          </div>
        </button>

        {/* Nav tabs */}
        <div className="flex items-center gap-2">
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[13px] font-medium transition-colors flex items-center gap-1.5"
            >
              <span className="text-[11px]">{tab === "데이터 가공" ? "📊" : tab === "표 제작" ? "📋" : "💬"}</span>
              {tab}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Ledger link */}
          <button
            onClick={() => router.push("/statgenie/ledger")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[13px] font-medium transition-colors"
          >
            <BookOpen size={14} /> 장부
          </button>

          {/* Notification */}
          <button className="relative w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <Bell size={15} className="text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">4</span>
          </button>

          {/* User */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#f5a623] text-[13px] font-bold hover:bg-white/90 transition-colors">
            {profile?.name?.split(" ")[0] ?? "Admin"} ▾
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="flex-shrink-0 text-center py-4">
        <p className="text-[14px] text-[#c88a00]">
          연구에 필요한 통계 분석을 쉽고 빠르게 수행할 수 있습니다
        </p>
      </div>

      {/* Tool cards */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <div
              key={tool.id}
              className="bg-white rounded-2xl border border-[#f0e6c8] p-6 flex flex-col shadow-sm"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#fff8e6] flex items-center justify-center text-3xl mb-4 mx-auto">
                {tool.icon}
              </div>

              {/* Title */}
              <h2 className="text-[18px] font-bold text-[#22271f] text-center mb-3">
                {tool.title}
              </h2>

              {/* Description */}
              <p className="text-[13px] text-[#c88a00] text-center leading-relaxed mb-4 flex-1">
                {tool.desc}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 justify-center mb-5">
                {tool.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full border border-[#f5a623] text-[#f5a623] text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA button */}
              <button
                onClick={() => tool.href ? router.push(tool.href) : alert("준비 중입니다.")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f5a623] to-[#f7b731] text-white font-bold text-[14px] hover:opacity-90 transition-opacity"
              >
                {tool.title} 시작하기 →
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
