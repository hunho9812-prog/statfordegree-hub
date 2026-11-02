"use client";

import dynamic from "next/dynamic";

// 읽기 전용 뷰도 내부에서 tiptap으로 본문을 렌더하므로 같은 비동기 청크를 쓰게 한다.
const ManualPostView = dynamic(() => import("./ManualPostView"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#e9e9e7] border-t-blue-400 rounded-full animate-spin" />
    </div>
  ),
});

export default function ManualPostViewWrapper({ postId }: { postId: number }) {
  return <ManualPostView postId={postId} />;
}
