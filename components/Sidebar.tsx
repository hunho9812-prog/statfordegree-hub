"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Settings,
  FileText,
  CheckSquare,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import SidebarPageItem from "./SidebarPageItem";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { pages, rootPageIds, createPage } = useWorkspaceStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-64 h-screen bg-[#f7f6f3] border-r border-[#e9e9e7] flex-shrink-0" />
    );
  }

  const handleNewPage = () => {
    const newId = createPage(null);
    router.push(`/p/${newId}`);
  };

  const filteredPages = searchQuery
    ? Object.values(pages).filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.emoji.includes(searchQuery)
      )
    : [];

  if (collapsed) {
    return (
      <div className="w-12 h-screen bg-[#f7f6f3] border-r border-[#e9e9e7] flex flex-col items-center py-3 gap-2 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(55,53,47,0.08)] text-[#9b9a97]"
          title="사이드바 열기"
        >
          <ChevronRight size={16} />
        </button>
        <div className="w-8 h-px bg-[#e9e9e7]" />
        <Link href="/">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(55,53,47,0.08)] text-[#9b9a97]"
            title="홈"
          >
            <LayoutDashboard size={16} />
          </button>
        </Link>
        <Link href="/tasks">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(55,53,47,0.08)] text-[#9b9a97]"
            title="업무 보드"
          >
            <CheckSquare size={16} />
          </button>
        </Link>
        <button
          onClick={handleNewPage}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(55,53,47,0.08)] text-[#9b9a97]"
          title="새 페이지"
        >
          <Plus size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 h-screen bg-[#f7f6f3] border-r border-[#e9e9e7] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Workspace header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#37352f] truncate leading-tight">
              Statfordegree Hub
            </p>
            <p className="text-xs text-[#9b9a97] leading-tight">워크스페이스</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.08)] text-[#9b9a97] flex-shrink-0"
          title="사이드바 닫기"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Navigation */}
      <div className="px-2 py-1">
        {/* Search */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-[#9b9a97]",
            "hover:bg-[rgba(55,53,47,0.08)] transition-colors"
          )}
        >
          <Search size={15} />
          <span>검색</span>
          <span className="ml-auto text-xs text-[#c4c3bf]">Ctrl+K</span>
        </button>

        {showSearch && (
          <div className="mt-1 mb-2">
            <input
              autoFocus
              type="text"
              placeholder="페이지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#e9e9e7] rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-200"
            />
            {searchQuery && (
              <div className="mt-1 bg-white border border-[#e9e9e7] rounded-md shadow-md max-h-48 overflow-y-auto">
                {filteredPages.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-[#9b9a97]">
                    검색 결과 없음
                  </p>
                ) : (
                  filteredPages.map((page) => (
                    <button
                      key={page.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[rgba(55,53,47,0.08)] text-left"
                      onClick={() => {
                        router.push(`/p/${page.id}`);
                        setShowSearch(false);
                        setSearchQuery("");
                      }}
                    >
                      <span>{page.emoji}</span>
                      <span className="truncate">{page.title}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Nav links */}
        <Link href="/">
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer",
              "hover:bg-[rgba(55,53,47,0.08)] transition-colors",
              pathname === "/" ? "bg-[rgba(55,53,47,0.08)]" : "text-[#37352f]"
            )}
          >
            <LayoutDashboard size={15} className="text-[#9b9a97]" />
            <span>홈</span>
          </div>
        </Link>

        <Link href="/tasks">
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer",
              "hover:bg-[rgba(55,53,47,0.08)] transition-colors",
              pathname === "/tasks"
                ? "bg-[rgba(55,53,47,0.08)]"
                : "text-[#37352f]"
            )}
          >
            <CheckSquare size={15} className="text-[#9b9a97]" />
            <span>업무 보드</span>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 my-1 h-px bg-[#e9e9e7]" />

      {/* Pages section */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">
            페이지
          </span>
          <button
            onClick={handleNewPage}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.08)] text-[#9b9a97]"
            title="새 페이지 추가"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="space-y-0.5">
          {rootPageIds.map((pageId) => {
            const page = pages[pageId];
            if (!page) return null;
            return <SidebarPageItem key={pageId} page={page} depth={0} />;
          })}
        </div>

        {rootPageIds.length === 0 && (
          <div className="px-4 py-3 text-center">
            <FileText size={20} className="mx-auto text-[#c4c3bf] mb-1" />
            <p className="text-xs text-[#9b9a97]">페이지가 없습니다</p>
            <button
              onClick={handleNewPage}
              className="mt-1 text-xs text-blue-500 hover:underline"
            >
              새 페이지 만들기
            </button>
          </div>
        )}

        {/* Add page button */}
        <button
          onClick={handleNewPage}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-md",
            "text-sm text-[#9b9a97] hover:bg-[rgba(55,53,47,0.08)] transition-colors"
          )}
        >
          <Plus size={15} />
          <span>페이지 추가</span>
        </button>
      </div>

      {/* Bottom settings */}
      <div className="px-2 pb-3 border-t border-[#e9e9e7] pt-2">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-[#9b9a97] hover:bg-[rgba(55,53,47,0.08)]">
          <Settings size={15} />
          <span>설정</span>
        </button>
      </div>
    </div>
  );
}
