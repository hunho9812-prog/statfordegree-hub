"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  RefreshCw,
  AlertTriangle,
  X,
  Clock,
  UserCheck,
  UserX,
  Bell,
  Trash2,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function RequestsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleAction(memberId: string, action: "approve" | "reject") {
    setActionLoading(memberId + action);
    setError(null);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
      } else {
        setError(data.error ?? "처리 중 오류가 발생했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(memberId: string) {
    setActionLoading(memberId + "delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchMembers();
      } else {
        const data = await res.json();
        setError(data.error ?? "삭제 중 오류가 발생했습니다.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  const pendingMembers = members.filter((m) => m.status === "pending");
  const rejectedMembers = members.filter((m) => m.status === "rejected");

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#191919]">
        <p className="text-sm text-[#9b9a97]">관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-4xl mx-auto px-8 pt-12 pb-12 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">신청관리</h1>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-0.5">
              가입 신청 승인 및 거절 처리
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

        {/* 오류 배너 */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* 승인 대기 섹션 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
              가입 승인 대기
            </h2>
            {!loading && pendingMembers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingMembers.length}건
              </span>
            )}
          </div>

          <div className="border-2 border-amber-200 dark:border-amber-800/50 rounded-xl overflow-hidden bg-amber-50/30 dark:bg-amber-950/10">
            {loading ? (
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-amber-100 dark:bg-amber-900/30 animate-pulse" />
                  <div className="h-2.5 w-48 rounded bg-amber-100 dark:bg-amber-900/30 animate-pulse" />
                </div>
              </div>
            ) : pendingMembers.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-4 text-sm text-[#9b9a97]">
                <Clock size={15} className="text-amber-400 flex-shrink-0" />
                승인 대기 중인 가입 신청이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-amber-200 dark:divide-amber-800/30">
                {pendingMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Clock size={15} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] truncate">
                        {m.name || <span className="text-[#9b9a97] italic text-xs font-normal">이름 미설정</span>}
                      </p>
                      <p className="text-xs text-[#9b9a97] truncate">{m.email}</p>
                    </div>
                    <span className="text-xs text-[#9b9a97] hidden sm:block flex-shrink-0">
                      {new Date(m.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAction(m.id, "approve")}
                        disabled={actionLoading === m.id + "approve"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                      >
                        {actionLoading === m.id + "approve"
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <UserCheck size={12} />}
                        승인
                      </button>
                      <button
                        onClick={() => handleAction(m.id, "reject")}
                        disabled={actionLoading === m.id + "reject"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === m.id + "reject"
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <UserX size={12} />}
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 거절된 신청 섹션 */}
        {(loading || rejectedMembers.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <X size={15} className="text-red-400" />
              <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">거절된 신청</h2>
              {!loading && (
                <span className="text-xs text-[#9b9a97]">({rejectedMembers.length}건)</span>
              )}
            </div>

            <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
              {loading ? (
                <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                        <div className="h-2.5 w-40 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rejectedMembers.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#9b9a97]">
                  거절된 신청이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                  {rejectedMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#fafaf9] dark:hover:bg-[#1f1f1f] transition-colors">
                      <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                        <UserX size={15} className="text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#9b9a97] truncate">{m.name || "이름 미설정"}</p>
                        <p className="text-xs text-[#9b9a97] truncate">{m.email}</p>
                      </div>
                      <span className="text-xs text-[#9b9a97] hidden sm:block flex-shrink-0">
                        {new Date(m.created_at).toLocaleDateString("ko-KR")}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAction(m.id, "approve")}
                          disabled={actionLoading === m.id + "approve"}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-emerald-600 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
                        >
                          <UserCheck size={11} />
                          승인
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={actionLoading === m.id + "delete"}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === m.id + "delete"
                            ? <RefreshCw size={11} className="animate-spin" />
                            : <Trash2 size={11} />}
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
