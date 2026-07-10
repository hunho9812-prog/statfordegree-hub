"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useWorkspaceStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";
import EditorMenuBar from "./EditorMenuBar";
import SlashCommandMenu, { SLASH_COMMANDS } from "./SlashCommandMenu";
import { ToggleBlock } from "./extensions/ToggleBlock";
import { FontSize } from "./extensions/FontSize";
import { ToggleHeading } from "./extensions/ToggleHeading";
import { CalloutBlock } from "./extensions/CalloutBlock";
import { VideoBlock } from "./extensions/VideoBlock";
import { Clock, ChevronRight, Bold, Italic, Underline as UnderlineIcon, Code, Plus, Trash2, GripVertical, ImageUp, FileUp, Loader2, MoreHorizontal, Pencil, AlertTriangle, ChevronDown as ChevronDownIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import MonthPageManager from "./MonthPageManager";
import CRMPage from "./CRMPage";
import YearRevenueDashboard from "./YearRevenueDashboard";

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
  top: number;        // vertical center for the control group
  blockTop: number;   // real block top (scroll-space) — used for drop indicator
  blockBottom: number;// real block bottom
  left: number;       // left edge of 3-button control group
  docStart: number;   // ProseMirror offset of block start
  docEnd: number;     // ProseMirror offset of block end
}

interface DragState {
  docStart: number;
  docEnd: number;
  srcIdx: number;
}

