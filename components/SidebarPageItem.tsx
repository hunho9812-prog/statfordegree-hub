"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  Plus,
  Trash2,
  MoreHorizontal,
  FileText,
  Pencil,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Page } from "@/lib/types";

interface SidebarPageItemProps {
  page: Page;
  depth?: number;
}

// Emoji quick-pick for rename popup
const QUICK_EMOJIS = ["📄","📝","📋","📌","🗒️","📁","🗂️","⭐","🔖","💡","🎯","✅","📊","🖼️","📅","🔑","🏷️","💼","🧩","🔧"];

export default function SidebarPageItem({ page, depth = 0 }: SidebarPageItemProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(page.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPop, setShowEmojiPop] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const { pages, createPage, deletePage, togglePageExpand, updatePage } = useWorkspaceStore();

  const isActive = pathname === `/p/${page.id}`;
  const hasChildren = page.children.length > 0;

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus rename input
  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const startRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setRenameValue(page.title);
    setIsRenaming(true);
  }, [page.title]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== page.title) {
      updatePage(page.id, { title: trimmed });
    }
    setIsRenaming(false);
  }, [renameValue, page.title, page.id, updatePage]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commitRename(); }
    if (e.key === "Escape") setIsRenaming(false);
  }, [commitRename]);

  const handleAddSubPage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const newId = createPage(page.id);
    router.push(`/p/${newId}`);
  }, [createPage, page.id, router]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const newId = createPage(page.parentId ?? null);
    updatePage(newId, {
      title: page.title + " 복사본",
      emoji: page.emoji,
    });
    router.push(`/p/${newId}`);
  }, [createPage, updatePage, page, router]);

  const handleDelete = useCallback(() => {
    deletePage(page.id);
    setShowDeleteConfirm(false);
    if (isActive) router.push("/");
  }, [deletePage, page.id, isActive, router]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    updatePage(page.id, { emoji });
    setShowEmojiPop(false);
    setShowMenu(false);
  }, [updatePage, page.id]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) togglePageExpand(page.id);
  }, [hasChildren, togglePageExpand, page.id]);

  return (
    <>
      <div>
        <div
          className={cn(
            "group flex items-center gap-1 py-[3px] rounded-md cursor-pointer select-none",
            "text-sm text-[#37352f] dark:text-[#e6e6e4]",
            "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)]",
            isActive && "bg-[rgba(55,53,47,0.08)] dark:bg-[rgba(255,255,255,0.06)]"
          )}
          style={{ paddingLeft: `${depth * 12 + 4}px`, paddingRight: "4px" }}
          onClick={() => !isRenaming && router.push(`/p/${page.id}`)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Expand toggle */}
          <button
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded flex-shrink-0",
              "hover:bg-[rgba(55,53,47,0.16)] dark:hover:bg-[rgba(255,255,255,0.1)] text-[#9b9a97]",
              !hasChildren && "invisible"
            )}
            onClick={handleToggleExpand}
          >
            <ChevronRight
              size={14}
              className={cn("transition-transform duration-150", page.isExpanded && "rotate-90")}
            />
          </button>

          {/* Emoji — click to change */}
          <div className="relative flex-shrink-0" ref={emojiRef}>
            <button
              className="w-5 h-5 flex items-center justify-center text-base leading-none rounded hover:bg-[rgba(55,53,47,0.16)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              onClick={(e) => { e.stopPropagation(); setShowEmojiPop((v) => !v); }}
              title="이모지 변경"
            >
              {page.emoji || <FileText size={14} className="text-[#9b9a97]" />}
            </button>
            {showEmojiPop && (
              <div className="absolute left-0 top-7 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl p-2 w-52">
                <p className="text-[10px] text-[#9b9a97] font-medium mb-1.5 px-1">이모지 선택</p>
                <div className="grid grid-cols-10 gap-0.5">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      onClick={(e) => { e.stopPropagation(); handleEmojiSelect(em); }}
                      className="w-5 h-5 flex items-center justify-center text-sm rounded hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Title — inline rename or display */}
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-white dark:bg-[#3f3f3f] border border-blue-400 rounded px-1 py-0 text-sm outline-none text-[#37352f] dark:text-[#e6e6e4]"
            />
          ) : (
            <span
              className="flex-1 truncate text-sm leading-5"
              onDoubleClick={startRename}
              title="더블클릭하여 이름 변경"
            >
              {page.title || "제목 없음"}
            </span>
          )}

          {/* Action buttons — visible on hover */}
          {(isHovered || showMenu) && !isRenaming && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.16)] dark:hover:bg-[rgba(255,255,255,0.1)] text-[#9b9a97]"
                onClick={handleAddSubPage}
                title="하위 페이지 추가"
              >
                <Plus size={14} />
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.16)] dark:hover:bg-[rgba(255,255,255,0.1)] text-[#9b9a97]"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  title="더 보기"
                >
                  <MoreHorizontal size={14} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-6 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl py-1 w-48 text-sm">
                    {/* Rename */}
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                      onClick={startRename}
                    >
                      <Pencil size={13} className="text-[#9b9a97]" />
                      이름 변경
                    </button>

                    {/* Change emoji */}
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowEmojiPop(true); }}
                    >
                      <span className="text-sm w-[13px] text-center leading-none">{page.emoji || "📄"}</span>
                      이모지 변경
                    </button>

                    {/* Add sub-page */}
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                      onClick={handleAddSubPage}
                    >
                      <Plus size={13} className="text-[#9b9a97]" />
                      하위 페이지 추가
                    </button>

                    {/* Duplicate */}
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                      onClick={handleDuplicate}
                    >
                      <Copy size={13} className="text-[#9b9a97]" />
                      페이지 복제
                    </button>

                    <div className="my-1 border-t border-[#e9e9e7] dark:border-[#3f3f3f]" />

                    {/* Delete */}
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }}
                    >
                      <Trash2 size={13} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Children */}
        {page.isExpanded && hasChildren && (
          <div>
            {page.children.map((childId) => {
              const child = pages[childId];
              if (!child) return null;
              return <SidebarPageItem key={childId} page={child} depth={depth + 1} />;
            })}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-xl p-6 w-80 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 flex-shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4] text-sm">페이지 삭제</h2>
                <p className="text-xs text-[#9b9a97] mt-0.5">{page.emoji} {page.title || "제목 없음"}</p>
              </div>
            </div>
            <p className="text-sm text-[#9b9a97] mb-1">
              이 페이지{page.children.length > 0 ? `와 하위 페이지 ${page.children.length}개` : ""}를 삭제할까요?
            </p>
            <p className="text-xs text-red-400 mb-5">삭제한 페이지는 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
