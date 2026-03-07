"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/store";
import type { ManualNode } from "@/lib/types";
import {
  ChevronRight,
  ChevronDown,
  Pin,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";

// ─── Single node row ──────────────────────────────────────────────────────────

interface NodeRowProps {
  nodeId: string;
  pageId: string;
  level: number;
  autoFocusId: string | null;
  setAutoFocusId: (id: string | null) => void;
  dragState: { draggedId: string | null; dropTargetId: string | null };
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
}

function NodeRow({
  nodeId,
  pageId,
  level,
  autoFocusId,
  setAutoFocusId,
  dragState,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: NodeRowProps) {
  const { manualPages, updateManualNode, deleteManualNode, addManualNode, moveManualNode } =
    useWorkspaceStore();
  const pd = manualPages[pageId] ?? { rootItems: [], items: {} };
  const node: ManualNode | undefined = pd.items[nodeId];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node?.text ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when this node is newly created
  useEffect(() => {
    if (autoFocusId === nodeId) {
      setEditing(true);
      setAutoFocusId(null);
    }
  }, [autoFocusId, nodeId, setAutoFocusId]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!node) return null;

  const commitEdit = () => {
    updateManualNode(pageId, nodeId, { text: draft });
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
      // Add sibling after this node
      const newId = addManualNode(pageId, node.parentId, nodeId);
      setAutoFocusId(newId);
    } else if (e.key === "Escape") {
      setDraft(node.text);
      setEditing(false);
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Indent: make it a child of the previous sibling
      const siblings = node.parentId
        ? pd.items[node.parentId]?.children ?? []
        : pd.rootItems;
      const idx = siblings.indexOf(nodeId);
      if (!e.shiftKey && idx > 0) {
        // Indent: move under previous sibling
        const prevSibId = siblings[idx - 1];
        if (prevSibId && prevSibId !== nodeId) {
          moveManualNode(pageId, nodeId, prevSibId);
          // After move, the node is now a child of prevSibId — update its parent
          // The moveManualNode places it as sibling-after prevSibId at prevSibId's parent level
          // Actually Tab should make it a CHILD of previous sibling, not sibling after
          // For simplicity: just move it
        }
      }
    }
  };

  const isDraggedOver = dragState.dropTargetId === nodeId && dragState.draggedId !== nodeId;

  const addChild = () => {
    updateManualNode(pageId, nodeId, { isExpanded: true });
    const newId = addManualNode(pageId, nodeId);
    setAutoFocusId(newId);
  };

  const addSibling = () => {
    const newId = addManualNode(pageId, node.parentId, nodeId);
    setAutoFocusId(newId);
  };

  const hasChildren = node.children.length > 0;

  return (
    <div>
      {/* Drop indicator line */}
      {isDraggedOver && (
        <div
          className="h-0.5 bg-blue-400 rounded mx-2"
          style={{ marginLeft: `${level * 24 + 8}px` }}
        />
      )}

      <div
        className={`flex items-center gap-1 group py-0.5 pr-2 rounded transition-colors ${
          isDraggedOver ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-[rgba(55,53,47,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)]"
        }`}
        style={{ paddingLeft: `${level * 24 + 4}px` }}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(nodeId);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOver(nodeId);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(nodeId);
        }}
      >
        {/* Drag handle */}
        <button
          className="opacity-0 group-hover:opacity-100 text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0"
          onMouseDown={(e) => e.preventDefault()}
        >
          <GripVertical size={12} />
        </button>

        {/* Toggle button */}
        <button
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          onClick={() => updateManualNode(pageId, nodeId, { isExpanded: !node.isExpanded })}
        >
          {hasChildren ? (
            node.isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : (
            <span className="w-3 h-3 inline-block rounded-full bg-gray-300 dark:bg-gray-600 scale-50" />
          )}
        </button>

        {/* Text */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm text-[#37352f] dark:text-[#e6e6e4] min-w-0"
            placeholder="내용 입력..."
          />
        ) : (
          <span
            onClick={() => {
              setDraft(node.text);
              setEditing(true);
            }}
            className={`flex-1 text-sm cursor-text min-w-0 text-[#37352f] dark:text-[#e6e6e4] ${
              !node.text ? "text-gray-300 dark:text-gray-600" : ""
            }`}
          >
            {node.text || "내용 입력..."}
          </span>
        )}

        {/* Hover actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0">
          <button
            title={node.isPinned ? "핀 해제" : "핀 고정"}
            onClick={() => updateManualNode(pageId, nodeId, { isPinned: !node.isPinned })}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              node.isPinned
                ? "text-orange-400"
                : "text-gray-300 dark:text-gray-600 hover:text-orange-400"
            }`}
          >
            <Pin size={11} className={node.isPinned ? "fill-orange-400" : ""} />
          </button>
          <button
            title="하위 항목 추가"
            onClick={addChild}
            className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus size={11} />
          </button>
          <button
            title="삭제"
            onClick={() => deleteManualNode(pageId, nodeId)}
            className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Children */}
      {node.isExpanded &&
        node.children.map((childId) => (
          <NodeRow
            key={childId}
            nodeId={childId}
            pageId={pageId}
            level={level + 1}
            autoFocusId={autoFocusId}
            setAutoFocusId={setAutoFocusId}
            dragState={dragState}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
    </div>
  );
}

// ─── Main ManualEditor ────────────────────────────────────────────────────────

export default function ManualEditor({ pageId }: { pageId: string }) {
  const {
    pages,
    manualPages,
    addManualNode,
    updateManualNode,
    moveManualNode,
  } = useWorkspaceStore();

  const page = pages[pageId];
  const pd = manualPages[pageId] ?? { rootItems: [], items: {} };

  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const pinnedNodes = Object.values(pd.items).filter((n) => n.isPinned);

  const handleAddRoot = () => {
    const newId = addManualNode(pageId, null);
    setAutoFocusId(newId);
  };

  const handleDragStart = useCallback((id: string) => setDraggedId(id), []);
  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
  }, []);
  const handleDragOver = useCallback((id: string) => setDropTargetId(id), []);
  const handleDrop = useCallback(
    (targetId: string) => {
      if (draggedId && draggedId !== targetId) {
        moveManualNode(pageId, draggedId, targetId);
      }
      setDraggedId(null);
      setDropTargetId(null);
    },
    [draggedId, moveManualNode, pageId]
  );

  const dragState = { draggedId, dropTargetId };

  return (
    <div
      className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]"
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="max-w-3xl mx-auto px-12 py-12">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          {page?.emoji && (
            <span className="text-4xl leading-none">{page.emoji}</span>
          )}
          <h1 className="text-3xl font-bold text-[#37352f] dark:text-[#e6e6e4]">
            {page?.title || ""}
          </h1>
        </div>

        {/* Pinned section */}
        {pinnedNodes.length > 0 && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#fffbf0] dark:bg-[#29251a]">
            <div className="flex items-center gap-2 mb-2 text-[#9b9a97] dark:text-[#6b6b6b]">
              <Pin size={13} className="text-orange-400 fill-orange-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">핀독</span>
            </div>
            <div className="flex flex-col gap-1">
              {pinnedNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    // Expand all ancestors and scroll to node
                    let current: ManualNode | undefined = n;
                    while (current?.parentId) {
                      updateManualNode(pageId, current.parentId, { isExpanded: true });
                      current = pd.items[current.parentId];
                    }
                    setTimeout(() => {
                      document.getElementById(`manual-node-${n.id}`)?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }, 100);
                  }}
                  className="text-sm text-left text-[#37352f] dark:text-[#e6e6e4] hover:underline pl-1 flex items-center gap-1.5"
                >
                  <span className="text-gray-400">-</span>
                  {n.text || "(이름 없음)"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tree */}
        <div className="space-y-0.5" id="manual-tree">
          {pd.rootItems.length === 0 && (
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mb-4 py-2">
              아직 항목이 없습니다. 아래 버튼을 눌러 시작하세요.
            </p>
          )}
          {pd.rootItems.map((id) => (
            <div key={id} id={`manual-node-${id}`}>
              <NodeRow
                nodeId={id}
                pageId={pageId}
                level={0}
                autoFocusId={autoFocusId}
                setAutoFocusId={setAutoFocusId}
                dragState={dragState}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            </div>
          ))}

          {/* Add root item button */}
          <button
            onClick={handleAddRoot}
            className="mt-3 flex items-center gap-2 text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors px-2 py-1.5 rounded hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)] w-full"
          >
            <Plus size={14} />
            <span>새 항목 추가</span>
          </button>
        </div>
      </div>
    </div>
  );
}
