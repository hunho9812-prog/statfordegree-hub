"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import BugPostEditor from "@/components/BugPostEditor";
import { fetchPost, type BugPost } from "@/lib/db-bug-reports";

export default function BugEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const [post, setPost] = useState<BugPost | null | undefined>(undefined);

  useEffect(() => {
    fetchPost(id).then(setPost);
  }, [id]);

  if (post === undefined) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>;
  }
  if (!post) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">게시글을 찾을 수 없습니다.</div>;
  }

  return <BugPostEditor post={post} />;
}
