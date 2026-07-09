"use client";

import { useState } from "react";
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
  ChevronRight,
  ChevronsDownUp,
  Lightbulb,
  Code2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorMenuBarProps {
  editor: Editor;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label?: string;
  title: string;
  action: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

// Notion-style color palette
const COLORS = [
  { label: "기본", color: null },
  { label: "회색", color: "#9b9a97" },
  { label: "갈색", color: "#64473a" },
  { label: "주황", color: "#d9730d" },
  { label: "노랑", color: "#cb912f" },
  { label: "초록", color: "#448361" },
  { label: "파랑", color: "#337ea9" },
  { label: "보라", color: "#9065b0" },
  { label: "분홍", color: "#c14c8a" },
  { label: "빨강", color: "#d44c47" },
];

const FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "기본", value: "" },
  { label: "Large", value: "18px" },
  { label: "XL", value: "24px" },
];

export default function EditorMenuBar({ editor }: EditorMenuBarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [customColor, setCustomColor] = useState("");

  const currentColor: string | undefined = editor.getAttributes("textStyle").color;
  const currentFontSize: string | undefined = editor.getAttributes("textStyle").fontSize;

  const cmds = editor.chain().focus() as unknown as {
    setFontSize: (s: string) => { run: () => void };
    unsetFontSize: () => { run: () => void };
  };

  const buttons: (ToolbarButton | "divider")[] = [
    {
      icon: <Undo size={17} />,
      title: "실행 취소 (Ctrl+Z)",
      action: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().undo(),
    },
    {
      icon: <Redo size={17} />,
      title: "다시 실행 (Ctrl+Shift+Z)",
      action: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().redo(),
    },
    "divider",
    {
      icon: <Heading1 size={17} />,
      title: "제목 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: <Heading2 size={17} />,
      title: "제목 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: <Heading3 size={17} />,
      title: "제목 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
    },
    "divider",
    {
      icon: <Bold size={17} />,
      title: "굵게 (Ctrl+B)",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      icon: <Italic size={17} />,
      title: "기울임 (Ctrl+I)",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      icon: <Underline size={17} />,
      title: "밑줄 (Ctrl+U)",
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
    },
    {
      icon: <Strikethrough size={17} />,
      title: "취소선",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
    },
    {
      icon: <Code size={17} />,
      title: "인라인 코드",
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
    },
    {
      icon: <Highlighter size={17} />,
      title: "형광펜",
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive("highlight"),
    },
    "divider",
    {
      icon: <List size={17} />,
      title: "글머리 기호 목록",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered size={17} />,
      title: "번호 목록",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      icon: <CheckSquare size={17} />,
      title: "체크리스트",
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive("taskList"),
    },
    "divider",
    {
      icon: <Quote size={17} />,
      title: "인용문",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
    },
    {
      icon: <Code2 size={17} />,
      title: "코드 블록",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
    },
    {
      icon: <ChevronsDownUp size={17} />,
      title: "토글 중주제",
      action: () => (editor.commands as unknown as Record<string, () => boolean>).insertToggleH2?.(),
      isActive: editor.isActive("toggleHeading", { level: 2 }),
    },
    {
      icon: <ChevronRight size={17} />,
      title: "토글 블록",
      action: () => (editor.commands as unknown as Record<string, () => boolean>).insertToggleBlock?.(),
      isActive: editor.isActive("toggleBlock"),
    },
    {
      icon: <Lightbulb size={17} />,
      title: "콜아웃",
      action: () => (editor.commands as unknown as Record<string, () => boolean>).insertCalloutBlock?.(),
      isActive: editor.isActive("calloutBlock"),
    },
    {
      icon: <Minus size={17} />,
      title: "구분선",
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: <Link size={17} />,
      title: "링크",
      action: () => {
        const url = prompt("링크 URL을 입력하세요:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },
      isActive: editor.isActive("link"),
    },
  ];

  return (
    <div
      className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] sticky top-0 z-10"
      onClick={() => { setShowColorPicker(false); setShowSizePicker(false); }}
    >
      {buttons.map((btn, idx) => {
        if (btn === "divider") {
          return (
            <div key={`d-${idx}`} className="w-px h-6 bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-1" />
          );
        }
        return (
          <button
            key={idx}
            onClick={btn.action}
            disabled={btn.disabled}
            title={btn.title}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-md text-[#37352f] dark:text-[#e6e6e4]",
              "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              btn.isActive && "bg-[rgba(55,53,47,0.12)] dark:bg-[rgba(255,255,255,0.1)] text-blue-600 dark:text-blue-400"
            )}
          >
            {btn.icon}
          </button>
        );
      })}

      {/* ── 글씨 크기 ── */}
      <div className="w-px h-6 bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-1" />
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => { setShowSizePicker((v) => !v); setShowColorPicker(false); }}
          title="글씨 크기"
          className={cn(
            "h-9 px-2.5 flex items-center gap-1 rounded-md text-sm font-medium text-[#37352f] dark:text-[#e6e6e4]",
            "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors",
            showSizePicker && "bg-[rgba(55,53,47,0.08)] dark:bg-[rgba(255,255,255,0.06)]"
          )}
        >
          <span className="text-[13px]">
            {currentFontSize
              ? FONT_SIZES.find((f) => f.value === currentFontSize)?.label ?? currentFontSize
              : "기본"}
          </span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>

        {showSizePicker && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl py-1 w-36">
            {FONT_SIZES.map((fs) => (
              <button
                key={fs.label}
                onClick={() => {
                  if (fs.value) cmds.setFontSize(fs.value).run();
                  else cmds.unsetFontSize().run();
                  setShowSizePicker(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-left text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f] transition-colors",
                  currentFontSize === fs.value && "text-blue-600 dark:text-blue-400 font-semibold"
                )}
              >
                <span style={{ fontSize: fs.value || "14px" }}>{fs.label}</span>
                {fs.value && (
                  <span className="text-[10px] text-gray-400">{fs.value}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 글씨 색상 ── */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => { setShowColorPicker((v) => !v); setShowSizePicker(false); }}
          title="글씨 색상"
          className={cn(
            "h-9 px-2.5 flex flex-col items-center justify-center gap-0.5 rounded-md",
            "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors",
            showColorPicker && "bg-[rgba(55,53,47,0.08)] dark:bg-[rgba(255,255,255,0.06)]"
          )}
        >
          <span className="text-[15px] font-bold text-[#37352f] dark:text-[#e6e6e4] leading-none">A</span>
          <span
            className="w-5 h-1.5 rounded-sm"
            style={{ background: currentColor ?? "#37352f" }}
          />
        </button>

        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl p-3 w-56">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">글씨 색상</p>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {COLORS.map(({ label, color }) => (
                <button
                  key={label}
                  title={label}
                  onClick={() => {
                    if (color) editor.chain().focus().setColor(color).run();
                    else editor.chain().focus().unsetColor().run();
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
                    currentColor === color
                      ? "border-blue-400"
                      : "border-transparent hover:border-gray-300 dark:hover:border-gray-500"
                  )}
                  style={{ background: color ?? "#f0f0ee" }}
                >
                  {!color && (
                    <span className="text-[9px] text-gray-500 font-bold flex items-center justify-center w-full h-full">기</span>
                  )}
                </button>
              ))}
            </div>
            {/* Hex input */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#색상코드"
                maxLength={7}
                className="flex-1 h-7 px-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[12px] bg-transparent text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400"
              />
              <button
                onClick={() => {
                  const c = customColor.trim();
                  if (/^#[0-9a-fA-F]{3,6}$/.test(c)) {
                    editor.chain().focus().setColor(c).run();
                    setShowColorPicker(false);
                    setCustomColor("");
                  }
                }}
                className="h-7 px-2.5 rounded-lg bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#37352f] text-[11px] font-semibold"
              >
                적용
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
