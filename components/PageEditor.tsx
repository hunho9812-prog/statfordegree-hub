"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
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
import SlashCommandMenu, { SLASH_COMMANDS } from "./SlashCommandMenu";
import { ToggleBlock } from "./extensions/ToggleBlock";
import { CalloutBlock } from "./extensions/CalloutBlock";
import { Clock, ChevronRight, Bold, Italic, Underline as UnderlineIcon, Code, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

const EMOJIS = [
  "📄", "📝", "📚", "📋", "🗂️", "📁", "🗃️", "📌", "📍", "🔖",
  "💡", "🎯", "🚀", "⭐", "🔥", "✅", "❌", "⚠️", "💬", "🔍",
  "🏠", "🏢", "📊", "📈", "💰", "👥", "👤", "🤝", "🎨", "🛠️",
];

interface SlashMenuState {
  open: boolean;
  coords: { x: number; y: number };
  query: string;
  range: { from: number; to: number };
}

interface BlockButton {
  top: number;
  left: number;
  docEnd: number;
}

export default function PageEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { pages, updatePage } = useWorkspaceStore();
  const page = pages[pageId];

  const [title, setTitle] = useState(page?.title || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    open: false,
    coords: { x: 0, y: 0 },
    query: "",
    range: { from: 0, to: 0 },
  });

  const [blockButtons, setBlockButtons] = useState<BlockButton[]>([]);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockMenuCoords, setBlockMenuCoords] = useState({ x: 0, y: 0 });

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu((s) => ({ ...s, open: false }));
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "제목을 입력하세요...";
          return "'/' 를 입력하여 블록을 추가하세요";
        },
        emptyEditorClass: "is-editor-empty",
        includeChildren: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: "text-blue-600 dark:text-blue-400 underline cursor-pointer" },
      }),
      TextStyle,
      Color,
      ToggleBlock,
      CalloutBlock,
    ],
    content: page?.content
      ? JSON.parse(page.content)
      : { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      setSaveStatus("saving");
      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      // Slash command detection
      const { from } = editor.state.selection;
      const { $from } = editor.state.selection;

      if ($from.parent.type.name === "paragraph") {
        const nodeStart = $from.start();
        const textBefore = editor.state.doc.textBetween(nodeStart, from, "\n", "\0");
        const slashIdx = textBefore.lastIndexOf("/");

        if (slashIdx >= 0) {
          const query = textBefore.slice(slashIdx + 1);
          if (!query.includes(" ") && !query.includes("\n")) {
            const slashPos = nodeStart + slashIdx;
            const coords = editor.view.coordsAtPos(slashPos);
            setSlashMenu({
              open: true,
              coords: { x: coords.left, y: coords.bottom },
              query,
              range: { from: slashPos, to: from },
            });
            saveTimeout.current = setTimeout(() => {
              updatePage(pageId, { content: JSON.stringify(editor.getJSON()) });
              setSaveStatus("saved");
            }, 800);
            return;
          }
        }
      }

      setSlashMenu((s) => ({ ...s, open: false }));

      saveTimeout.current = setTimeout(() => {
        updatePage(pageId, { content: JSON.stringify(editor.getJSON()) });
        setSaveStatus("saved");
      }, 800);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor-content outline-none min-h-[400px] px-1",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Backspace" && slashMenu.open) {
          const { from } = view.state.selection;
          if (from <= slashMenu.range.from + 1) {
            setSlashMenu((s) => ({ ...s, open: false }));
          }
        }
        return false;
      },
    },
  });

  // Recompute per-block "+" button positions. Runs in a rAF to batch rapid calls
  // (e.g. during fast typing) and avoid flickering React re-renders.
  const updateBlockButtons = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!editor || !scrollContainerRef.current) return;
      const containerEl = scrollContainerRef.current;
      const containerRect = containerEl.getBoundingClientRect();
      const scrollTop = containerEl.scrollTop;

      const btns: BlockButton[] = [];
      editor.state.doc.forEach((node, offset) => {
        try {
          const domNode = editor.view.nodeDOM(offset);
          if (!(domNode instanceof HTMLElement)) return;
          const rect = domNode.getBoundingClientRect();
          btns.push({
            top: rect.top - containerRect.top + scrollTop + rect.height / 2 - 10,
            left: rect.left - containerRect.left - 28,
            docEnd: offset + node.nodeSize,
          });
        } catch { /* skip unmounted nodes */ }
      });
      setBlockButtons(btns);
    });
  }, [editor]);

  // Only sync on content changes (not selectionUpdate — that fires on every click
  // and causes re-renders that make buttons flicker under the cursor).
  useEffect(() => {
    if (!editor) return;
    editor.on("update", updateBlockButtons);
    return () => { editor.off("update", updateBlockButtons); };
  }, [editor, updateBlockButtons]);

  // Initial render + scroll + resize
  useEffect(() => { updateBlockButtons(); }, [updateBlockButtons]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateBlockButtons);
    return () => el.removeEventListener("scroll", updateBlockButtons);
  }, [updateBlockButtons]);

  useEffect(() => {
    window.addEventListener("resize", updateBlockButtons);
    return () => window.removeEventListener("resize", updateBlockButtons);
  }, [updateBlockButtons]);

  // Insert a new paragraph at docEnd, focus it, then open the block menu.
  const handleInsertBlock = useCallback((docEnd: number) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContentAt(docEnd, { type: "paragraph" })
      .setTextSelection(docEnd + 1)
      .run();

    setTimeout(() => {
      try {
        const coords = editor.view.coordsAtPos(docEnd + 1);
        setBlockMenuCoords({ x: coords.left, y: coords.bottom });
        setBlockMenuOpen(true);
      } catch { /* ignore */ }
    }, 0);
  }, [editor]);

  // Sync title with page changes (e.g. from sidebar rename)
  useEffect(() => {
    if (page) setTitle(page.title);
  }, [page?.title]);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setTitle(val);
      setSaveStatus("saving");
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        updatePage(pageId, { title: val });
        setSaveStatus("saved");
      }, 500);
    },
    [pageId, updatePage]
  );

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      editor?.chain().focus().run();
    }
  };

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#191919]">
        <div className="text-center">
          <p className="text-[#9b9a97] text-lg">페이지를 찾을 수 없습니다</p>
          <button onClick={() => router.push("/")} className="mt-3 text-blue-500 hover:underline text-sm">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Build breadcrumb
  const breadcrumb: { id: string; title: string; emoji: string }[] = [];
  let cur: string | null = page.parentId;
  while (cur) {
    const p = pages[cur];
    if (!p) break;
    breadcrumb.unshift({ id: p.id, title: p.title, emoji: p.emoji });
    cur = p.parentId;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#191919]">
      {/* Fixed toolbar */}
      {editor && <EditorMenuBar editor={editor} />}

      {/* Bubble menu for text selection */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100, placement: "top" }}
          className="flex items-center gap-0.5 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg shadow-lg px-1.5 py-1"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("bold") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <Bold size={13} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("italic") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <Italic size={13} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("underline") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <UnderlineIcon size={13} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("code") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <Code size={13} />
          </button>
          <div className="w-px h-4 bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-0.5" />
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("highlight") ? "bg-yellow-200 text-yellow-800" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            H
          </button>
          <button
            onClick={() => {
              const url = prompt("링크 URL:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-xs text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            🔗
          </button>
        </BubbleMenu>
      )}

      {/* Scrollable content — position:relative so absolute "+" buttons are anchored here */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto px-16 py-12">
          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 mb-6 text-sm text-[#9b9a97] dark:text-[#6b6b6b]">
              {breadcrumb.map((item, idx) => (
                <span key={item.id} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight size={12} />}
                  <button
                    onClick={() => router.push(`/p/${item.id}`)}
                    className="hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors"
                  >
                    {item.emoji} {item.title}
                  </button>
                </span>
              ))}
              <ChevronRight size={12} />
            </div>
          )}

          {/* Emoji picker */}
          <div className="relative mb-4" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="text-5xl hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] rounded-lg p-1 transition-colors leading-none"
              title="이모지 변경"
            >
              {page.emoji || "📄"}
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-16 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-lg p-3 w-64">
                <p className="text-xs text-[#9b9a97] mb-2 font-medium">이모지 선택</p>
                <div className="grid grid-cols-10 gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { updatePage(pageId, { emoji }); setShowEmojiPicker(false); }}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] text-lg"
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
            className="w-full text-4xl font-bold text-[#37352f] dark:text-[#e6e6e4] resize-none overflow-hidden bg-transparent border-none outline-none placeholder-[#c4c3bf] dark:placeholder-[#4f4f4f] leading-tight mb-8 block"
          />

          {/* Meta */}
          <div className="flex items-center gap-4 mb-8 text-xs text-[#9b9a97] dark:text-[#6b6b6b]">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatRelativeTime(page.updatedAt)} 업데이트
            </span>
            <span className={saveStatus === "saving" ? "text-yellow-500" : "text-[#c4c3bf] dark:text-[#4f4f4f]"}>
              {saveStatus === "saving" ? "저장 중..." : "저장됨"}
            </span>
          </div>

          {/* Editor */}
          <div className="tiptap-editor">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Always-visible "+" buttons — one per block, absolutely positioned.
            key=docEnd gives stable identity so React doesn't unmount on re-render. */}
        {!blockMenuOpen && blockButtons.map((btn) => (
          <button
            key={btn.docEnd}
            style={{ position: "absolute", top: btn.top, left: btn.left, zIndex: 30 }}
            onMouseDown={(e) => e.preventDefault()} // keep editor focus
            onClick={() => handleInsertBlock(btn.docEnd)}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="블록 추가"
          >
            <Plus size={14} />
          </button>
        ))}
      </div>

      {/* Slash command menu */}
      {editor && (
        <SlashCommandMenu
          editor={editor}
          open={slashMenu.open}
          coords={slashMenu.coords}
          query={slashMenu.query}
          range={slashMenu.range}
          onClose={closeSlashMenu}
        />
      )}

      {/* Block type menu (opened by "+" button) */}
      {editor && blockMenuOpen && (
        <div
          className="fixed z-[100] bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl w-64 max-h-72 overflow-y-auto py-1"
          style={{
            left: Math.min(blockMenuCoords.x, typeof window !== "undefined" ? window.innerWidth - 280 : blockMenuCoords.x),
            top: blockMenuCoords.y + 8,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {["텍스트", "목록", "블록", "미디어"].map((group) => {
            const items = SLASH_COMMANDS.filter((cmd) => cmd.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group}</p>
                {items.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      const pos = editor.state.selection.from;
                      cmd.command(editor, { from: pos, to: pos });
                      setBlockMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f] transition-colors"
                  >
                    <span className="flex-shrink-0 text-gray-400">{cmd.icon}</span>
                    <div>
                      <p className="text-sm font-medium leading-4">{cmd.title}</p>
                      <p className="text-xs text-gray-400 leading-4">{cmd.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Close block menu on outside click */}
      {blockMenuOpen && (
        <div className="fixed inset-0 z-[99]" onClick={() => setBlockMenuOpen(false)} />
      )}
    </div>
  );
}
