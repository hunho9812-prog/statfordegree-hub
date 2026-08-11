"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, PenLine, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { fetchPosts, type ManualPost } from "@/lib/db-manual-posts";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function ManualBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchQ = searchParams.get("q") ?? "";
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [posts, setPosts] = useState<ManualPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchQ);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchPosts({ search: searchQ || undefined, page: currentPage, pageSize: PAGE_SIZE });
    setPosts(result.posts);
    setTotal(result.total);
    setLoading(false);
  }, [searchQ, currentPage]);

  useEffect(() => { load(); }, [load]);

  const pushQuery = (params: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) p.set(k, v); else p.delete(k);
    });
    router.push(`/manual?${p.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushQuery({ q: searchInput, page: "1" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  };

  // sequence number (non-notice posts get 번호, notices get 공지)
  const noticeCount = posts.filter((p) => p.is_notice).length;
  const globalOffset = (currentPage - 1) * PAGE_SIZE;
  let nonNoticeIdx = 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#e9ece9] dark:border-[#2f2f2f] flex-shrink-0">
        <div>
          <h1 className="text-[18px] font-bold text-[#2f3430] dark:text-[#e6e6e4]">메뉴얼</h1>
          <p className="text-[12px] text-[#9aa39b] mt-0.5">팀 공유 자료 및 지침</p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa39b]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="제목 검색"
                className="pl-8 pr-3 py-1.5 text-[13px] border border-[#e0e4e0] dark:border-[#3a3a3a] rounded-md bg-white dark:bg-[#2a2a2a] text-[#2f3430] dark:text-[#e6e6e4] placeholder-[#b0b8b0] focus:outline-none focus:ring-1 focus:ring-[#5e7c64] w-48"
              />
            </div>
            <button type="submit" className="px-3 py-1.5 text-[13px] bg-[#5e7c64] hover:bg-[#4d6b53] text-white rounded-md transition-colors">
              검색
            </button>
          </form>
          <button
            onClick={() => router.push("/manual/write")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-[#2f3430] hover:bg-[#1e2320] dark:bg-[#3a3a3a] dark:hover:bg-[#4a4a4a] text-white rounded-md transition-colors"
          >
            <PenLine size={13} />
            글쓰기
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e9ece9] dark:border-[#2f2f2f] text-[#9aa39b] text-left">
              <th className="px-6 py-2.5 font-medium w-14 text-center">번호</th>
              <th className="px-4 py-2.5 font-medium">제목</th>
              <th className="px-4 py-2.5 font-medium w-24 text-center">작성자</th>
              <th className="px-4 py-2.5 font-medium w-24 text-center">작성일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-[#9aa39b]">불러오는 중...</td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-[#9aa39b]">
                  {searchQ ? `"${searchQ}" 검색 결과가 없습니다.` : "아직 게시물이 없습니다."}
                </td>
              </tr>
            ) : (
              posts.map((post) => {
                const isNotice = post.is_notice;
                let rowNum: string;
                if (isNotice) {
                  rowNum = "공지";
                } else {
                  nonNoticeIdx++;
                  rowNum = String(total - noticeCount - (globalOffset + nonNoticeIdx - 1));
                }

                return (
                  <tr
                    key={post.id}
                    onClick={() => router.push(`/manual/${post.id}`)}
                    className={cn(
                      "border-b border-[#f0f2f0] dark:border-[#2a2a2a] cursor-pointer transition-colors",
                      isNotice
                        ? "bg-[#f7f9f7] dark:bg-[#252825] hover:bg-[#eff2ef] dark:hover:bg-[#2d302d]"
                        : "hover:bg-[#f7f9f7] dark:hover:bg-[#252525]"
                    )}
                  >
                    <td className="px-6 py-3 text-center text-[#9aa39b]">
                      {isNotice ? (
                        <span className="inline-flex items-center gap-0.5 text-[#5e7c64] font-semibold text-[11px]">
                          <Pin size={11} />공지
                        </span>
                      ) : (
                        rowNum
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 min-w-0">
                        {post.prefix && (
                          <span className="text-[11px] font-medium text-[#5e7c64] bg-[#e8f0e9] dark:bg-[rgba(94,124,100,0.15)] px-1.5 py-0.5 rounded flex-shrink-0">
                            {post.prefix}
                          </span>
                        )}
                        <span className={cn("truncate", isNotice && "font-semibold text-[#2f3430] dark:text-[#e6e6e4]")}>
                          {post.title}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[#5b635c] dark:text-[#a0a8a0]">{post.author_name}</td>
                    <td className="px-4 py-3 text-center text-[#9aa39b]">{formatDate(post.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-3 border-t border-[#e9ece9] dark:border-[#2f2f2f] flex-shrink-0">
          <button
            onClick={() => pushQuery({ page: String(currentPage - 1) })}
            disabled={currentPage <= 1}
            className="w-7 h-7 flex items-center justify-center rounded text-[#9aa39b] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => pushQuery({ page: String(p) })}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded text-[13px] transition-colors",
                p === currentPage
                  ? "bg-[#5e7c64] text-white font-semibold"
                  : "text-[#5b635c] dark:text-[#a0a8a0] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)]"
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => pushQuery({ page: String(currentPage + 1) })}
            disabled={currentPage >= totalPages}
            className="w-7 h-7 flex items-center justify-center rounded text-[#9aa39b] hover:bg-[#eef0ed] dark:hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