export default function PageEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { pages, updatePage, createPage, deletePage } = useWorkspaceStore();
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState("");
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockMenuCoords, setBlockMenuCoords] = useState({ x: 0, y: 0 });
  const [dropBtnIdx, setDropBtnIdx] = useState<number | null>(null);

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const titleSaveTimer = useRef<NodeJS.Timeout | null>(null);
  // 내가 마지막으로 저장한 content를 추적 (Realtime 에코 방지용)
  const lastLocalSaveRef = useRef<string | null>(page?.content ?? null);
  // 사용자가 현재 타이핑 중이거나 Supabase write 대기 중인지
  const isSavingRef = useRef(false);
  // 마지막으로 updatePage를 호출한 시각 (타임스탬프 비교로 에코 구분)
  const lastSaveTimeRef = useRef<string | null>(page?.updatedAt ?? null);
  const isEditingTitleRef = useRef(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPosRef = useRef<number>(0);
  const uploadFnRef = useRef<((file: File, isImage: boolean) => void) | null>(null);
  const [uploading, setUploading] = useState(false);

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
        showOnlyCurrent: true,
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
      FontSize,
      Image.configure({ inline: false, allowBase64: true }),
      ToggleBlock,
      ToggleHeading,
      CalloutBlock,
      VideoBlock,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: page?.content
      ? JSON.parse(page.content)
      : { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      setSaveStatus("saving");
      isSavingRef.current = true;
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
              const content = JSON.stringify(editor.getJSON());
              const now = new Date().toISOString();
              lastLocalSaveRef.current = content;
              lastSaveTimeRef.current = now;
              updatePage(pageId, { content });
              setSaveStatus("saved");
              isSavingRef.current = false;
            }, 800);
            return;
          }
        }
      }

      setSlashMenu((s) => ({ ...s, open: false }));

      saveTimeout.current = setTimeout(() => {
        const content = JSON.stringify(editor.getJSON());
        const now = new Date().toISOString();
        lastLocalSaveRef.current = content;
        lastSaveTimeRef.current = now;
        updatePage(pageId, { content });
        setSaveStatus("saved");
        isSavingRef.current = false;
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
      // 클립보드에서 이미지 붙여넣기 (Ctrl+V / 스크린샷 붙여넣기)
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            uploadPosRef.current = view.state.selection.from;
            uploadFnRef.current?.(file, true);
            return true;
          }
        }
        return false;
      },
      // 파일 드래그 앤 드롭으로 이미지 삽입
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        uploadPosRef.current = coords?.pos ?? view.state.selection.from;
        uploadFnRef.current?.(file, true);
        return true;
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
          if (rect.width === 0 && rect.height === 0) return; // hidden element
          const relTop = rect.top - containerRect.top + scrollTop;
          // 3 buttons × 18 px + 2 gaps × 2 px = 58 px; keep ≥ 4 px from container edge
          const groupLeft = Math.max(4, rect.left - containerRect.left - 62);
          btns.push({
            top: relTop + rect.height / 2 - 9,
            blockTop: relTop,
            blockBottom: relTop + rect.height,
            left: groupLeft,
            docStart: offset,
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

  // ── File / Image upload ───────────────────────────────────────────────────────
  const doUpload = useCallback(async (file: File, isImage: boolean) => {
    if (!editor) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "업로드 실패"); return; }

      const pos = uploadPosRef.current;
      const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(json.name ?? "");
      if (isImage) {
        editor.chain().focus().setTextSelection(pos).setImage({ src: json.url, alt: json.name }).run();
      } else if (isVideo) {
        editor.chain().focus().insertContentAt(pos, {
          type: "videoBlock",
          attrs: { src: json.url, title: json.name },
        }).run();
      } else {
        editor.chain().focus().insertContentAt(pos,
          `<a href="/api/download?url=${encodeURIComponent(json.url)}&name=${encodeURIComponent(json.name)}" class="tiptap-file-link">📎 ${json.name}</a>`
        ).run();
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }, [editor]);

  uploadFnRef.current = doUpload;

  const handleImageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file, true);
    e.target.value = "";
  }, [doUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file, false);
    e.target.value = "";
  }, [doUpload]);

  // Delete a single block by its ProseMirror range.
  const handleDeleteBlock = useCallback((docStart: number, docEnd: number) => {
    if (!editor) return;
    // Never delete the very last block to keep the editor non-empty.
    if (editor.state.doc.childCount <= 1) return;
    editor.chain().focus().deleteRange({ from: docStart, to: docEnd }).run();
  }, [editor]);

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((
    e: React.DragEvent,
    docStart: number,
    docEnd: number,
    srcIdx: number,
  ) => {
    dragStateRef.current = { docStart, docEnd, srcIdx };
    e.dataTransfer.effectAllowed = "move";
    // Invisible drag ghost so the default blue box doesn't flicker
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-9999px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  }, []);

  const handleContainerDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const containerEl = scrollContainerRef.current;
    if (!containerEl) return;
    const mouseY = e.clientY - containerEl.getBoundingClientRect().top + containerEl.scrollTop;
    // Find the block whose centre is nearest the cursor
    let closest = 0;
    let minDist = Infinity;
    blockButtons.forEach((btn, idx) => {
      const dist = Math.abs(btn.top + 9 - mouseY);
      if (dist < minDist) { minDist = dist; closest = idx; }
    });
    setDropBtnIdx(closest);
  }, [blockButtons]);

  const handleContainerDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!editor || !dragStateRef.current || dropBtnIdx === null) {
      dragStateRef.current = null;
      setDropBtnIdx(null);
      return;
    }
    const { docStart, docEnd, srcIdx } = dragStateRef.current;
    const targetBtn = blockButtons[dropBtnIdx];
    dragStateRef.current = null;
    setDropBtnIdx(null);

    if (srcIdx === dropBtnIdx || !targetBtn) return;

    editor.chain().focus().command(({ tr, state, dispatch }) => {
      const content = state.doc.slice(docStart, docEnd).content;
      tr.delete(docStart, docEnd);
      // Map target position through the deletion
      const insertPos = srcIdx < dropBtnIdx
        ? tr.mapping.map(targetBtn.docEnd)   // moving down → after target
        : tr.mapping.map(targetBtn.docStart); // moving up  → before target
      tr.insert(insertPos, content);
      if (dispatch) dispatch(tr);
      return true;
    }).run();
  }, [editor, blockButtons, dropBtnIdx]);

  const handleDragEnd = useCallback(() => {
    dragStateRef.current = null;
    setDropBtnIdx(null);
  }, []);

  // Drop-indicator position (blue line shown while dragging)
  const dropIndicator = useMemo(() => {
    if (dropBtnIdx === null || !dragStateRef.current) return null;
    const btn = blockButtons[dropBtnIdx];
    if (!btn) return null;
    const isMovingDown = dragStateRef.current.srcIdx < dropBtnIdx;
    return { top: isMovingDown ? btn.blockBottom : btn.blockTop, left: btn.left + 60 };
  }, [dropBtnIdx, blockButtons]);

  // Sync title with page changes from other users (realtime)
  useEffect(() => {
    if (page && !isEditingTitleRef.current) setTitle(page.title);
  }, [page?.title]);

  // Sync content with changes from other users (realtime)
  // - 내가 저장한 내용이 반영된 경우(에코)는 건너뜀
  // - 사용자가 타이핑 중이면 건너뜀 (입력 방해 방지)
  // - 내 마지막 저장 시각보다 오래된 버전은 무시 (동기화 버튼으로 인한 롤백 방지)
  useEffect(() => {
    if (!editor || !page?.content) return;
    if (page.content === lastLocalSaveRef.current) return; // 내 에코
    if (isSavingRef.current) return; // 타이핑 중
    // page.updatedAt이 내 마지막 저장 시각보다 오래됐으면 무시
    // (Supabase write 완료 전에 sync가 실행된 경우)
    if (lastSaveTimeRef.current && page.updatedAt <= lastSaveTimeRef.current) return;
    try {
      editor.commands.setContent(JSON.parse(page.content), false);
      lastLocalSaveRef.current = page.content; // 외부 변경도 에코 기준 업데이트
    } catch { /* invalid JSON, skip */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.content, page?.updatedAt]);

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
      isEditingTitleRef.current = true;
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = setTimeout(() => {
        updatePage(pageId, { title: val });
        setSaveStatus("saved");
        isEditingTitleRef.current = false;
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

  // Page type detection
  const isYearPage = /^(\d{4})년/.test(page.title);
  const isMonthPage =
    /^\d{1,2}월$/.test(page.title) &&
    page.parentId !== null &&
    /^(\d{4})년/.test(pages[page.parentId]?.title ?? "");

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
          tippyOptions={{ duration: 100, placement: "top", onHide: () => setShowColorPicker(false) }}
          className="flex items-center gap-0.5 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg shadow-lg px-1.5 py-1"
        >
          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("bold") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <Bold size={13} />
          </button>
          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("italic") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <Italic size={13} />
          </button>
          {/* Underline */}
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("underline") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <UnderlineIcon size={13} />
          </button>
          {/* Code */}
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("code") ? "bg-gray-200 dark:bg-gray-600 text-blue-600" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            <Code size={13} />
          </button>
          {/* Highlight */}
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive("highlight") ? "bg-yellow-200 text-yellow-800" : "text-[#37352f] dark:text-[#e6e6e4]"}`}
          >
            H
          </button>
          {/* Link */}
          <button
            onClick={() => {
              const url = prompt("링크 URL:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-xs text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            🔗
          </button>

          <div className="w-px h-4 bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-0.5" />

          {/* Font size dropdown */}
          <div className="relative flex items-center">
            <select
              value={(() => {
                const attrs = editor.getAttributes("textStyle");
                return attrs.fontSize ?? "";
              })()}
              onChange={(e) => {
                const val = e.target.value;
                const cmds = editor.chain().focus() as unknown as {
                  setFontSize: (s: string) => { run: () => void };
                  unsetFontSize: () => { run: () => void };
                };
                if (!val) cmds.unsetFontSize().run();
                else cmds.setFontSize(val).run();
              }}
              className="appearance-none h-6 pl-1.5 pr-4 rounded text-[11px] text-[#37352f] dark:text-[#e6e6e4] bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 border-none outline-none cursor-pointer"
              title="글씨 크기"
            >
              <option value="">기본</option>
              <option value="12px">Small</option>
              <option value="18px">Large</option>
              <option value="24px">XL</option>
            </select>
            <ChevronDownIcon size={9} className="absolute right-0.5 pointer-events-none text-gray-400" />
          </div>

          {/* Text color */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="w-7 h-7 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-0.5"
              title="글씨 색상"
            >
              <span className="text-[11px] font-bold text-[#37352f] dark:text-[#e6e6e4] leading-none">A</span>
              <span
                className="w-4 h-1 rounded-sm"
                style={{ background: editor.getAttributes("textStyle").color ?? "#37352f" }}
              />
            </button>

            {showColorPicker && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl p-3 w-52"
                onMouseDown={(e) => e.preventDefault()}
              >
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">글씨 색상</p>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[
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
                  ].map(({ label, color }) => (
                    <button
                      key={label}
                      title={label}
                      onClick={() => {
                        if (color) {
                          editor.chain().focus().setColor(color).run();
                        } else {
                          editor.chain().focus().unsetColor().run();
                        }
                        setShowColorPicker(false);
                      }}
                      className="w-7 h-7 rounded-lg border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-500 transition-colors flex items-center justify-center"
                      style={{ background: color ?? "#f0f0f0" }}
                    >
                      {!color && (
                        <span className="text-[9px] text-gray-500 font-bold leading-none">기</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="#hex"
                    maxLength={7}
                    className="flex-1 h-6 px-2 rounded border border-[#e9e9e7] dark:border-[#3f3f3f] text-[11px] bg-transparent text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400"
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
                    className="h-6 px-2 rounded bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#37352f] text-[10px] font-semibold"
                  >
                    적용
                  </button>
                </div>
              </div>
            )}
          </div>
        </BubbleMenu>
      )}

      {/* Scrollable content — position:relative so absolute block controls are anchored here */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onDragLeave={(e) => {
          // Only clear when leaving the scroll container entirely
          if (!scrollContainerRef.current?.contains(e.relatedTarget as Node)) {
            setDropBtnIdx(null);
          }
        }}
      >
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

          {/* Child pages section — shown right after meta */}
          {page.children.length > 0 && !isMonthPage && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] uppercase tracking-wide">
                  하위 페이지
                </span>
                <button
                  onClick={() => {
                    const newId = createPage(pageId);
                    router.push(`/p/${newId}`);
                  }}
                  className="flex items-center gap-1 text-xs text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.04)] px-2 py-1 rounded transition-colors"
                >
                  <Plus size={12} />
                  새 페이지
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {page.children.map((childId) => {
                  const child = pages[childId];
                  if (!child) return null;
                  return (
                    <ChildPageCard
                      key={childId}
                      child={child}
                      onOpen={() => router.push(`/p/${childId}`)}
                      onRename={(title) => updatePage(childId, { title })}
                      onDelete={() => {
                        deletePage(childId);
                        if (pathname === `/p/${childId}`) router.push(`/p/${pageId}`);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Year page: bar chart + month manager */}
          {isYearPage && (
            <>
              <YearRevenueDashboard pageId={pageId} />
              <MonthPageManager pageId={pageId} />
            </>
          )}

          {/* Editor — hidden on month pages */}
          <div className={isMonthPage ? "hidden" : "tiptap-editor"}>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Month page: full-width embedded CRM outside max-w-3xl */}
        {isMonthPage && (
          <div className="px-4 pb-12">
            <CRMPage monthPageId={pageId} embedded />
          </div>
        )}

        {/* Per-block control group: ⋮⋮ drag · ➕ add · 🗑️ delete
            pointer-events-none on the wrapper so the transparent area
            between buttons never absorbs editor clicks. Each button
            re-enables pointer-events individually. */}
        {!blockMenuOpen && blockButtons.map((btn, idx) => (
          <div
            key={btn.docStart}
            style={{ position: "absolute", top: btn.top, left: btn.left, zIndex: 30 }}
            className="flex items-center gap-0.5 pointer-events-none"
          >
            {/* ⋮⋮ Drag handle */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, btn.docStart, btn.docEnd, idx)}
              onDragEnd={handleDragEnd}
              className="pointer-events-auto w-[18px] h-[18px] flex items-center justify-center rounded text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-colors"
              title="드래그하여 이동"
            >
              <GripVertical size={11} />
            </button>

            {/* ➕ Add block */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleInsertBlock(btn.docEnd)}
              className="pointer-events-auto w-[18px] h-[18px] flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="블록 추가"
            >
              <Plus size={12} />
            </button>

            {/* 🗑️ Delete block */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleDeleteBlock(btn.docStart, btn.docEnd)}
              className="pointer-events-auto w-[18px] h-[18px] flex items-center justify-center rounded text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="블록 삭제"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}

        {/* Blue drop-target indicator line shown while dragging */}
        {dropIndicator && (
          <div
            style={{
              position: "absolute",
              top: dropIndicator.top - 1,
              left: dropIndicator.left,
              right: 16,
              zIndex: 40,
              pointerEvents: "none",
            }}
            className="h-0.5 bg-blue-500 rounded-full"
          />
        )}
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
                {/* 미디어 그룹에 파일 업로드 항목 추가 */}
                {group === "미디어" && (
                  <>
                    <button
                      onClick={() => {
                        uploadPosRef.current = editor.state.selection.from;
                        setBlockMenuOpen(false);
                        imageInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f] transition-colors"
                    >
                      <span className="flex-shrink-0 text-gray-400"><ImageUp size={18} /></span>
                      <div>
                        <p className="text-sm font-medium leading-4">이미지 업로드</p>
                        <p className="text-xs text-gray-400 leading-4">컴퓨터에서 이미지 파일 삽입</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        uploadPosRef.current = editor.state.selection.from;
                        setBlockMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f] transition-colors"
                    >
                      <span className="flex-shrink-0 text-gray-400"><FileUp size={18} /></span>
                      <div>
                        <p className="text-sm font-medium leading-4">파일 업로드</p>
                        <p className="text-xs text-gray-400 leading-4">PDF, 문서 등 파일 첨부</p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Close block menu on outside click */}
      {blockMenuOpen && (
        <div className="fixed inset-0 z-[99]" onClick={() => setBlockMenuOpen(false)} />
      )}

      {/* Hidden file inputs for upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Upload loading overlay */}
      {uploading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20">
          <div className="bg-white dark:bg-[#252525] rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <span className="text-sm text-[#37352f] dark:text-[#e6e6e4]">파일 업로드 중...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Child page card with rename / delete ──────────────────────────────────────

function ChildPageCard({
  child,
  onOpen,
  onRename,
  onDelete,
}: {
  child: { id: string; title: string; emoji: string; children: string[] };
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(child.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const t = renameVal.trim();
    if (t && t !== child.title) onRename(t);
    setIsRenaming(false);
  };

  return (
    <>
      <div className="relative group">
        <button
          onClick={onOpen}
          className="w-full flex flex-col items-start px-4 py-4 rounded-xl border border-[#e9e9e7] dark:border-[#3f3f3f] hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-150 bg-white dark:bg-[#1e1e1c]"
        >
          <span className="text-3xl leading-none mb-3">{child.emoji || "📄"}</span>
          <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] line-clamp-2 group-hover:text-black dark:group-hover:text-white transition-colors">
            {child.title || "제목 없음"}
          </p>
          {child.children.length > 0 && (
            <p className="text-xs text-[#9b9a97] dark:text-[#6b6b6b] mt-1">
              하위 페이지 {child.children.length}개
            </p>
          )}
        </button>

        {/* 컨텍스트 메뉴 버튼 */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] shadow-sm"
          >
            <MoreHorizontal size={12} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl py-1 w-40 text-sm">
              <button
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setRenameVal(child.title); setIsRenaming(true); }}
              >
                <Pencil size={12} className="text-[#9b9a97]" /> 이름 변경
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                onClick={(e) => { e.stopPropagation(); onOpen(); }}
              >
                <ChevronRight size={12} className="text-[#9b9a97]" /> 열기
              </button>
              <div className="my-1 border-t border-[#e9e9e7] dark:border-[#3f3f3f]" />
              <button
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setShowDeleteConfirm(true); }}
              >
                <Trash2 size={12} /> 삭제
              </button>
            </div>
          )}
        </div>

        {/* 인라인 이름 변경 오버레이 */}
        {isRenaming && (
          <div className="absolute inset-0 z-40 flex items-end px-4 pb-4 rounded-xl bg-white/95 dark:bg-[#1e1e1c]/95 border border-blue-400">
            <div className="w-full">
              <p className="text-xs text-[#9b9a97] mb-1">새 이름 입력</p>
              <input
                ref={renameRef}
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                className="w-full px-2 py-1 text-sm border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-xl p-6 w-80 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 flex-shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4] text-sm">페이지 삭제</h2>
                <p className="text-xs text-[#9b9a97] mt-0.5">{child.emoji} {child.title || "제목 없음"}</p>
              </div>
            </div>
            <p className="text-sm text-[#9b9a97] mb-1">
              이 페이지{child.children.length > 0 ? `와 하위 페이지 ${child.children.length}개` : ""}를 삭제할까요?
            </p>
            <p className="text-xs text-red-400 mb-5">삭제한 페이지는 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
