"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  CheckSquare,
  Users,
  BookOpen,
  Sun,
  Moon,
  LogOut,
  Crown,
  UserCog,
  ClipboardList,
  RefreshCw,
  BarChart2,
  LineChart,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import SidebarPageItem from "./SidebarPageItem";
import { useAuth } from "./AuthProvider";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [statOpen, setStatOpen] = useState(true);

  const { pages, rootPageIds, createPage, darkMode, toggleDarkMode, syncNow, isRefreshing, syncError } = useWorkspaceStore();
  const { user, profile, signOut } = useAuth();

  // 동기화 완료 후 잠깐 초록 유지
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const prevIsRefreshing = useRef(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevIsRefreshing.current && !isRefreshing) {
      if (!syncError) {
        setLastSynced(new Date());
        setSyncSuccess(true);
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => setSyncSuccess(false), 3000);
      }
    }
    prevIsRefreshing.current = isRefreshing;
  }, [isRefreshing, syncError]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-64 h-screen bg-[#f7f6f3] dark:bg-[#252525] border-r border-[#e9e9e7] dark:border-[#2f2f2f] flex-shrink-0" />
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

  // 동기화 상태 표시등
  const syncDot = isRefreshing
    ? "bg-green-400 animate-pulse"
    : syncError
    ? "bg-red-500"
    : syncSuccess
    ? "bg-green-500"
    : "bg-gray-300 dark:bg-gray-600";

  const syncDotTitle = isRefreshing
    ? "동기화 중..."
    : syncError
    ? "동기화 실패"
    : syncSuccess
    ? "동기화 완료"
    : "대기 중";

  const hover = "hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)]";
  const navItem = (active: boolean) =>
    cn(
      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
      hover,
      active
        ? "bg-[rgba(55,53,47,0.08)] dark:bg-[rgba(255,255,255,0.06)] text-[#37352f] dark:text-[#e6e6e4]"
        : "text-[#37352f] dark:text-[#e6e6e4]"
    );

  if (collapsed) {
    return (
      <div className="w-12 h-screen bg-[#f7f6f3] dark:bg-[#252525] border-r border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col items-center py-3 gap-2 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)}
          title="사이드바 열기"
        >
          <ChevronRight size={16} />
        </button>
        <div className="w-8 h-px bg-[#e9e9e7] dark:bg-[#2f2f2f]" />
        <Link href="/">
          <button className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)} title="홈">
            <LayoutDashboard size={16} />
          </button>
        </Link>
        <Link href="/statfordegree">
          <button className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)} title="스탯포디그리">
            <BarChart2 size={16} />
          </button>
        </Link>
        <Link href="/tasks">
          <button className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)} title="업무 보드">
            <CheckSquare size={16} />
          </button>
        </Link>
        <Link href="/crm">
          <button className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)} title="고객관리">
            <Users size={16} />
          </button>
        </Link>
        <Link href="/manual">
          <button className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)} title="메뉴얼">
            <BookOpen size={16} />
          </button>
        </Link>
        <Link href="/admin">
          <button className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)} title="팀원관리">
            <UserCog size={16} />
          </button>
        </Link>
        {profile?.role === "admin" && (
          <Link href="/admin/requests">
            <button className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)} title="신청관리">
              <ClipboardList size={16} />
            </button>
          </Link>
        )}
        <button
          onClick={handleNewPage}
          className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)}
          title="새 페이지"
        >
          <Plus size={16} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => syncNow()}
          disabled={isRefreshing}
          className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97] disabled:opacity-50 relative", hover)}
          title={`데이터 동기화 (${syncDotTitle})`}
        >
          <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
          <span className={cn("absolute top-1 right-1 w-2 h-2 rounded-full", syncDot)} />
        </button>
        <button
          onClick={toggleDarkMode}
          className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)}
          title={darkMode ? "라이트 모드" : "다크 모드"}
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={signOut}
          className={cn("w-8 h-8 flex items-center justify-center rounded-md text-[#9b9a97]", hover)}
          title="로그아웃"
        >
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 h-screen bg-[#f7f6f3] dark:bg-[#252525] border-r border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Workspace header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4] truncate leading-tight">
              워코라
            </p>
            <p className="text-xs text-[#9b9a97] dark:text-[#6b6b6b] leading-tight">통합 포털</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className={cn("w-6 h-6 flex items-center justify-center rounded text-[#9b9a97] flex-shrink-0", hover)}
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
          className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-[#9b9a97]", hover, "transition-colors")}
        >
          <Search size={15} />
          <span>검색</span>
          <span className="ml-auto text-xs text-[#c4c3bf] dark:text-[#4f4f4f]">Ctrl+K</span>
        </button>

        {showSearch && (
          <div className="mt-1 mb-2">
            <input
              autoFocus
              type="text"
              placeholder="페이지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-md bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:ring-2 focus:ring-blue-200"
            />
            {searchQuery && (
              <div className="mt-1 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-md shadow-md max-h-48 overflow-y-auto">
                {filteredPages.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-[#9b9a97]">검색 결과 없음</p>
                ) : (
                  filteredPages.map((page) => (
                    <button
                      key={page.id}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-[#37352f] dark:text-[#e6e6e4] text-left", hover)}
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
          <div className={navItem(pathname === "/")}>
            <LayoutDashboard size={15} className="text-[#9b9a97]" />
            <span>홈</span>
          </div>
        </Link>

        {/* 스탯포디그리 아코디언 */}
        <div>
          <button
            onClick={() => setStatOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
              hover,
              (pathname === "/statfordegree" || pathname === "/tasks" || pathname === "/crm" || pathname === "/manual" || pathname === "/p/menu-manual" || pathname === "/stats")
                ? "bg-[rgba(55,53,47,0.08)] dark:bg-[rgba(255,255,255,0.06)] text-[#37352f] dark:text-[#e6e6e4]"
                : "text-[#37352f] dark:text-[#e6e6e4]"
            )}
          >
            <BarChart2 size={15} className="text-[#9b9a97]" />
            <span className="flex-1 text-left">스탯포디그리</span>
            <ChevronDown
              size={14}
              className={cn("text-[#9b9a97] transition-transform duration-200", statOpen ? "rotate-0" : "-rotate-90")}
            />
          </button>

          {statOpen && (
            <div className="ml-3 mt-0.5 mb-0.5 relative">
              {/* 연결선 */}
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[#e9e9e7] dark:bg-[#3f3f3f]" />

              <Link href="/stats">
                <div className={cn(navItem(pathname === "/stats"), "pl-5 relative")}>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[14px] h-px bg-[#e9e9e7] dark:bg-[#3f3f3f]" />
                  <LineChart size={14} className="text-[#9b9a97]" />
                  <span>통계</span>
                </div>
              </Link>

              <Link href="/tasks">
                <div className={cn(navItem(pathname === "/tasks"), "pl-5 relative")}>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[14px] h-px bg-[#e9e9e7] dark:bg-[#3f3f3f]" />
                  <CheckSquare size={14} className="text-[#9b9a97]" />
                  <span>업무 보드</span>
                </div>
              </Link>

              <Link href="/crm">
                <div className={cn(navItem(pathname === "/crm"), "pl-5 relative")}>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[14px] h-px bg-[#e9e9e7] dark:bg-[#3f3f3f]" />
                  <Users size={14} className="text-[#9b9a97]" />
                  <span>고객관리</span>
                </div>
              </Link>

              <Link href="/manual">
                <div className={cn(navItem(pathname === "/manual" || pathname === "/p/menu-manual"), "pl-5 relative")}>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[14px] h-px bg-[#e9e9e7] dark:bg-[#3f3f3f]" />
                  <BookOpen size={14} className="text-[#9b9a97]" />
                  <span>메뉴얼</span>
                </div>
              </Link>
            </div>
          )}
        </div>

        <Link href="/admin">
          <div className={navItem(pathname === "/admin")}>
            <UserCog size={15} className="text-[#9b9a97]" />
            <span>팀원관리</span>
          </div>
        </Link>

        {profile?.role === "admin" && (
          <Link href="/admin/requests">
            <div className={navItem(pathname === "/admin/requests")}>
              <ClipboardList size={15} className="text-[#9b9a97]" />
              <span>신청관리</span>
            </div>
          </Link>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 my-1 h-px bg-[#e9e9e7] dark:bg-[#2f2f2f]" />

      {/* Pages section */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[#9b9a97] dark:text-[#6b6b6b] uppercase tracking-wide">
            페이지
          </span>
          <button
            onClick={handleNewPage}
            className={cn("w-5 h-5 flex items-center justify-center rounded text-[#9b9a97]", hover)}
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
            <button onClick={handleNewPage} className="mt-1 text-xs text-blue-500 hover:underline">
              새 페이지 만들기
            </button>
          </div>
        )}

        <button
          onClick={handleNewPage}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-md",
            "text-sm text-[#9b9a97] transition-colors",
            hover
          )}
        >
          <Plus size={15} />
          <span>페이지 추가</span>
        </button>
      </div>

      {/* Bottom: user info + actions */}
      <div className="px-2 pb-3 border-t border-[#e9e9e7] dark:border-[#2f2f2f] pt-2 space-y-0.5">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
              {profile?.role === "admin" ? (
                <Crown size={11} className="text-white" />
              ) : (
                <span className="text-white text-[10px] font-bold">
                  {(user.email ?? "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {profile?.name && (
                <p className="text-xs font-medium text-[#37352f] dark:text-[#e6e6e4] truncate leading-tight">
                  {profile.name}
                </p>
              )}
              <p className="text-xs text-[#9b9a97] truncate leading-tight">
                {user.email}
              </p>
              <p className="text-[10px] text-[#9b9a97] leading-tight">
                {profile?.role === "admin" ? "관리자" : "멤버"}
              </p>
            </div>
          </div>
        )}

        {/* 동기화 버튼 */}
        <button
          onClick={() => syncNow()}
          disabled={isRefreshing}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50",
            syncError
              ? "text-red-500 dark:text-red-400"
              : isRefreshing
              ? "text-blue-500 dark:text-blue-400"
              : "text-[#9b9a97]",
            hover
          )}
        >
          <span className="relative flex-shrink-0">
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            <span className={cn("absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-[#252525]", syncDot)} />
          </span>
          <span>
            {isRefreshing ? "동기화 중..." : syncError ? "동기화 실패 — 재시도" : "데이터 동기화"}
          </span>
          {!isRefreshing && !syncError && lastSynced && (
            <span className="ml-auto text-[10px] text-[#c4c3bf] dark:text-[#4f4f4f]">
              {lastSynced.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </button>

        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-[#9b9a97] transition-colors",
            hover
          )}
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          <span>{darkMode ? "라이트 모드" : "다크 모드"}</span>
        </button>

        {/* Logout */}
        <button
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-[#9b9a97] transition-colors",
            hover
          )}
        >
          <LogOut size={15} />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
}
