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
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

interface SignupRequest {
  id: string;
  email: string;
  name: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
}

export default function RequestsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";
  const profileLoading = !authLoading && !!user && profile === null;

  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<SignupRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/signup-requests");
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests ?? []);
      } else {
        setFetchError(data.error ?? `오류 (${res.status})`);
      }
    } catch {
      setFetchError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !profileLoading && isAdmin) {
      fetchRequests();
    }
  }, [authLoading, profileLoading, isAdmin, fetchRequests]);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setActionLoading(requestId + action);
    setActionError(null);
    setConfirmRequest(null);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchRequests();
      } else {
        setActionError(data.error ?? "처리 중 오류가 발생했습니다.");
      }
    } catch {
      setActionError("네트워크 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteRequest(requestId: string) {
    setActionLoading(requestId + "delete");
    setActionError(null);
    try {
      // 거절된 신청 삭제 (signup_requests에서만 제거)
      const res = await fetch(`/api/admin/signup-requests/${requestId}`, { method: "DELETE" });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        const data = await res.json();
        setActionError(data.error ?? "삭제 중 오류가 발생했습니다.");
      }
    } catch {
      setActionError("네트워크 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");

  if (authLoading || profileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#191919]">
        <RefreshCw size={18} className="animate-spin text-[#9b9a97]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#191919]">
        <ShieldAlert size={28} className="text-[#c4c3bf]" />
        <p className="text-sm text-[#9b9a97]">관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-4xl mx-auto px-8 pt-12 pb-12 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">신청관리</h1>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-0.5">
              회원가입 신청 승인 및 거절 처리
            </p>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors border border-[#e9e9e7] dark:border-[#2f2f2f] disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {/* 오류 배너 */}
        {fetchError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">데이터를 불러오지 못했습니다</p>
              <p className="text-xs text-red-500 mt-0.5">{fetchError}</p>
            </div>
            <button onClick={fetchRequests} className="text-xs text-red-500 hover:underline flex-shrink-0">재시도</button>
          </div>
        )}
        {actionError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-red-700 dark:text-red-300">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── 승인 대기 ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">가입 승인 대기</h2>
            {!loading && pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingRequests.length}건
              </span>
            )}
          </div>

          <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-4 px-4 py-2.5 bg-[#fafaf9] dark:bg-[#1f1f1f] border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이름</span>
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이메일</span>
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">신청시간</span>
              <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">처리</span>
            </div>

            {loading ? (
              <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-4 items-center px-4 py-3">
                    <div className="h-3 w-20 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                    <div className="h-3 w-36 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                    <div className="h-3 w-16 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                    <div className="h-6 w-24 rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6 text-sm text-[#9b9a97]">
                <Clock size={15} className="text-amber-400 flex-shrink-0" />
                승인 대기 중인 가입 신청이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                {pendingRequests.map((r) => (
                  <div key={r.id} className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-4 items-center px-4 py-3 hover:bg-[#fafaf9] dark:hover:bg-[#1f1f1f] transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <Clock size={12} className="text-amber-500" />
                      </div>
                      <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">
                        {r.name || <span className="text-[#9b9a97] italic text-xs">미설정</span>}
                      </span>
                    </div>
                    <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">{r.email}</span>
                    <span className="text-xs text-[#9b9a97]">
                      {new Date(r.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmRequest(r)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                      >
                        {actionLoading === r.id + "approve"
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <UserCheck size={12} />}
                        승인
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "reject")}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === r.id + "reject"
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

        {/* ── 승인 완료 ── */}
        {(loading || approvedRequests.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">승인 완료</h2>
              {!loading && <span className="text-xs text-[#9b9a97]">({approvedRequests.length}건)</span>}
            </div>
            <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[2fr_3fr_1.5fr_1fr] gap-4 px-4 py-2.5 bg-[#fafaf9] dark:bg-[#1f1f1f] border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이름</span>
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이메일</span>
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">신청시간</span>
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">상태</span>
              </div>
              {loading ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-3 w-full rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                </div>
              ) : (
                <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                  {approvedRequests.map((r) => (
                    <div key={r.id} className="grid grid-cols-[2fr_3fr_1.5fr_1fr] gap-4 items-center px-4 py-3">
                      <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">{r.name || "-"}</span>
                      <span className="text-sm text-[#9b9a97] truncate">{r.email}</span>
                      <span className="text-xs text-[#9b9a97]">
                        {new Date(r.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit">
                        승인됨
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 거절된 신청 ── */}
        {(loading || rejectedRequests.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <X size={15} className="text-red-400" />
              <h2 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">거절된 신청</h2>
              {!loading && <span className="text-xs text-[#9b9a97]">({rejectedRequests.length}건)</span>}
            </div>
            <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-4 px-4 py-2.5 bg-[#fafaf9] dark:bg-[#1f1f1f] border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이름</span>
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이메일</span>
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">신청시간</span>
                <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">처리</span>
              </div>
              {loading ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-3 w-full rounded bg-[#f0efed] dark:bg-[#2f2f2f] animate-pulse" />
                </div>
              ) : (
                <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
                  {rejectedRequests.map((r) => (
                    <div key={r.id} className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-4 items-center px-4 py-3 hover:bg-[#fafaf9] dark:hover:bg-[#1f1f1f] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                          <UserX size={12} className="text-red-400" />
                        </div>
                        <span className="text-sm text-[#9b9a97] truncate">{r.name || "미설정"}</span>
                      </div>
                      <span className="text-sm text-[#9b9a97] truncate">{r.email}</span>
                      <span className="text-xs text-[#9b9a97]">
                        {new Date(r.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmRequest({ ...r, status: "pending" })}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-emerald-600 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
                        >
                          <UserCheck size={11} />
                          재승인
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(r.id)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === r.id + "delete"
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

      {/* 승인 확인 모달 */}
      {confirmRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0">
                <UserCheck size={16} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">회원가입 승인</h3>
                <p className="text-sm text-[#9b9a97] mt-1">이 계정의 가입을 승인하시겠습니까?</p>
              </div>
            </div>
            <div className="bg-[#f7f6f3] dark:bg-[#1f1f1f] rounded-lg px-4 py-3 mb-4 space-y-1">
              <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4]">{confirmRequest.name || "이름 미설정"}</p>
              <p className="text-xs text-[#9b9a97]">{confirmRequest.email}</p>
            </div>
            <p className="text-xs text-[#9b9a97] mb-4">
              승인 시 Supabase Auth 계정이 생성되고 팀원으로 추가됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRequest(null)}
                className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleAction(confirmRequest.id, "approve")}
                disabled={actionLoading === confirmRequest.id + "approve"}
                className="flex-1 py-2 text-sm rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === confirmRequest.id + "approve" ? "승인 중..." : "승인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
