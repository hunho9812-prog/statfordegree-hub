"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { ChevronRight, ChevronDown } from "lucide-react";

// ─── React NodeView ───────────────────────────────────────────────────────────
// Title = first child paragraph (fully ProseMirror-managed, no native input).
// Body = remaining children, hidden via CSS when closed.

function ToggleView({ node, updateAttributes }: NodeViewProps) {
  const isOpen = node.attrs.isOpen as boolean;

  return (
    <NodeViewWrapper>
      <div className="toggle-block my-1">
        <div className="flex items-start gap-1">
          <button
            contentEditable={false}
            onClick={() => updateAttributes({ isOpen: !isOpen })}
            className="flex-shrink-0 mt-[3px] w-5 h-5 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isOpen ? "접기" : "펼치기"}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {/* All content — first child is the "title", rest is body */}
          <NodeViewContent className={`toggle-body flex-1 min-w-0${!isOpen ? " toggle-closed" : ""}`} />
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
    };
  },

  parseHTML() {
    return [{ tag: "details[data-type='toggle']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, { "data-type": "toggle", open: HTMLAttributes.isOpen }),
      ["div", {}, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addKeyboardShortcuts() {
    return {
      // Enter on empty last body paragraph → exit toggle
      Enter: () => {
        const { state } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type.name !== "paragraph") return false;

        let depth = $from.depth - 1;
        while (depth > 0 && $from.node(depth).type.name !== "toggleBlock") depth--;
        if ($from.node(depth).type.name !== "toggleBlock") return false;

        const toggleNode = $from.node(depth);
        const toggleStart = $from.before(depth);
        const toggleEnd = toggleStart + toggleNode.nodeSize;
        const isFirstChild = $from.index(depth) === 0;
        const isLastChild = $from.indexAfter(depth) === toggleNode.childCount;
        const isEmpty = $from.parent.textContent === "";

        // Enter in title (first child) → normal behaviour (creates body paragraph)
        if (isFirstChild) return false;
        // Enter on non-last body paragraph → normal behaviour
        if (!isLastChild) return false;
        // Enter on non-empty last body paragraph → normal behaviour
        if (!isEmpty) return false;

        // Empty last body paragraph → remove it and add paragraph after toggle
        this.editor.chain().focus().command(({ tr, dispatch, state: s }) => {
          if (toggleNode.childCount > 1) {
            tr.delete($from.before($from.depth), $from.after($from.depth));
          }
          const insertPos = tr.mapping.map(toggleEnd);
          tr.insert(insertPos, s.schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
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
            attrs: { isOpen: true },
            content: [{ type: "paragraph" }],
          });
        },
    } as Record<string, unknown>;
  },
});
