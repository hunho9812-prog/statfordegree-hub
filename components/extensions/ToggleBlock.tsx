"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronDown } from "lucide-react";

// ─── Portal input overlay rendered outside ProseMirror DOM ───────────────────

interface TitleEditorPortalProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  value: string;
  onCommit: (val: string) => void;
  onCancel: () => void;
}

function TitleEditorPortal({ anchorRef, value, onCommit, onCancel }: TitleEditorPortalProps) {
  const [draft, setDraft] = useState(value);

  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); onCommit(draft); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  };

  return createPortal(
    <input
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={handleKeyDown}
      placeholder="토글 제목 입력..."
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: Math.max(rect.width, 200),
        zIndex: 9999,
      }}
      className="bg-white dark:bg-[#252525] border border-blue-400 rounded px-1 py-0.5 text-base font-medium text-[#37352f] dark:text-[#e6e6e4] outline-none shadow-md"
    />,
    document.body,
  );
}

// ─── React NodeView ───────────────────────────────────────────────────────────

function ToggleView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const isOpen = node.attrs.isOpen as boolean;
  const title = node.attrs.title as string;
  const autoFocus = node.attrs.autoFocus as boolean;
  const [editing, setEditing] = useState(false);
  const titleSpanRef = useRef<HTMLSpanElement>(null);

  // Auto-focus new toggles created via Enter
  useEffect(() => {
    if (!autoFocus) return;
    updateAttributes({ autoFocus: false });
    setTimeout(() => setEditing(true), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const handleCommit = useCallback((val: string) => {
    updateAttributes({ title: val });
    setEditing(false);
  }, [updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  return (
    <NodeViewWrapper>
      <div className="toggle-block my-1" data-type="toggleBlock">
        {/* Header row */}
        <div className="flex items-start gap-1 group" contentEditable={false}>
          <button
            onClick={() => updateAttributes({ isOpen: !isOpen })}
            className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Title — click to edit */}
          <span
            ref={titleSpanRef}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditing(true);
            }}
            className="flex-1 min-w-0 text-base font-medium text-[#37352f] dark:text-[#e6e6e4] leading-6 min-h-[24px] cursor-text select-none block"
          >
            {title || (
              <span className="text-gray-300 dark:text-gray-600 font-normal text-sm">
                토글 제목 입력...
              </span>
            )}
          </span>
        </div>

        {/* Body content */}
        <div className={`toggle-content pl-6 mt-1 ${!isOpen ? "hidden" : ""}`}>
          <NodeViewContent />
        </div>
      </div>

      {/* Portal input — renders outside ProseMirror, avoids all focus conflicts */}
      {editing && (
        <TitleEditorPortal
          anchorRef={titleSpanRef}
          value={title}
          onCommit={handleCommit}
          onCancel={handleCancel}
        />
      )}
    </NodeViewWrapper>
  );
}

// ─── TipTap Node ──────────────────────────────────────────────────────────────

export const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      isOpen:    { default: true },
      title:     { default: "" },
      autoFocus: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "details[data-type='toggle']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, { "data-type": "toggle", open: HTMLAttributes.isOpen }),
      ["summary", {}, HTMLAttributes.title || ""],
      ["div", {}, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addKeyboardShortcuts() {
    return {
      // Enter on empty last paragraph inside a toggle → exit toggle
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty || $from.parent.type.name !== "paragraph") return false;

        let toggleDepth = $from.depth - 1;
        while (toggleDepth > 0 && $from.node(toggleDepth).type.name !== "toggleBlock") {
          toggleDepth--;
        }
        if (toggleDepth === 0 || $from.node(toggleDepth).type.name !== "toggleBlock") return false;

        const toggleNode = $from.node(toggleDepth);
        const toggleStart = $from.before(toggleDepth);
        const toggleEnd = toggleStart + toggleNode.nodeSize;

        const paragraphIsEmpty = $from.parent.textContent === "";
        const isLastChild = $from.indexAfter(toggleDepth) === toggleNode.childCount;

        if (!isLastChild) return false;

        if (paragraphIsEmpty) {
          this.editor.chain().focus().command(({ tr, dispatch, state: s }) => {
            if (toggleNode.childCount > 1) {
              const paraStart = $from.before($from.depth);
              const paraEnd = $from.after($from.depth);
              tr.delete(paraStart, paraEnd);
            }
            const insertPos = tr.mapping.map(toggleEnd);
            tr.insert(insertPos, s.schema.nodes.paragraph.create());
            const sel = TextSelection.near(tr.doc.resolve(insertPos + 1));
            tr.setSelection(sel);
            if (dispatch) dispatch(tr);
            return true;
          }).run();
          return true;
        }

        return false;
      },

      // Tab inside toggle content → wrap current block in a new child toggleBlock
      Tab: () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        let toggleDepth = $from.depth - 1;
        while (toggleDepth > 0 && $from.node(toggleDepth).type.name !== "toggleBlock") {
          toggleDepth--;
        }
        if (toggleDepth === 0 || $from.node(toggleDepth).type.name !== "toggleBlock") return false;

        const blockDepth = toggleDepth + 1;
        if (blockDepth > $from.depth) return false;
        const blockNode = $from.node(blockDepth);

        if (blockNode.type.name === "toggleBlock") return false;

        const blockStart = $from.before(blockDepth);
        const blockEnd = $from.after(blockDepth);

        this.editor.chain().focus().command(({ tr, dispatch }) => {
          const newToggle = this.type.create(
            { isOpen: true, title: "", autoFocus: false },
            blockNode,
          );
          tr.replaceWith(blockStart, blockEnd, newToggle);
          try {
            const sel = TextSelection.near(tr.doc.resolve(blockStart + 2));
            tr.setSelection(sel);
          } catch { /* ignore */ }
          if (dispatch) dispatch(tr);
          return true;
        }).run();
        return true;
      },

      // Shift+Tab inside toggle content → lift current block out
      "Shift-Tab": () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        let toggleDepth = $from.depth - 1;
        while (toggleDepth > 0 && $from.node(toggleDepth).type.name !== "toggleBlock") {
          toggleDepth--;
        }
        if (toggleDepth === 0 || $from.node(toggleDepth).type.name !== "toggleBlock") return false;

        const toggleNode = $from.node(toggleDepth);
        const toggleStart = $from.before(toggleDepth);
        const toggleEnd = toggleStart + toggleNode.nodeSize;

        const blockDepth = toggleDepth + 1;
        if (blockDepth > $from.depth) return false;
        const blockNode = $from.node(blockDepth);
        const blockStart = $from.before(blockDepth);
        const blockEnd = $from.after(blockDepth);

        this.editor.chain().focus().command(({ tr, dispatch }) => {
          tr.delete(blockStart, blockEnd);
          const insertPos = tr.mapping.map(toggleEnd);
          tr.insert(insertPos, blockNode);
          try {
            const sel = TextSelection.near(tr.doc.resolve(insertPos + 1));
            tr.setSelection(sel);
          } catch { /* ignore */ }
          if (dispatch) dispatch(tr);
          return true;
        }).run();
        return true;
      },
    };
  },

  addCommands() {
    return {
      insertToggleBlock:
        () =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: { isOpen: true, title: "", autoFocus: false },
            content: [{ type: "paragraph" }],
          });
        },
    } as Record<string, unknown>;
  },
});
