"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  Plus,
  Trash2,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Page } from "@/lib/types";

interface SidebarPageItemProps {
  page: Page;
  depth?: number;
}

export default function SidebarPageItem({
  page,
  depth = 0,
}: SidebarPageItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { pages, createPage, deletePage, togglePageExpand } =
    useWorkspaceStore();

  const isActive = pathname === `/p/${page.id}`;
  const hasChildren = page.children.length > 0;

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddSubPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = createPage(page.id);
    router.push(`/p/${newId}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`"${page.title}" 페이지를 삭제할까요?`)) {
      deletePage(page.id);
      if (isActive) router.push("/");
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) togglePageExpand(page.id);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-[3px] px-2 rounded-md cursor-pointer select-none",
          "text-sm text-[#37352f] hover:bg-[rgba(55,53,47,0.08)]",
          isActive && "bg-[rgba(55,53,47,0.08)]"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => router.push(`/p/${page.id}`)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand toggle */}
        <button
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded flex-shrink-0",
            "hover:bg-[rgba(55,53,47,0.16)] text-[#9b9a97]",
            !hasChildren && "invisible"
          )}
          onClick={handleToggleExpand}
        >
          <ChevronRight
            size={14}
            className={cn(
              "transition-transform duration-150",
              page.isExpanded && "rotate-90"
            )}
          />
        </button>

        {/* Emoji / Icon */}
        <span className="flex-shrink-0 text-base leading-none w-5 text-center">
          {page.emoji || <FileText size={14} className="text-[#9b9a97]" />}
        </span>

        {/* Title */}
        <span className="flex-1 truncate text-sm leading-5">
          {page.title || "제목 없음"}
        </span>

        {/* Action buttons (visible on hover) */}
        {(isHovered || showMenu) && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.16)] text-[#9b9a97]"
              onClick={handleAddSubPage}
              title="하위 페이지 추가"
            >
              <Plus size={14} />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.16)] text-[#9b9a97]"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                title="더 보기"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-6 z-50 bg-white border border-[#e9e9e7] rounded-lg shadow-lg py-1 w-40">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} />
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
            return (
              <SidebarPageItem key={childId} page={child} depth={depth + 1} />
            );
          })}
        </div>
      )}
    </div>
  );
}
