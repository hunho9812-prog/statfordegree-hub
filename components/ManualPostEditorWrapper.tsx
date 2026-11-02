"use client";

import dynamic from "next/dynamic";
import type { ManualPost } from "@/lib/db-manual-posts";

// tiptap(약 384KB)을 라우트 초기 JS에 넣지 않고 비동기 청크로 분리한다.
// 정적 import였을 때 /manual/write 초기 JS가 1,257KB(다른 페이지는 870KB)였고,
// 에디터 번들이 PageEditor 쪽과 중복으로 두 벌 생성됐다.
const ManualPostEditor = dynamic(() => import("./ManualPostEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#e9e9e7] border-t-blue-400 rounded-full animate-spin" />
        <p className="text-sm text-[#9b9a97]">에디터 불러오는 중...</p>
      </div>
    </div>
  ),
});

export default function ManualPostEditorWrapper({ post }: { post?: ManualPost }) {
  return <ManualPostEditor post={post} />;
}
