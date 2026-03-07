"use client";

import dynamic from "next/dynamic";

const CRMPage = dynamic(() => import("./CRMPage"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#191919]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#e9e9e7] border-t-blue-400 rounded-full animate-spin" />
        <p className="text-sm text-[#9b9a97]">불러오는 중...</p>
      </div>
    </div>
  ),
});

export default function CRMPageWrapper() {
  return <CRMPage />;
}
