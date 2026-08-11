import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

function VideoView({ node }: NodeViewProps) {
  const src = node.attrs.src as string;
  const title = node.attrs.title as string;
  const isYoutube = /youtube\.com|youtu\.be/.test(src);
  const embedSrc = isYoutube
    ? src.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")
    : null;

  return (
    <NodeViewWrapper className="my-3">
      <div className="rounded-lg overflow-hidden border border-[#e9e9e7] dark:border-[#3f3f3f] bg-black">
        {embedSrc ? (
          <iframe
            src={embedSrc}
            className="w-full aspect-video"
            allowFullScreen
            title={title}
          />
        ) : (
          <video
            src={src}
            controls
            className="w-full max-h-96"
            title={title}
          />
        )}
      </div>
      {title && (
        <p className="text-xs text-center text-[#9b9a97] mt-1">{title}</p>
      )}
    </NodeViewWrapper>
  );
}

export const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='video-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
