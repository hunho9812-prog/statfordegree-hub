"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { VideoBlock } from "./extensions/VideoBlock";
import { ChevronLeft, Pencil, Trash2, Pin } from "lucide-react";
import { fetchPost, deletePost, type ManualPost } from "@/lib/db-manual-posts";
import { useAuth } from "./AuthProvider";

interface Props {
  postId: number;
}

export default function ManualPostView({ postId }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<ManualPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPost(postId).then((p) => { setPost(p); setLoading(false); });
  }, [postId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: true }),
      Image.configure({ inline: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      VideoBlock,
    ],
    content: "",
    editable: false,
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none focus:outline-none" },
    },
  });

  useEffect(() => {
    if (!editor || !post?.content) return;
    try {
      editor.commands.setContent(JSON.parse(post.content));
    } catch {
      editor.commands.setContent(post.content);
    }
  }, [editor, post]);

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm("이 글을 삭제하시겠습니까?")) return;
    setDeleting(true);
    const ok = await deletePost(post.id);
    if (ok) {
      router.push("/manual");
    } else {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  const canEdit = user && post && (user.id === post.author_id || profile?.role === "admin");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#9aa39b] text-[14px]">
        불러오는 중...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-[#9aa39b] text-[14px]">게시글을 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/manual")}
          className="px-4 py-2 text-[13px] border border-[#e0e4e0] rounded-md text-[#5b635c] hover:bg-[#f0f2f0] transition-colors"
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-[#e9ece9] dark:border-[#2f2f2f] flex-shrink-0">
        <button
          onClick={() => router.push("/manual")}
          className="flex items-center gap-1 text-[13px] text-[#9aa39b] hover:text-[#5b635c] dark:hover:text-[#c0c8c0] transition-colors"
        >
          <ChevronLeft size={15} />
          목록
        </button>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/manual/${post.id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-[#e0e4e0] dark:border-[#3a3a3a] rounded-md text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#f0f2f0] dark:hover:bg-[#2f2f2f] transition-colors"
            >
              <Pencil size={12} />수정
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-[#fbd5d5] dark:border-[#5a2525] rounded-md text-[#d44c47] hover:bg-[#fff0f0] dark:hover:bg-[#3a1515] transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />삭제
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-8 py-6">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-3">
          {post.is_notice && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#5e7c64] bg-[#e8f0e9] dark:bg-[rgba(94,124,100,0.15)] px-1.5 py-0.5 rounded">
              <Pin size={10} />공지
            </span>
          )}
          {post.prefix && (
            <span className="text-[11px] font-medium text-[#5e7c64] bg-[#e8f0e9] dark:bg-[rgba(94,124,100,0.15)] px-1.5 py-0.5 rounded">
              {post.prefix}
            </span>
          )}
          {post.category && (
            <span className="text-[11px] text-[#9aa39b] bg-[#f0f2f0] dark:bg-[#2a2a2a] px-1.5 py-0.5 rounded">
              {post.category}
            </span>
          )}
        </div>

        <h1 className="text-[22px] font-bold text-[#2f3430] dark:text-[#e6e6e4] mb-3 leading-snug">
          {post.title}
        </h1>

        <div className="flex items-center gap-2 text-[12px] text-[#9aa39b] mb-6 pb-4 border-b border-[#f0f2f0] dark:border-[#2a2a2a]">
          <span>{post.author_name}</span>
          <span>·</span>
          <span>{formatDate(post.created_at)}</span>
          {post.updated_at !== post.created_at && (
            <>
              <span>·</span>
              <span>수정됨 {formatDate(post.updated_at)}</span>
            </>
          )}
        </div>

        {editor && <EditorContent editor={editor} />}
      </div>
      </div>
    </div>
  );
}
