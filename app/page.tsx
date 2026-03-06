"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store";
import {
  FileText,
  CheckSquare,
  Clock,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { pages, rootPageIds, tasks, createPage } = useWorkspaceStore();

  // Get recent pages (last 5 updated)
  const recentPages = Object.values(pages)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  // Get active tasks
  const activeTasks = tasks
    .filter((t) => t.status !== "done")
    .slice(0, 5);

  const handleNewPage = () => {
    const id = createPage(null);
    router.push(`/p/${id}`);
  };

  const totalPages = Object.keys(pages).length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#37352f]">
                Statfordegree Hub
              </h1>
              <p className="text-[#9b9a97] text-sm">팀 지식관리 & 업무 관리 시스템</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { label: "전체 페이지", value: totalPages, icon: <FileText size={18} />, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "할 일", value: todoCount, icon: <CheckSquare size={18} />, color: "text-slate-600", bg: "bg-slate-50" },
            { label: "진행 중", value: inProgressCount, icon: <Clock size={18} />, color: "text-orange-500", bg: "bg-orange-50" },
            { label: "완료", value: doneCount, icon: <CheckSquare size={18} />, color: "text-green-500", bg: "bg-green-50" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-[#e9e9e7] rounded-xl p-4"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", stat.bg, stat.color)}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-[#37352f]">{stat.value}</p>
              <p className="text-xs text-[#9b9a97] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Recent pages */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#37352f]">최근 페이지</h2>
              <button
                onClick={handleNewPage}
                className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
              >
                <Plus size={12} />
                새 페이지
              </button>
            </div>

            <div className="space-y-1.5">
              {recentPages.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={24} className="mx-auto text-[#c4c3bf] mb-2" />
                  <p className="text-sm text-[#9b9a97]">페이지가 없습니다</p>
                  <button
                    onClick={handleNewPage}
                    className="mt-2 text-xs text-blue-500 hover:underline"
                  >
                    첫 페이지 만들기
                  </button>
                </div>
              ) : (
                recentPages.map((page) => (
                  <Link key={page.id} href={`/p/${page.id}`}>
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(55,53,47,0.04)] cursor-pointer group">
                      <span className="text-lg w-7 text-center flex-shrink-0">
                        {page.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#37352f] truncate font-medium">
                          {page.title || "제목 없음"}
                        </p>
                        <p className="text-xs text-[#9b9a97]">
                          {formatRelativeTime(page.updatedAt)}
                        </p>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-[#c4c3bf] opacity-0 group-hover:opacity-100 flex-shrink-0"
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Active tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#37352f]">진행 중인 업무</h2>
              <Link href="/tasks">
                <span className="text-xs text-blue-500 hover:underline">
                  전체 보기
                </span>
              </Link>
            </div>

            <div className="space-y-1.5">
              {activeTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare size={24} className="mx-auto text-[#c4c3bf] mb-2" />
                  <p className="text-sm text-[#9b9a97]">진행 중인 업무가 없습니다</p>
                  <Link href="/tasks">
                    <span className="mt-2 text-xs text-blue-500 hover:underline inline-block">
                      업무 추가하기
                    </span>
                  </Link>
                </div>
              ) : (
                activeTasks.map((task) => (
                  <Link key={task.id} href="/tasks">
                    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-[rgba(55,53,47,0.04)] cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#37352f] truncate font-medium">
                            {task.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full",
                              PRIORITY_COLORS[task.priority]
                            )}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          <span className="text-xs text-[#9b9a97]">
                            {STATUS_LABELS[task.status]}
                          </span>
                          {task.assignee && (
                            <span className="text-xs text-[#9b9a97]">
                              · {task.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-10 pt-8 border-t border-[#e9e9e7]">
          <h2 className="text-sm font-semibold text-[#37352f] mb-4">빠른 작업</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: "📝",
                title: "새 페이지",
                desc: "빈 페이지 만들기",
                action: handleNewPage,
              },
              {
                icon: "✅",
                title: "업무 보드",
                desc: "칸반으로 업무 관리",
                href: "/tasks",
              },
              {
                icon: "📚",
                title: "팀 메뉴얼",
                desc: "문서 & 가이드 정리",
                href: rootPageIds[1] ? `/p/${rootPageIds[1]}` : "/",
              },
            ].map((item) => {
              const content = (
                <div className="flex items-start gap-3 p-4 bg-white border border-[#e9e9e7] rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#37352f]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#9b9a97] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );

              if (item.action) {
                return (
                  <button key={item.title} onClick={item.action} className="text-left">
                    {content}
                  </button>
                );
              }
              return (
                <Link key={item.title} href={item.href!}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
