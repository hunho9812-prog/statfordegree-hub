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
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus new toggles created via Enter
  useEffect(() => {
    if (!autoFocus) return;
    updateAttributes({ autoFocus: false });
    setTimeout(() => inputRef.current?.focus(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateAttributes({ title: inputRef.current?.value ?? "" });
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
    if (e.key === "Escape") {
      e.preventDefault();
      inputRef.current?.blur();
      return;
    }
    // Tab → indent into previous sibling toggle
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
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
    // Shift+Tab → outdent
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
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
  }, [editor, getPos, node, updateAttributes]);

  return (
    <NodeViewWrapper>
      <div className="toggle-block my-1" data-type="toggleBlock">
        {/* Header — contentEditable={false} so ProseMirror ignores events here.
            The <input> inside is a native form element: browser focuses it directly,
            no conflict with ProseMirror's selection logic. */}
        <div className="flex items-start gap-1" contentEditable={false}>
          <button
            onClick={() => updateAttributes({ isOpen: !isOpen })}
            className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <input
            ref={inputRef}
            type="text"
            defaultValue={title}
            key={title}           /* re-initialize when title changes externally */
            onBlur={(e) => updateAttributes({ title: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="토글 제목 입력..."
            className="flex-1 min-w-0 bg-transparent outline-none border-0 p-0 text-base font-medium text-[#37352f] dark:text-[#e6e6e4] leading-6 placeholder-gray-300 dark:placeholder-gray-600 cursor-text"
          />
        </div>

        {/* Body — NodeViewContent = ProseMirror contentDOM, fully editable.
            Always in DOM (display:none when closed) so contentDOM stays attached. */}
        <NodeViewContent className={`toggle-content pl-6 mt-1${!isOpen ? " hidden" : ""}`} />
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
    return ReactNodeViewRenderer(ToggleView, {
      // Default stopEvent uses this.contentDOM.contains(target) which can fail
      // when contentDOMElement isn't mounted yet. Use CSS-selector approach instead:
      // events inside [data-node-view-content] go to ProseMirror; everything else is stopped.
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement;
        return !target.closest("[data-node-view-content]");
      },
    });
  },

  addKeyboardShortcuts() {
    return {
      // Enter on empty last paragraph → exit toggle
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;
        if (!empty || $from.parent.type.name !== "paragraph") return false;
        let toggleDepth = $from.depth - 1;
        while (toggleDepth > 0 && $from.node(toggleDepth).type.name !== "toggleBlock") toggleDepth--;
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
              tr.delete($from.before($from.depth), $from.after($from.depth));
            }
            const insertPos = tr.mapping.map(toggleEnd);
            tr.insert(insertPos, s.schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
            if (dispatch) dispatch(tr);
            return true;
          }).run();
          return true;
        }
        return false;
      },

      // Tab inside toggle content → nest in new child toggle
      Tab: () => {
        const { $from } = this.editor.state.selection;
        let toggleDepth = $from.depth - 1;
        while (toggleDepth > 0 && $from.node(toggleDepth).type.name !== "toggleBlock") toggleDepth--;
        if (toggleDepth === 0 || $from.node(toggleDepth).type.name !== "toggleBlock") return false;
        const blockDepth = toggleDepth + 1;
        if (blockDepth > $from.depth) return false;
        const blockNode = $from.node(blockDepth);
        if (blockNode.type.name === "toggleBlock") return false;
        const blockStart = $from.before(blockDepth);
        const blockEnd = $from.after(blockDepth);
        this.editor.chain().focus().command(({ tr, dispatch }) => {
          const newToggle = this.type.create({ isOpen: true, title: "", autoFocus: false }, blockNode);
          tr.replaceWith(blockStart, blockEnd, newToggle);
          try { tr.setSelection(TextSelection.near(tr.doc.resolve(blockStart + 2))); } catch { /* ok */ }
          if (dispatch) dispatch(tr);
          return true;
        }).run();
        return true;
      },

      // Shift+Tab inside toggle content → lift out
      "Shift-Tab": () => {
        const { $from } = this.editor.state.selection;
        let toggleDepth = $from.depth - 1;
        while (toggleDepth > 0 && $from.node(toggleDepth).type.name !== "toggleBlock") toggleDepth--;
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
          try { tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1))); } catch { /* ok */ }
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
