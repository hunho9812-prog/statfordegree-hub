"use client";

import PostView from "./PostView";
import { fetchPost, deletePost } from "@/lib/db-manual-posts";

interface Props {
  postId: number;
}

export default function ManualPostView({ postId }: Props) {
  return (
    <PostView
      postId={postId}
      basePath="/manual"
      fetchPost={fetchPost}
      deletePost={deletePost}
    />
  );
}
