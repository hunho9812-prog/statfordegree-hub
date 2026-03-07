"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorMenuBarProps {
  editor: Editor;
}

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export default function EditorMenuBar({ editor }: EditorMenuBarProps) {
  const buttons: (ToolbarButton | "divider")[] = [
    {
      icon: <Undo size={15} />,
      title: "실행 취소 (Ctrl+Z)",
      action: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().undo(),
    },
    {
      icon: <Redo size={15} />,
      title: "다시 실행 (Ctrl+Shift+Z)",
      action: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().redo(),
    },
    "divider",
    {
      icon: <Heading1 size={15} />,
      title: "제목 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: <Heading2 size={15} />,
      title: "제목 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: <Heading3 size={15} />,
      title: "제목 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
    },
    "divider",
    {
      icon: <Bold size={15} />,
      title: "굵게 (Ctrl+B)",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      icon: <Italic size={15} />,
      title: "기울임 (Ctrl+I)",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      icon: <Underline size={15} />,
      title: "밑줄 (Ctrl+U)",
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
    },
    {
      icon: <Strikethrough size={15} />,
      title: "취소선",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
    },
    {
      icon: <Code size={15} />,
      title: "인라인 코드",
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
    },
    {
      icon: <Highlighter size={15} />,
      title: "형광펜 (Ctrl+Shift+H)",
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive("highlight"),
    },
    "divider",
    {
      icon: <List size={15} />,
      title: "글머리 기호 목록",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered size={15} />,
      title: "번호 목록",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      icon: <CheckSquare size={15} />,
      title: "체크리스트",
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive("taskList"),
    },
    "divider",
    {
      icon: <Quote size={15} />,
      title: "인용문",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
    },
    {
      icon: <Code size={15} className="opacity-70" />,
      title: "코드 블록",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
    },
    {
      icon: <Minus size={15} />,
      title: "구분선",
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: <Link size={15} />,
      title: "링크",
      action: () => {
        const url = prompt("링크 URL을 입력하세요:");
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      },
      isActive: editor.isActive("link"),
    },
  ];

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-1.5 border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] sticky top-0 z-10">
      {buttons.map((btn, idx) => {
        if (btn === "divider") {
          return (
            <div
              key={`divider-${idx}`}
              className="w-px h-5 bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-1"
            />
          );
        }
        return (
          <button
            key={idx}
            onClick={btn.action}
            disabled={btn.disabled}
            title={btn.title}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded text-[#37352f] dark:text-[#e6e6e4]",
              "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              btn.isActive && "bg-[rgba(55,53,47,0.12)] dark:bg-[rgba(255,255,255,0.1)] text-blue-600 dark:text-blue-400"
            )}
          >
            {btn.icon}
          </button>
        );
      })}
    </div>
  );
}
