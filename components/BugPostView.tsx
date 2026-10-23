"use client";

import PostView from "./PostView";
import { fetchPost, deletePost } from "@/lib/db-bug-reports";

interface Props {
  postId: number;
}

export default function BugPostView({ postId }: Props) {
  return (
    <PostView
      postId={postId}
      basePath="/bugs"
      fetchPost={fetchPost}
      deletePost={deletePost}
    />
  );
}
