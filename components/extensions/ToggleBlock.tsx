"use client";

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { useRef, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

// ─── React NodeView ───────────────────────────────────────────────────────────

function ToggleView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const isOpen = node.attrs.isOpen as boolean;
  const title = node.attrs.title as string;
  const autoFocus = node.attrs.autoFocus as boolean;
  const titleRef = useRef<HTMLDivElement>(null);

  // Sync title div content when it changes externally (skip when focused)
  useEffect(() => {
    const el = titleRef.current;
    if (!el || document.activeElement === el) return;
    if (el.innerText !== title) {
      el.innerText = title;
    }
  }, [title]);

  // Auto-focus new toggles created via Enter
  useEffect(() => {
    if (!autoFocus) return;
    updateAttributes({ autoFocus: false });
    setTimeout(() => {
      const el = titleRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const commitTitle = useCallback(() => {
    updateAttributes({ title: titleRef.current?.innerText ?? "" });
  }, [updateAttributes]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent Enter from inserting a newline in the contenteditable
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle();

      if (typeof getPos !== "function") return;
      const ourPos = getPos();
      const insertPos = ourPos + node.nodeSize;

      setTimeout(() => {
        editor.chain().focus().insertContentAt(insertPos, {
          type: "toggleBlock",
          attrs: { isOpen: true, title: "", autoFocus: true },
          content: [{ type: "paragraph" }],
        }).run();
      }, 0);
      return;
    }

    // Escape → blur title
    if (e.key === "Escape") {
      e.preventDefault();
      commitTitle();
      titleRef.current?.blur();
      return;
    }

    // Tab → indent: move this toggle inside the previous sibling toggle
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      commitTitle();
      if (typeof getPos !== "function") return;

      const ourPos = getPos();
      const { doc } = editor.state;
      const $pos = doc.resolve(ourPos);
      const parent = $pos.parent;
      const contentStart = $pos.start($pos.depth);

      let prevToggleStart = -1;
      let prevToggleNodeSize = 0;
      let offset = contentStart;

      for (let i = 0; i < parent.childCount; i++) {
        const child = parent.child(i);
        if (offset === ourPos) break;
        if (child.type.name === "toggleBlock") {
          prevToggleStart = offset;
          prevToggleNodeSize = child.nodeSize;
        } else {
          prevToggleStart = -1;
        }
        offset += child.nodeSize;
      }

      if (prevToggleStart < 0) return;

      const ourNode = doc.nodeAt(ourPos)!;
      const insertIntoPos = prevToggleStart + prevToggleNodeSize - 1;

      editor.chain().focus().command(({ tr, dispatch }) => {
        tr.delete(ourPos, ourPos + ourNode.nodeSize);
        const mapped = tr.mapping.map(insertIntoPos);
        tr.insert(mapped, ourNode);
        if (dispatch) dispatch(tr);
        return true;
      }).run();
      return;
    }

    // Shift+Tab → outdent: lift this toggle out of its parent toggle
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      commitTitle();
      if (typeof getPos !== "function") return;

      const ourPos = getPos();
      const { doc } = editor.state;
      const $pos = doc.resolve(ourPos);
      const depth = $pos.depth;

      if (depth < 1) return;
      const parentNode = $pos.node(depth - 1);
      if (parentNode.type.name !== "toggleBlock") return;

      const parentEnd = $pos.before(depth - 1) + parentNode.nodeSize;
      const ourNode = doc.nodeAt(ourPos)!;

      editor.chain().focus().command(({ tr, dispatch }) => {
        tr.delete(ourPos, ourPos + ourNode.nodeSize);
        const insertPos = tr.mapping.map(parentEnd);
        tr.insert(insertPos, ourNode);
        if (dispatch) dispatch(tr);
        return true;
      }).run();
    }
  }, [commitTitle, editor, getPos, node, updateAttributes]);

  return (
    <NodeViewWrapper>
      <div className="toggle-block my-1" data-type="toggleBlock">
        {/* Header row — fully non-editable by ProseMirror */}
        <div className="flex items-start gap-1" contentEditable={false}>
          <button
            onClick={() => updateAttributes({ isOpen: !isOpen })}
            className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Title — its own contentEditable, independent of ProseMirror */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            data-placeholder="토글 제목 입력..."
            className="flex-1 min-w-0 outline-none text-base font-medium text-[#37352f] dark:text-[#e6e6e4] leading-6 cursor-text toggle-title"
          />
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
          } catch { /* ignore if position invalid */ }
          if (dispatch) dispatch(tr);
          return true;
        }).run();
        return true;
      },

      // Shift+Tab inside toggle content → lift current block out of its closest toggle parent
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
