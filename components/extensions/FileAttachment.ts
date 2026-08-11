import { Node, mergeAttributes } from "@tiptap/core";

export const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      href: { default: null },
      name: { default: "" },
      ext: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a.tiptap-file-link",
        getAttrs: (el) => {
          const a = el as HTMLElement;
          return {
            href: a.getAttribute("href"),
            ext: a.getAttribute("data-ext") ?? "",
            name: a.textContent?.replace(/^📎\s*/, "").trim() ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes({
        class: "tiptap-file-link",
        "data-ext": HTMLAttributes.ext,
        href: HTMLAttributes.href,
      }),
      `📎 ${HTMLAttributes.name}`,
    ];
  },
});
