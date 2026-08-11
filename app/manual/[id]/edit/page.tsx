"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ManualPostEditor from "@/components/ManualPostEditor";
import { fetchPost, type ManualPost } from "@/lib/db-manual-posts";

export default function ManualEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const [post, setPost] = useState<ManualPost | null | undefined>(undefined);

  useEffect(() => {
    fetchPost(id).then(setPost);
  }, [id]);

  if (post === undefined) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>;
  }
  if (!post) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">게시글을 찾을 수 없습니다.</div>;
  }

  return <ManualPostEditor post={post} />;
}
