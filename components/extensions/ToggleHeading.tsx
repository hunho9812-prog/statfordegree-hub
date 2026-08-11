"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, GripVertical, Plus, Trash2, ImageUp, FileUp, Loader2 } from "lucide-react";

// ─── React NodeView ────────────────────────────────────────────────────────────
// Title = first child paragraph styled as h2/h3 via CSS (no native input).
// Body = remaining children, shown/hidden via CSS.

function ToggleHeadingView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const isOpen = node.attrs.isOpen as boolean;
  const level = node.attrs.level as 2 | 3;
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    const legacyTitle = node.attrs.title as string;
    if (!legacyTitle || typeof getPos !== "function") return;
    const firstChild = node.firstChild;
    if (!firstChild || firstChild.textContent !== "") return;
    const insertPos = getPos() + 2;
    setTimeout(() => {
      editorRef.current.chain().insertContentAt(insertPos, legacyTitle).run();
      updateAttributes({ title: "" });
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addChildBlock = useCallback(() => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    const nodeSize = node.nodeSize;
    editor.chain().focus().insertContentAt(pos + nodeSize - 1, { type: "paragraph" }).run();
  }, [editor, getPos, node]);

  const doUpload = useCallback(async (file: File, isImage: boolean) => {
    if (typeof getPos !== "function") return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "업로드 실패"); return; }
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
          `<a href="/api/download?url=${encodeURIComponent(json.url)}&name=${encodeURIComponent(json.name)}" class="tiptap-file-link" data-ext="${(json.name ?? "").split(".").pop()?.toLowerCase() ?? ""}">📎 ${json.name}</a>`
        ).run();
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }, [editor, getPos, node]);

  const indentLeft = level === 3 ? "pl-4" : "";

  return (
    <NodeViewWrapper>
      <div className={`toggle-heading-block my-0.5 ${indentLeft}`} data-level={level}>
        <div className="flex items-start gap-0.5 group/header">
          {/* Drag handle */}
          <span
            contentEditable={false}
            draggable
            data-drag-handle
            className="opacity-0 group-hover/header:opacity-40 hover:!opacity-70 flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-400 p-0.5 rounded"
            title="드래그하여 이동"
          >
            <GripVertical size={13} />
          </span>

          {/* Toggle chevron */}
          <button
            contentEditable={false}
            onClick={() => updateAttributes({ isOpen: !isOpen })}
            className="flex-shrink-0 mt-[2px] w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={isOpen ? "접기" : "펼치기"}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* All content — first child is title (styled as h2/h3), rest is body */}
          <NodeViewContent
            className={`toggle-heading-body flex-1 min-w-0 level-${level}${!isOpen ? " toggle-closed" : ""}`}
          />

          {/* Action buttons */}
          <div contentEditable={false} className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity mt-[2px]">
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

        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f, true); e.target.value = ""; }} />
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f, false); e.target.value = ""; }} />
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
            attrs: { level: 2, isOpen: true },
            content: [{ type: "paragraph" }],
          });
        },
      insertToggleH3:
        () =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: "toggleHeading",
            attrs: { level: 3, isOpen: true },
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
