"use client";

import PostBoard from "./PostBoard";
import { fetchPosts } from "@/lib/db-manual-posts";

export default function ManualBoard() {
  return (
    <PostBoard
      basePath="/manual"
      title="메뉴얼"
      subtitle="팀 공유 자료 및 지침"
      fetchPosts={fetchPosts}
    />
  );
}
