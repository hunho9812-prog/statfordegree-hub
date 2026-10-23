"use client";

import PostBoard from "./PostBoard";
import { fetchPosts } from "@/lib/db-bug-reports";

export default function BugBoard() {
  return (
    <PostBoard
      basePath="/bugs"
      title="버그 신고 / 건의사항"
      subtitle="발견한 버그나 개선 아이디어를 남겨주세요"
      fetchPosts={fetchPosts}
    />
  );
}
