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
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] flex flex-col items-center justify-center px-8 py-10">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center">
        <p className="text-[11px] font-semibold text-[#9aa39b] tracking-[0.02em] mb-2">
          {dateStr}
        </p>
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-[#22271f] dark:text-[#e8ebe8]">
          {greeting}
        </h1>
        <p className="mt-1 text-[13px] text-[#6b736b]">
          킴퍼블리가 운영하는 서비스와 고객 관리를 한 곳에서 모아봅니다.
        </p>
      </div>

      {/* Service cards */}
      <div className="w-full max-w-3xl">
        <p className="text-[10px] font-bold text-[#9aa39b] tracking-[0.06em] uppercase mb-3">
          Services
        </p>
        <div className="grid grid-cols-3 gap-4">
          {SERVICES.map((svc) => (
            <button
              key={svc.id}
              onClick={() => {
                if (svc.href) router.push(svc.href);
                else alert(`${svc.title}: 준비 중입니다.`);
              }}
              className="border border-[#e9ece9] dark:border-[#2f2f2f] rounded-2xl p-7 bg-white dark:bg-[#222] text-left transition-all duration-150 hover:shadow-md hover:-translate-y-px"
              style={{ opacity: svc.ready ? 1 : 0.65 }}
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                  style={{ background: svc.bg }}
                >
                  {svc.emoji}
                </div>
                {svc.ready ? (
                  <span className="w-2 h-2 rounded-full bg-[#5e7c64] inline-block mt-1" />
                ) : (
                  <span className="text-[10px] text-[#9aa39b]">준비 중</span>
                )}
              </div>
              <p className="text-[15px] font-bold text-[#22271f] dark:text-[#e8ebe8]">
                {svc.title}
              </p>
              <p className="mt-1.5 text-[13px] text-[#8b938b] leading-relaxed">
                {svc.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
