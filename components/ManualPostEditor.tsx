"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { VideoBlock } from "./extensions/VideoBlock";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
  Undo, Redo, Paperclip, Loader2, Link as LinkIcon,
} from "lucide-react";
import { createPost, updatePost, PREFIXES, type ManualPost, type ManualPostInput } from "@/lib/db-manual-posts";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";

const CATEGORIES = ["", "메뉴얼", "운영", "기타"];

interface Props {
  post?: ManualPost; // if editing
}

export default function ManualPostEditor({ post }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState(post?.title ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [prefix, setPrefix] = useState(post?.prefix ?? "");
  const [isNotice, setIsNotice] = useState(post?.is_notice ?? false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      VideoBlock,
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: post?.content ? JSON.parse(post.content) : "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-0 py-2",
      },
    },
  });

  const handleFileUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "업로드 실패"); return; }
      const isImage = /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(json.name ?? "");
      const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(json.name ?? "");
      if (isImage) {
        editor.chain().focus().setImage({ src: json.url, alt: json.name }).run();
      } else if (isVideo) {
        editor.chain().focus().insertContent({
          type: "videoBlock",
          attrs: { src: json.url, title: json.name },
        }).run();
      } else {
        const ext = (json.name ?? "").split(".").pop()?.toLowerCase() ?? "";
        editor.chain().focus().insertContent(
          `<a href="/api/download?url=${encodeURIComponent(json.url)}&name=${encodeURIComponent(json.name)}" class="tiptap-file-link" data-ext="${ext}">📎 ${json.name}</a>`
        ).run();
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const handleSave = async () => {
    if (!title.trim()) { alert("제목을 입력하세요."); return; }
    if (!editor) return;
    setSaving(true);

    const input: ManualPostInput = {
      title: title.trim(),
      content: JSON.stringify(editor.getJSON()),
      author_id: user?.id ?? null,
      author_name: profile?.name ?? user?.email ?? "익명",
      category,
      prefix,
      is_notice: isNotice,
    };

    let result: ManualPost | null;
    if (post) {
      result = await updatePost(post.id, input);
    } else {
      result = await createPost(input);
    }

    setSaving(false);
    if (result) {
      router.push(`/manual/${result.id}`);
    } else {
      alert("저장에 실패했습니다.");
    }
  };

  const addLink = () => {
    const url = prompt("URL을 입력하세요:", "https://");
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 pt-4 pb-3 border-b border-[#e9ece9] dark:border-[#2f2f2f] flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-[13px] border border-[#e0e4e0] dark:border-[#3a3a3a] rounded-md px-2 py-1.5 bg-white dark:bg-[#2a2a2a] text-[#5b635c] dark:text-[#a0a8a0] focus:outline-none focus:ring-1 focus:ring-[#5e7c64]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c || "카테고리"}</option>
            ))}
          </select>
          <select
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="text-[13px] border border-[#e0e4e0] dark:border-[#3a3a3a] rounded-md px-2 py-1.5 bg-white dark:bg-[#2a2a2a] text-[#5b635c] dark:text-[#a0a8a0] focus:outline-none focus:ring-1 focus:ring-[#5e7c64]"
          >
            {PREFIXES.map((p) => (
              <option key={p} value={p}>{p || "말머리"}</option>
            ))}
          </select>
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-[13px] text-[#5b635c] dark:text-[#a0a8a0] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isNotice}
                onChange={(e) => setIsNotice(e.target.checked)}
                className="rounded accent-[#5e7c64]"
              />
              공지 고정
            </label>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 text-[13px] border border-[#e0e4e0] dark:border-[#3a3a3a] rounded-md text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#f0f2f0] dark:hover:bg-[#2f2f2f] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] bg-[#5e7c64] hover:bg-[#4d6b53] disabled:opacity-60 text-white rounded-md transition-colors"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {post ? "수정 완료" : "등록"}
          </button>
        </div>
      </div>

      {/* Content area — centered column */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8">
          {/* Title */}
          <div className="pt-8 pb-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full text-[26px] font-bold text-[#2f3430] dark:text-[#e6e6e4] placeholder-[#c8cfc8] bg-transparent focus:outline-none border-none leading-snug"
            />
          </div>

          {/* Toolbar */}
          <div className="py-1.5 border-y border-[#e9ece9] dark:border-[#2f2f2f] flex items-center gap-0.5 flex-wrap mb-4">
            {editor && (
              <>
                <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="실행취소"><Undo size={15} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="다시실행"><Redo size={15} /></ToolBtn>
                <Divider />
                <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="굵게"><Bold size={15} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="기울임"><Italic size={15} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="밑줄"><UnderlineIcon size={15} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="취소선"><Strikethrough size={15} /></ToolBtn>
                <Divider />
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="왼쪽 정렬"><AlignLeft size={15} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="가운데 정렬"><AlignCenter size={15} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="오른쪽 정렬"><AlignRight size={15} /></ToolBtn>
                <Divider />
                <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="글머리 기호"><List size={15} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="번호 목록"><ListOrdered size={15} /></ToolBtn>
                <Divider />
                <ToolBtn onClick={addLink} active={editor.isActive("link")} title="링크"><LinkIcon size={15} /></ToolBtn>
                <label title="파일 업로드 (이미지·문서·동영상)" className={cn("w-7 h-7 flex items-center justify-center rounded cursor-pointer text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors", uploading && "opacity-50 pointer-events-none")}>
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                  <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
                </label>
              </>
            )}
          </div>

          {/* Editor body */}
          <div className="pb-12">
            {editor && <EditorContent editor={editor} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors",
        active && "bg-[#e7ebe7] dark:bg-[rgba(94,124,100,0.15)] text-[#2f3430] dark:text-[#e6e6e4]"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-[#e0e4e0] dark:bg-[#3a3a3a] mx-1" />;
}
