"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";

const CALLOUT_COLORS: Record<string, { bg: string; border: string; dark: string }> = {
  yellow: { bg: "bg-yellow-50",   border: "border-yellow-200",   dark: "dark:bg-yellow-950/20 dark:border-yellow-800/40" },
  blue:   { bg: "bg-blue-50",     border: "border-blue-200",     dark: "dark:bg-blue-950/20 dark:border-blue-800/40" },
  green:  { bg: "bg-green-50",    border: "border-green-200",    dark: "dark:bg-green-950/20 dark:border-green-800/40" },
  red:    { bg: "bg-red-50",      border: "border-red-200",      dark: "dark:bg-red-950/20 dark:border-red-800/40" },
  purple: { bg: "bg-purple-50",   border: "border-purple-200",   dark: "dark:bg-purple-950/20 dark:border-purple-800/40" },
  gray:   { bg: "bg-gray-50",     border: "border-gray-200",     dark: "dark:bg-gray-900/40 dark:border-gray-700/40" },
};

const CALLOUT_EMOJIS = ["💡", "⚠️", "📌", "✅", "❌", "🔥", "📝", "💬", "🚀", "🎯", "ℹ️", "🔑"];
const COLOR_KEYS = Object.keys(CALLOUT_COLORS);

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const emoji = node.attrs.emoji as string;
  const color = node.attrs.color as string;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const colors = CALLOUT_COLORS[color] ?? CALLOUT_COLORS.yellow;

  return (
    <NodeViewWrapper>
      <div
        className={`callout-block my-2 flex gap-3 rounded-lg border px-4 py-3 ${colors.bg} ${colors.border} ${colors.dark}`}
      >
        {/* Emoji picker */}
        <div className="relative flex-shrink-0" contentEditable={false}>
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="text-xl leading-6 hover:bg-black/10 dark:hover:bg-white/10 rounded px-0.5 transition-colors"
          >
            {emoji}
          </button>
          {showEmojiPicker && (
            <div className="absolute left-0 top-8 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-lg p-3 w-64">
              <div className="grid grid-cols-6 gap-1 mb-2">
                {CALLOUT_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { updateAttributes({ emoji: e }); setShowEmojiPicker(false); }}
                    className="text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 mt-1 justify-center">
                {COLOR_KEYS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { updateAttributes({ color: c }); setShowEmojiPicker(false); }}
                    className={`w-5 h-5 rounded-full border-2 ${CALLOUT_COLORS[c].bg} ${
                      color === c ? "border-blue-500" : "border-transparent"
                    }`}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const CalloutBlock = Node.create({
  name: "calloutBlock",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: { default: "💡" },
      color: { default: "yellow" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='callout']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout" }),
      ["span", { class: "callout-emoji" }, HTMLAttributes.emoji ?? "💡"],
      ["div", { class: "callout-content" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      insertCalloutBlock:
        (attrs?: { emoji?: string; color?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { emoji: "💡", color: "yellow", ...attrs },
            content: [{ type: "paragraph" }],
          });
        },
    } as Record<string, unknown>;
  },
});
