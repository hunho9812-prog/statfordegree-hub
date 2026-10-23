"use client";

import PostEditor from "./PostEditor";
import { createPost, updatePost, PREFIXES, type BugPost } from "@/lib/db-bug-reports";

const CATEGORIES = ["", "버그", "건의", "기타"];

interface Props {
  post?: BugPost; // if editing
}

export default function BugPostEditor({ post }: Props) {
  return (
    <PostEditor
      post={post}
      basePath="/bugs"
      categories={CATEGORIES}
      prefixes={PREFIXES}
      createPost={createPost}
      updatePost={updatePost}
    />
  );
}
