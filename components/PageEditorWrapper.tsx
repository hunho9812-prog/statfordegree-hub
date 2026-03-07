"use client";

import dynamic from "next/dynamic";

const MANUAL_PAGE_IDS = [
  "menu-manual",
  "menu-manual-analysis",
  "menu-manual-checklist",
  "menu-manual-other",
];

const PageEditor = dynamic(() => import("./PageEditor"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

const ManualEditor = dynamic(() => import("./ManualEditor"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#e9e9e7] border-t-blue-400 rounded-full animate-spin" />
        <p className="text-sm text-[#9b9a97]">불러오는 중...</p>
      </div>
    </div>
  );
}

export default function PageEditorWrapper({ pageId }: { pageId: string }) {
  if (MANUAL_PAGE_IDS.includes(pageId)) {
    return <ManualEditor pageId={pageId} />;
  }
  return <PageEditor pageId={pageId} />;
}
