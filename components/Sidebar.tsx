"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Users,
  BookOpen,
  Sun,
  Moon,
  LogOut,
  UserCog,
  ClipboardList,
  BarChart2,
  LineChart,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [statOpen, setStatOpen] = useState(true);

  const darkMode = useWorkspaceStore((s) => s.darkMode);
  const toggleDarkMode = useWorkspaceStore((s) => s.toggleDarkMode);
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-64 h-screen bg-[#f7f6f3] dark:bg-[#252525] border-r border-[#e9e9e7] dark:border-[#2f2f2f] flex-shrink-0" />
    );
  }

  const hover = "hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)]";
  const navItem = (active: boolean) =>
    cn(
      "flex items-center gap-[9px] px-[11px] py-[9px] rounded-[8px] text-[13.5px] cursor-pointer transition-colors",
      active
        ? "bg-[#e7ebe7] dark:bg-[rgba(94,124,100,0.15)] text-[#2f3430] dark:text-[#e6e6e4] font-semibold shadow-[inset_2px_0_0_#5e7c64]"
        : cn("text-[#5b635c] dark:text-[#a0a8a0]", hover)
    );

  if (collapsed) {
    return (
      <div className="w-12 h-screen bg-[#f7f8f6] dark:bg-[#202020] border-r border-[#e9ece9] dark:border-[#2a2a2a] flex flex-col items-center py-3 gap-2 flex-shrink-0">
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
        <div className="flex-1" />
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
    <div className="w-64 h-screen bg-[#f7f8f6] dark:bg-[#202020] border-r border-[#e9ece9] dark:border-[#2a2a2a] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Workspace header */}
      <div className="flex items-center gap-[10px] px-[15px] pt-[18px] pb-[13px]">
        <div className="w-8 h-8 rounded-[9px] bg-[#2f3430] dark:bg-[#3a3a3a] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">K</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#2f3430] dark:text-[#e6e6e4] truncate leading-tight tracking-[-0.01em]">
            킴퍼블리
          </p>
          <p className="text-[11px] text-[#9aa39b] leading-tight">통합 포털</p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className={cn("w-6 h-6 flex items-center justify-center rounded text-[#9aa39b] flex-shrink-0", hover)}
          title="사이드바 닫기"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 py-1">
        {/* Search */}
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
              (pathname === "/statfordegree" || pathname === "/tasks" || pathname === "/crm" || pathname.startsWith("/manual") || pathname === "/stats")
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
            <div className="mt-[1px] mb-[1px] ml-[21px] pl-[13px] border-l border-[#dfe3df] dark:border-[#3a3a3a] flex flex-col gap-[1px]">
              <Link href="/stats">
                <div className={cn("flex items-center gap-2 px-[10px] py-[7px] rounded-[8px] text-[13px] cursor-pointer transition-colors",
                  pathname === "/stats" ? "bg-[#e7ebe7] dark:bg-[rgba(94,124,100,0.15)] text-[#2f3430] dark:text-[#e6e6e4]" : "text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)]")}>
                  <LineChart size={14} className="text-[#9aa39b]" />
                  <span>통계</span>
                </div>
              </Link>
              <Link href="/tasks">
                <div className={cn("flex items-center gap-2 px-[10px] py-[7px] rounded-[8px] text-[13px] cursor-pointer transition-colors",
                  pathname === "/tasks" ? "bg-[#e7ebe7] dark:bg-[rgba(94,124,100,0.15)] text-[#2f3430] dark:text-[#e6e6e4]" : "text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)]")}>
                  <CheckSquare size={14} className="text-[#9aa39b]" />
                  <span>업무 보드</span>
                </div>
              </Link>
              <Link href="/crm">
                <div className={cn("flex items-center gap-2 px-[10px] py-[7px] rounded-[8px] text-[13px] cursor-pointer transition-colors",
                  pathname === "/crm" ? "bg-[#e7ebe7] dark:bg-[rgba(94,124,100,0.15)] text-[#2f3430] dark:text-[#e6e6e4]" : "text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)]")}>
                  <Users size={14} className="text-[#9aa39b]" />
                  <span>고객관리</span>
                </div>
              </Link>
              <Link href="/manual">
                <div className={cn("flex items-center gap-2 px-[10px] py-[7px] rounded-[8px] text-[13px] cursor-pointer transition-colors",
                  pathname.startsWith("/manual") ? "bg-[#e7ebe7] dark:bg-[rgba(94,124,100,0.15)] text-[#2f3430] dark:text-[#e6e6e4]" : "text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)]")}>
                  <BookOpen size={14} className="text-[#9aa39b]" />
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

      <div className="flex-1" />

      {/* Bottom: user info + actions */}
      <div className="px-3 pb-3 border-t border-[#e9ece9] dark:border-[#2f2f2f] pt-[11px] space-y-0.5">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-[10px] px-[11px] py-2">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#dde3dd] dark:bg-[#3a3a3a] flex items-center justify-center flex-shrink-0">
              {profile?.role === "admin" ? (
                <span className="text-[#5e7c64] text-sm">⛁</span>
              ) : (
                <span className="text-[#5e7c64] text-[10px] font-bold">
                  {(profile?.name ?? user.email ?? "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-[#2f3430] dark:text-[#e6e6e4] truncate leading-tight">
                {profile?.name ?? user.email}
              </p>
              <p className="text-[11px] text-[#9aa39b] leading-tight">
                {profile?.role === "admin" ? "관리자" : "멤버"}
              </p>
            </div>
          </div>
        )}

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
