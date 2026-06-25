"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";

// ─── React NodeView ────────────────────────────────────────────────────────────

function ToggleHeadingView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const isOpen = node.attrs.isOpen as boolean;
  const level = node.attrs.level as 2 | 3;
  const title = node.attrs.title as string;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft if title attr changes externally (e.g. undo/redo)
  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  const commitTitle = useCallback(() => {
    updateAttributes({ title: draft });
    setEditing(false);
  }, [draft, updateAttributes]);

  const startEditing = useCallback(() => {
    setDraft(title);
    setEditing(true);
    // Focus input on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [title]);

  const addChildBlock = useCallback(() => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    const nodeSize = node.nodeSize;
    // Insert paragraph just before the node closes (inside the body)
    editor.chain().focus().insertContentAt(pos + nodeSize - 1, { type: "paragraph" }).run();
  }, [editor, getPos, node]);

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
          {/* Drag handle — only visible in the hover group */}
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

          {/* Editable title */}
          <div className={`flex-1 min-w-0 ${headingClass}`} contentEditable={false}>
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.preventDefault();
                    commitTitle();
                  }
                }}
                className={`w-full bg-transparent outline-none ${headingClass} border-b border-blue-300 dark:border-blue-600 pb-0.5`}
                placeholder={level === 2 ? "중주제 입력..." : "소주제 입력..."}
              />
            ) : (
              <span
                onClick={startEditing}
                className="cursor-text min-h-[1em] block"
              >
                {title || (
                  <span className="text-gray-300 dark:text-gray-600 font-normal text-sm">
                    {level === 2 ? "중주제 입력..." : "소주제 입력..."}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Action buttons — on header hover */}
          <div contentEditable={false} className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
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
      </div>
    </NodeViewWrapper>
  );
}

// ─── TipTap Node ──────────────────────────────────────────────────────────────

export const ToggleHeading = Node.create({
  name: "toggleHeading",
  group: "block",
  // Allow any block content including nested toggleHeading
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
      // Cmd/Ctrl+Alt+2 → insert toggle H2
      "Mod-Alt-2": () => {
        return (this.editor.commands as unknown as Record<string, () => boolean>).insertToggleH2?.() ?? false;
      },
      // Cmd/Ctrl+Alt+3 → insert toggle H3
      "Mod-Alt-3": () => {
        return (this.editor.commands as unknown as Record<string, () => boolean>).insertToggleH3?.() ?? false;
      },
    };
  },
});
