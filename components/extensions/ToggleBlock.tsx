"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

// ─── React NodeView ───────────────────────────────────────────────────────────

function ToggleView({
  node,
  updateAttributes,
}: {
  node: { attrs: { isOpen: boolean; title: string } };
  updateAttributes: (attrs: Partial<{ isOpen: boolean; title: string }>) => void;
}) {
  const isOpen = node.attrs.isOpen;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.attrs.title);

  return (
    <NodeViewWrapper>
      <div className="toggle-block my-1">
        {/* Header row */}
        <div className="flex items-start gap-1 group">
          <button
            contentEditable={false}
            onClick={() => updateAttributes({ isOpen: !isOpen })}
            className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Editable title */}
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                updateAttributes({ title: draft });
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.preventDefault();
                  updateAttributes({ title: draft });
                  setEditing(false);
                }
              }}
              className="flex-1 bg-transparent outline-none text-base font-medium text-[#37352f] dark:text-[#e6e6e4] leading-6"
            />
          ) : (
            <span
              contentEditable={false}
              onClick={() => { setDraft(node.attrs.title); setEditing(true); }}
              className="flex-1 cursor-text text-base font-medium text-[#37352f] dark:text-[#e6e6e4] leading-6 min-h-[24px]"
            >
              {node.attrs.title || <span className="text-gray-300 dark:text-gray-600 font-normal text-sm">토글 제목 입력...</span>}
            </span>
          )}
        </div>

        {/* Body content */}
        <div className={`toggle-content pl-6 mt-1 ${!isOpen ? "hidden" : ""}`}>
          <NodeViewContent />
        </div>
      </div>
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
      isOpen: { default: true },
      title: { default: "" },
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
    return ReactNodeViewRenderer(ToggleView as Parameters<typeof ReactNodeViewRenderer>[0]);
  },

  addCommands() {
    return {
      insertToggleBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { isOpen: true, title: "" },
            content: [{ type: "paragraph" }],
          });
        },
    } as Record<string, unknown>;
  },
});
