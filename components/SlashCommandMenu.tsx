"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  CheckSquare,
  ChevronRight,
  Minus,
  Code2,
  Quote,
  Image,
  Lightbulb,
} from "lucide-react";

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  group: string;
  command: (editor: Editor, range: { from: number; to: number }) => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  // Text
  {
    id: "heading1",
    title: "제목 1",
    description: "큰 제목",
    icon: <Heading1 size={18} />,
    group: "텍스트",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    title: "제목 2",
    description: "중간 제목",
    icon: <Heading2 size={18} />,
    group: "텍스트",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    title: "제목 3",
    description: "작은 제목",
    icon: <Heading3 size={18} />,
    group: "텍스트",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    id: "text",
    title: "텍스트",
    description: "일반 텍스트 단락",
    icon: <Type size={18} />,
    group: "텍스트",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  // Lists
  {
    id: "bulletList",
    title: "글머리 목록",
    description: "• 기호 목록",
    icon: <List size={18} />,
    group: "목록",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: "orderedList",
    title: "번호 목록",
    description: "1. 번호 목록",
    icon: <ListOrdered size={18} />,
    group: "목록",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: "taskList",
    title: "체크리스트",
    description: "☐ 할 일 목록",
    icon: <CheckSquare size={18} />,
    group: "목록",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  // Blocks
  {
    id: "toggle",
    title: "토글",
    description: "접기 / 펼치기 블록",
    icon: <ChevronRight size={18} />,
    group: "블록",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      (editor.commands as unknown as Record<string, () => boolean>).insertToggleBlock?.();
    },
  },
  {
    id: "blockquote",
    title: "인용문",
    description: "인용 블록",
    icon: <Quote size={18} />,
    group: "블록",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    title: "코드 블록",
    description: "코드 스니펫",
    icon: <Code2 size={18} />,
    group: "블록",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: "callout",
    title: "콜아웃",
    description: "💡 강조 박스",
    icon: <Lightbulb size={18} />,
    group: "블록",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      (editor.commands as unknown as Record<string, () => boolean>).insertCalloutBlock?.();
    },
  },
  {
    id: "divider",
    title: "구분선",
    description: "수평 구분선",
    icon: <Minus size={18} />,
    group: "블록",
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  // Media
  {
    id: "image",
    title: "이미지",
    description: "URL로 이미지 삽입",
    icon: <Image size={18} />,
    group: "미디어",
    command: (editor, range) => {
      const url = prompt("이미지 URL을 입력하세요:");
      if (url) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent(`<img src="${url}" alt="image" class="tiptap-image" />`)
          .run();
      } else {
        editor.chain().focus().deleteRange(range).run();
      }
    },
  },
];

const GROUPS = ["텍스트", "목록", "블록", "미디어"];

interface SlashCommandMenuProps {
  editor: Editor;
  open: boolean;
  coords: { x: number; y: number };
  query: string;
  range: { from: number; to: number };
  onClose: () => void;
}

export default function SlashCommandMenu({
  editor,
  open,
  coords,
  query,
  range,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = SLASH_COMMANDS.filter(
    (cmd) =>
      !query ||
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIdx]) {
          filtered[selectedIdx].command(editor, range);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [open, filtered, selectedIdx, editor, range, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = menuRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open || filtered.length === 0) return null;

  // Clamp menu so it stays on screen
  const menuX = Math.min(coords.x, typeof window !== "undefined" ? window.innerWidth - 280 : coords.x);
  const menuY = coords.y + 8;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl w-64 max-h-72 overflow-y-auto py-1"
      style={{ left: menuX, top: menuY }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {GROUPS.map((group) => {
        const items = filtered.filter((cmd) => cmd.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {group}
            </p>
            {items.map((cmd) => {
              const globalIdx = filtered.indexOf(cmd);
              const isSelected = globalIdx === selectedIdx;
              return (
                <button
                  key={cmd.id}
                  data-idx={globalIdx}
                  onClick={() => {
                    cmd.command(editor, range);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                      : "text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f]"
                  }`}
                >
                  <span className={`flex-shrink-0 ${isSelected ? "text-blue-500" : "text-gray-400"}`}>
                    {cmd.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-4">{cmd.title}</p>
                    <p className="text-xs text-gray-400 leading-4">{cmd.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
