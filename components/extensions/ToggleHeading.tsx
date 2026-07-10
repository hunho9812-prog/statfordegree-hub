"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown, GripVertical, Plus, Trash2, ImageUp, FileUp, Loader2 } from "lucide-react";

// ─── React NodeView ────────────────────────────────────────────────────────────

function ToggleHeadingView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const isOpen = node.attrs.isOpen as boolean;
  const level = node.attrs.level as 2 | 3;
  const title = node.attrs.title as string;
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addChildBlock = useCallback(() => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    const nodeSize = node.nodeSize;
    editor.chain().focus().insertContentAt(pos + nodeSize - 1, { type: "paragraph" }).run();
  }, [editor, getPos, node]);

  // ── Upload logic (self-contained within the NodeView) ─────────────────────
  const doUpload = useCallback(async (file: File, isImage: boolean) => {
    if (typeof getPos !== "function") return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "업로드 실패"); return; }

      // Insert at end of toggle body (pos + nodeSize - 1 puts us just before closing)
      const insertPos = getPos() + node.nodeSize - 1;
      const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(json.name ?? "");

      if (isImage) {
        editor.chain().focus().insertContentAt(
          insertPos,
          `<img src="${json.url}" alt="${json.name}" class="tiptap-image" />`
        ).run();
      } else if (isVideo) {
        editor.chain().focus().insertContentAt(insertPos, {
          type: "videoBlock",
          attrs: { src: json.url, title: json.name },
        }).run();
      } else {
        editor.chain().focus().insertContentAt(
          insertPos,
          `<a href="/api/download?url=${encodeURIComponent(json.url)}&name=${encodeURIComponent(json.name)}" class="tiptap-file-link">📎 ${json.name}</a>`
        ).run();
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }, [editor, getPos, node]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file, true);
    e.target.value = "";
  }, [doUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file, false);
    e.target.value = "";
  }, [doUpload]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const headingClass =
    level === 2
      ? "text-[1.15rem] font-semibold text-[#37352f] dark:text-[#e6e6e4] leading-7"
      : "text-[1rem] font-semibold text-[#37352f] dark:text-[#e6e6e4] leading-6";

  const indentLeft = level === 3 ? "pl-4" : "";

  return (
    <NodeViewWrapper>
      <div className={`toggle-heading-block my-0.5 ${indentLeft}`} data-level={level}>
        {/* Header row */}
        <div className="flex items-center gap-0.5 group/header">
          {/* Drag handle */}
          <span
            contentEditable={false}
            draggable
            data-drag-handle
            className="opacity-0 group-hover/header:opacity-40 hover:!opacity-70 flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 p-0.5 rounded"
            title="드래그하여 이동"
          >
            <GripVertical size={13} />
          </span>

          {/* Toggle chevron */}
          <button
            contentEditable={false}
            onClick={() => updateAttributes({ isOpen: !isOpen })}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={isOpen ? "접기" : "펼치기"}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Editable title — plain <input> inside contentEditable={false}.
              Browser focuses it natively; ProseMirror ignores events here. */}
          <input
            ref={inputRef}
            type="text"
            defaultValue={title}
            key={title}
            onBlur={(e) => updateAttributes({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                updateAttributes({ title: (e.target as HTMLInputElement).value });
                inputRef.current?.blur();
              }
            }}
            placeholder={level === 2 ? "중주제 입력..." : "소주제 입력..."}
            contentEditable={false}
            className={`flex-1 min-w-0 bg-transparent outline-none border-0 p-0 ${headingClass} placeholder-gray-300 dark:placeholder-gray-600 cursor-text`}
          />

          {/* Action buttons — visible on hover */}
          <div contentEditable={false} className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
            {uploading ? (
              <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                <Loader2 size={12} className="animate-spin" />
              </span>
            ) : (
              <>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  title="이미지 업로드"
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"
                >
                  <ImageUp size={12} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="파일 업로드"
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"
                >
                  <FileUp size={12} />
                </button>
              </>
            )}
            <button
              onClick={addChildBlock}
              title="내용 추가"
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={deleteNode}
              title="삭제"
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Body content */}
        {isOpen && (
          <div className={`toggle-heading-body mt-0.5 ${level === 2 ? "pl-5 ml-[9px] border-l-2 border-[#e9e9e7] dark:border-[#3a3a3a]" : "pl-4 ml-[9px] border-l border-[#e9e9e7] dark:border-[#3a3a3a]"}`}>
            <NodeViewContent />
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

    </NodeViewWrapper>
  );
}

// ─── TipTap Node ──────────────────────────────────────────────────────────────

export const ToggleHeading = Node.create({
  name: "toggleHeading",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      level: { default: 2 },
      isOpen: { default: true },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='toggle-heading']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle-heading",
        "data-level": HTMLAttributes.level,
        "data-open": HTMLAttributes.isOpen,
      }),
      ["span", { class: "toggle-heading-title" }, HTMLAttributes.title ?? ""],
      ["div", { class: "toggle-heading-content" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleHeadingView);
  },

  addCommands() {
    return {
      insertToggleH2:
        () =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: "toggleHeading",
            attrs: { level: 2, isOpen: true, title: "" },
            content: [{ type: "paragraph" }],
          });
        },
      insertToggleH3:
        () =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: "toggleHeading",
            attrs: { level: 3, isOpen: true, title: "" },
            content: [{ type: "paragraph" }],
          });
        },
    } as Record<string, unknown>;
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-2": () => {
        return (this.editor.commands as unknown as Record<string, () => boolean>).insertToggleH2?.() ?? false;
      },
      "Mod-Alt-3": () => {
        return (this.editor.commands as unknown as Record<string, () => boolean>).insertToggleH3?.() ?? false;
      },
    };
  },
});
