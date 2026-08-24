"use client";

import dynamic from "next/dynamic";

const CRMHub = dynamic(() => import("./CRMHub"), {
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

// 스탯포디그리의 /crm(CRMPageWrapper)과 완전히 독립된 고객 데이터를 쓰는 플루엔토 전용 고객관리.
// idPrefix가 다르면 CRMHub가 페이지 ID 네임스페이스로 데이터를 분리하므로 컴포넌트 자체는 동일.
export default function FluentoCRMWrapper() {
  return (
    <CRMHub
      idPrefix="fluento-crm"
      heading="플루엔토 고객관리양식"
      yearTitleSuffix="플루엔토 고객관리"
    />
  );
}
