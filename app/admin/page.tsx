"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Trash2, RefreshCw, Crown, User, AlertTriangle, Check, X, Clock, UserCheck, UserX } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function AdminPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 승인/거절 처리 중 상태
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch("/api/admin/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleApprove(memberId: string, action: "approve" | "reject") {
    setApproveLoading(memberId + action);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, action }),
      });
      if (res.ok) {
        fetchMembers();
      }
    } finally {
      setApproveLoading(null);
    }
  }

  async function handleRoleChange(memberId: string, newRole: "admin" | "member") {
    const res = await fetch(`/api/admin/users/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) fetchMembers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (res.ok) {
      setDeleteTarget(null);
      fetchMembers();
    }
  }

  const pendingMembers = members.filter((m) => m.status === "pending");
  const approvedMembers = members.filter((m) => m.status === "approved");
  const rejectedMembers = members.filter((m) => m.status === "rejected");

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-4xl mx-auto px-8 pt-12 pb-12 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">팀원관리</h1>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-0.5">
              가입 승인 및 팀원 접근 권한 관리
            </p>
          </div>
          <button
            onClick={fetchMembers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors border border-[#e9e9e7] dark:border-[#2f2f2f]"
          >
            <RefreshCw size={13} />
            새로고침
          </button>
        </div>

        {/* ── 승인 대기 섹션 ── */}
        {isAdmin && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                승인 대기
              </h2>
              {!membersLoading && pendingMembers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {pendingMembers.length}
                </span>
              )}
            </div>

            <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
              {membersLoading ? (
                <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                        <div className="h-2.5 w-40 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingMembers.length === 0 ? (
                <div className="text-center py-10 text-sm text-[#9b9a97]">
                  승인 대기 중인 가입 신청이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                  {pendingMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-[#fafaf9] dark:hover:bg-[#1f1f1f] transition-colors"
                    >
                      {/* 아바타 */}
                      <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <Clock size={15} className="text-amber-500" />
                      </div>

                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] truncate">
                          {m.name || <span className="text-[#9b9a97] italic text-xs font-normal">이름 미설정</span>}
                        </p>
                        <p className="text-xs text-[#9b9a97] truncate">{m.email}</p>
                      </div>

                      {/* 신청일 */}
                      <span className="text-xs text-[#9b9a97] hidden sm:block flex-shrink-0">
                        {new Date(m.created_at).toLocaleDateString("ko-KR")}
                      </span>

                      {/* 승인/거절 버튼 */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprove(m.id, "approve")}
                            disabled={approveLoading === m.id + "approve"}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                          >
                            {approveLoading === m.id + "approve" ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <UserCheck size={12} />
                            )}
                            승인
                          </button>
                          <button
                            onClick={() => handleApprove(m.id, "reject")}
                            disabled={approveLoading === m.id + "reject"}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                          >
                            {approveLoading === m.id + "reject" ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <UserX size={12} />
                            )}
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 팀원 목록 섹션 ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Check size={15} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
              팀원 목록
            </h2>
            {!membersLoading && (
              <span className="text-xs text-[#9b9a97]">({approvedMembers.length}명)</span>
            )}
          </div>

          <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_3fr_1.5fr_1fr] gap-4 px-4 py-2.5 bg-[#fafaf9] dark:bg-[#1f1f1f] border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이름</span>
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이메일</span>
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">역할</span>
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">관리</span>
            </div>

            {membersLoading ? (
              <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="grid grid-cols-[2fr_3fr_1.5fr_1fr] gap-4 items-center px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                      <div className="h-3 w-20 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                    </div>
                    <div className="h-3 w-36 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                    <div className="h-5 w-14 rounded-full bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                    <div />
                  </div>
                ))}
              </div>
            ) : approvedMembers.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#9b9a97]">
                승인된 팀원이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                {approvedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[2fr_3fr_1.5fr_1fr] gap-4 items-center px-4 py-3 hover:bg-[#fafaf9] dark:hover:bg-[#1f1f1f] transition-colors"
                  >
                    {/* 이름 */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center flex-shrink-0">
                        {m.role === "admin" ? (
                          <Crown size={13} className="text-amber-500" />
                        ) : (
                          <User size={13} className="text-[#9b9a97]" />
                        )}
                      </div>
                      <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">
                        {m.name || <span className="text-[#9b9a97] italic text-xs">미설정</span>}
                      </span>
                    </div>

                    {/* 이메일 */}
                    <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">
                      {m.email}
                    </span>

                    {/* 역할 */}
                    <div>
                      {isAdmin && profile && m.id !== profile.id ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as "admin" | "member")}
                          className="text-xs px-2 py-1 border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-md bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-[#e6e6e4] focus:outline-none cursor-pointer"
                        >
                          <option value="member">팀원</option>
                          <option value="admin">관리자</option>
                        </select>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#f0efed] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4]">
                          {m.role === "admin" ? "관리자" : "팀원"}
                        </span>
                      )}
                    </div>

                    {/* 관리 */}
                    <div>
                      {isAdmin && profile && m.id !== profile.id && (
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 size={12} />
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 거절된 계정 섹션 (관리자만) ── */}
        {isAdmin && rejectedMembers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <X size={15} className="text-red-400" />
              <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                거절된 신청
              </h2>
              <span className="text-xs text-[#9b9a97]">({rejectedMembers.length}건)</span>
            </div>

            <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
              <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                {rejectedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-[#fafaf9] dark:hover:bg-[#1f1f1f] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                      <UserX size={15} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#9b9a97] truncate">
                        {m.name || "이름 미설정"}
                      </p>
                      <p className="text-xs text-[#9b9a97] truncate">{m.email}</p>
                    </div>
                    {/* 재승인 또는 삭제 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(m.id, "approve")}
                        disabled={approveLoading === m.id + "approve"}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-emerald-600 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
                      >
                        <UserCheck size={11} />
                        승인
                      </button>
                      <button
                        onClick={() => setDeleteTarget(m)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 size={11} />
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">계정 삭제</h3>
                <p className="text-sm text-[#9b9a97] mt-1">정말 이 계정을 삭제하시겠습니까?</p>
              </div>
            </div>

            <div className="bg-[#f7f6f3] dark:bg-[#1f1f1f] rounded-lg px-4 py-3 mb-4">
              <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4]">
                {deleteTarget.name || "이름 미설정"}
              </p>
              <p className="text-xs text-[#9b9a97] mt-0.5">{deleteTarget.email}</p>
            </div>

            <p className="text-xs text-red-500 dark:text-red-400 mb-4">
              삭제 시 계정 및 모든 접근 권한이 즉시 제거됩니다.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2 text-sm rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
