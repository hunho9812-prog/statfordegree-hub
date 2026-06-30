"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useMemo } from "react";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getGreeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `좋은 아침이에요, ${name}님`;
  if (h < 18) return `안녕하세요, ${name}님`;
  return `좋은 저녁이에요, ${name}님`;
}

const SERVICES = [
  {
    id: "statfordegree",
    emoji: "📊",
    bg: "#eef2ee",
    title: "스탯포디그리",
    desc: "논문 통계분석·연구설계.",
    href: "/statfordegree",
    ready: true,
  },
  {
    id: "fluento",
    emoji: "💡",
    bg: "#f1f2f0",
    title: "플루엔토",
    desc: "교육·콘텐츠 운영.",
    href: null,
    ready: false,
  },
  {
    id: "statgenie",
    emoji: "🤖",
    bg: "#f1f2f0",
    title: "스탯지니",
    desc: "AI 통계·연구 도우미.",
    href: "/statgenie",
    ready: true,
  },
];

export default function PortalPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const { dateStr, greeting } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const day = DAYS[now.getDay()];
    const displayName =
      profile?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "팀원";
    return {
      dateStr: `${y}.${m}.${d} · ${day}`,
      greeting: getGreeting(displayName),
    };
  }, [profile, user]);

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a]">
      <div className="max-w-[920px] mx-auto px-10 py-8">

        {/* Date + Greeting */}
        <p className="text-[12px] font-semibold text-[#9aa39b] tracking-[0.02em]">
          {dateStr}
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-[-0.03em] text-[#22271f] dark:text-[#e8ebe8] leading-tight">
          {greeting}
        </h1>
        <p className="mt-2 mb-6 text-[14px] text-[#6b736b] leading-relaxed">
          킴퍼블리가 운영하는 서비스와 고객 관리를 한 곳에서 모아봅니다.
        </p>

        {/* Services label */}
        <p className="text-[11px] font-bold text-[#6b736b] tracking-[0.04em] uppercase mb-3">
          Services
        </p>

        {/* Service cards */}
        <div className="grid grid-cols-3 gap-3">
          {SERVICES.map((svc) => (
            <button
              key={svc.id}
              onClick={() => {
                if (svc.href) router.push(svc.href);
                else alert(`${svc.title}: 준비 중입니다.`);
              }}
              className="group border border-[#e9ece9] dark:border-[#2f2f2f] rounded-[12px] p-4 bg-white dark:bg-[#222] text-left transition-all duration-150 hover:shadow-md hover:-translate-y-px"
              style={{ opacity: svc.ready ? 1 : 0.7 }}
            >
              <div className="flex justify-between items-start">
                <div
                  className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center text-[20px]"
                  style={{ background: svc.bg }}
                >
                  {svc.emoji}
                </div>
                {svc.ready ? (
                  <span className="w-[7px] h-[7px] rounded-full bg-[#5e7c64] mt-1 inline-block" />
                ) : (
                  <span className="text-[10px] text-[#9aa39b] mt-1">준비 중</span>
                )}
              </div>
              <p className="mt-3 text-[13.5px] font-bold text-[#22271f] dark:text-[#e8ebe8]">
                {svc.title}
              </p>
              <p className="mt-1 text-[12px] text-[#8b938b] leading-relaxed">
                {svc.desc}
              </p>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
