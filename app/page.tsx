"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const SERVICES = [
  {
    id: "statfordegree",
    emoji: "📊",
    iconBg: "from-orange-400 to-rose-500",
    shadow: "shadow-orange-200 dark:shadow-orange-900/30",
    title: "스탯포디그리",
    description: "논문 통계분석, 연구설계, 데이터 분석 서비스",
    href: "/statfordegree",
    ready: true,
  },
  {
    id: "fluento",
    emoji: "💡",
    iconBg: "from-green-400 to-emerald-500",
    shadow: "shadow-green-200 dark:shadow-green-900/30",
    title: "플루엔토",
    description: "교육 및 콘텐츠 운영 시스템",
    href: null,
    ready: false,
  },
  {
    id: "statgenie",
    emoji: "🤖",
    iconBg: "from-yellow-400 to-amber-500",
    shadow: "shadow-yellow-200 dark:shadow-yellow-900/30",
    title: "스탯지니",
    description: "AI 기반 통계 및 연구 지원 시스템",
    href: null,
    ready: false,
  },
];

function DeniedBanner() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get("denied") === "accounting") {
      setShow(true);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3">
      <span>회계 페이지에 접근 권한이 없습니다. 관리자에게 문의하세요.</span>
      <button onClick={() => setShow(false)} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
    </div>
  );
}

export default function PortalPage() {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
            워코라
          </h1>
          <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-1">
            운영 중인 서비스들을 한 곳에서 관리하는 통합 포털
          </p>
        </div>

        <Suspense fallback={null}>
          <DeniedBanner />
        </Suspense>

        {/* Service cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          {SERVICES.map((svc) => (
            <button
              key={svc.id}
              onClick={() => {
                if (svc.href) {
                  router.push(svc.href);
                } else {
                  alert(`${svc.title}: 준비 중입니다.`);
                }
              }}
              className={`group bg-white dark:bg-[#252525] rounded-2xl p-7 border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col items-center gap-4 text-center ${
                !svc.ready ? "opacity-70" : ""
              }`}
            >
              <div
                className={`w-[84px] h-[84px] rounded-[22px] bg-gradient-to-br ${svc.iconBg} flex items-center justify-center text-4xl shadow-lg ${svc.shadow}`}
              >
                {svc.emoji}
              </div>
              <div>
                <p className="font-semibold text-[#37352f] dark:text-[#e6e6e4] text-base">
                  {svc.title}
                </p>
                {!svc.ready && (
                  <span className="mt-1 inline-block text-xs text-[#9b9a97] dark:text-[#6b6b6b]">
                    준비 중
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#9b9a97] dark:text-[#6b6b6b]">
          © 2026 워코라
        </div>
      </div>
    </div>
  );
}
