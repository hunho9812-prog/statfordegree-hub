"use client";

import PostEditor from "./PostEditor";
import { createPost, updatePost, PREFIXES, type ManualPost } from "@/lib/db-manual-posts";

const CATEGORIES = ["", "메뉴얼", "운영", "기타"];

interface Props {
  post?: ManualPost; // if editing
}

export default function ManualPostEditor({ post }: Props) {
  return (
    <PostEditor
      post={post}
      basePath="/manual"
      categories={CATEGORIES}
      prefixes={PREFIXES}
      createPost={createPost}
      updatePost={updatePost}
    />
  );
}
