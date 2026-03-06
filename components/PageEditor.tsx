"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { useWorkspaceStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";
import EditorMenuBar from "./EditorMenuBar";
import { Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const EMOJIS = [
  "📄", "📝", "📚", "📋", "🗂️", "📁", "🗃️", "📌", "📍", "🔖",
  "💡", "🎯", "🚀", "⭐", "🔥", "✅", "❌", "⚠️", "💬", "🔍",
  "🏠", "🏢", "📊", "📈", "💰", "👥", "👤", "🤝", "🎨", "🛠️",
];

interface PageEditorProps {
  pageId: string;
}

export default function PageEditor({ pageId }: PageEditorProps) {
  const router = useRouter();
  const { pages, updatePage } = useWorkspaceStore();
  const page = pages[pageId];

  const [title, setTitle] = useState(page?.title || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "내용을 입력하세요... '/' 키를 눌러 블록을 추가하세요",
        emptyEditorClass: "is-editor-empty",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
      }),
      TextStyle,
      Color,
    ],
    content: page?.content ? JSON.parse(page.content) : { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      setSaveStatus("saving");
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        updatePage(pageId, { content: JSON.stringify(editor.getJSON()) });
        setSaveStatus("saved");
      }, 800);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose max-w-none outline-none min-h-[400px] px-1",
      },
    },
  });

  // Sync title state with page changes
  useEffect(() => {
    if (page) setTitle(page.title);
  }, [page?.title]);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      updatePage(pageId, { title: newTitle });
      setSaveStatus("saved");
    }, 500);
  }, [pageId, updatePage]);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      editor?.chain().focus().run();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    updatePage(pageId, { emoji });
    setShowEmojiPicker(false);
  };

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9b9a97] text-lg">페이지를 찾을 수 없습니다</p>
          <button
            onClick={() => router.push("/")}
            className="mt-3 text-blue-500 hover:underline text-sm"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Build breadcrumb
  const breadcrumb: { id: string; title: string; emoji: string }[] = [];
  let currentId: string | null = page.parentId;
  while (currentId) {
    const p = pages[currentId];
    if (!p) break;
    breadcrumb.unshift({ id: p.id, title: p.title, emoji: p.emoji });
    currentId = p.parentId;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      {editor && <EditorMenuBar editor={editor} />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-16 py-12">
          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 mb-6 text-sm text-[#9b9a97]">
              {breadcrumb.map((item, idx) => (
                <span key={item.id} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight size={12} />}
                  <button
                    onClick={() => router.push(`/p/${item.id}`)}
                    className="hover:text-[#37352f] transition-colors"
                  >
                    {item.emoji} {item.title}
                  </button>
                </span>
              ))}
              <ChevronRight size={12} />
            </div>
          )}

          {/* Page emoji */}
          <div className="relative mb-4" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-5xl hover:bg-[rgba(55,53,47,0.08)] rounded-lg p-1 transition-colors leading-none"
              title="이모지 변경"
            >
              {page.emoji || "📄"}
            </button>

            {showEmojiPicker && (
              <div className="absolute left-0 top-16 z-50 bg-white border border-[#e9e9e7] rounded-xl shadow-lg p-3 w-64">
                <p className="text-xs text-[#9b9a97] mb-2 font-medium">이모지 선택</p>
                <div className="grid grid-cols-10 gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.08)] text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="제목 없음"
            rows={1}
            className={`
              w-full text-4xl font-bold text-[#37352f] resize-none overflow-hidden
              bg-transparent border-none outline-none placeholder-[#c4c3bf]
              leading-tight mb-8 block
            `}
          />

          {/* Meta info */}
          <div className="flex items-center gap-4 mb-8 text-xs text-[#9b9a97]">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatRelativeTime(page.updatedAt)} 업데이트
            </span>
            <span
              className={`flex items-center gap-1 ${
                saveStatus === "saving" ? "text-yellow-500" : "text-[#c4c3bf]"
              }`}
            >
              {saveStatus === "saving" ? "저장 중..." : saveStatus === "saved" ? "저장됨" : "미저장"}
            </span>
          </div>

          {/* Editor */}
          <div className="tiptap-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
