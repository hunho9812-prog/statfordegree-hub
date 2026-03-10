"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { UserPlus, Trash2, RefreshCw, Crown, User, X, AlertTriangle } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "pending";
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // 초대 모달
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.replace("/login");
        return;
      }
      fetchMembers();
    }
  }, [loading, profile, router, fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMsg({ type: "error", text: data.error ?? "초대 실패" });
      } else {
        setInviteMsg({ type: "success", text: `${inviteEmail}로 초대 메일을 발송했습니다.` });
        setInviteName("");
        setInviteEmail("");
        setInviteRole("member");
        fetchMembers();
      }
    } catch {
      setInviteMsg({ type: "error", text: "요청 중 오류가 발생했습니다." });
    } finally {
      setInviteLoading(false);
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#37352f] dark:border-[#e6e6e4] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-4xl mx-auto px-8 pt-12 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">팀원관리</h1>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-0.5">
              팀원 초대 및 접근 권한 관리
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setShowInviteModal(true); setInviteMsg(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <UserPlus size={15} />
              팀원 초대
            </button>
          )}
        </div>

        {/* 팀원 목록 테이블 */}
        <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center px-4 py-3 bg-[#f7f6f3] dark:bg-[#252525] border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                현재 팀원 목록
                <span className="ml-2 text-xs font-normal text-[#9b9a97]">
                  ({members.length}명)
                </span>
              </span>
              <button
                onClick={fetchMembers}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[#9b9a97] hover:bg-[#e9e9e7] dark:hover:bg-[#3f3f3f] transition-colors"
              >
                <RefreshCw size={12} />
                새로고침
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_3fr_1.5fr_1.2fr_1fr] gap-4 px-4 py-2.5 bg-[#fafaf9] dark:bg-[#1f1f1f] border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이름</span>
            <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">이메일</span>
            <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">역할</span>
            <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">상태</span>
            <span className="text-xs font-medium text-[#9b9a97] uppercase tracking-wide">관리</span>
          </div>

          {/* Rows */}
          {membersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-5 h-5 border-2 border-[#9b9a97] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#9b9a97]">
              팀원이 없습니다. 초대를 보내보세요.
            </div>
          ) : (
            <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[2fr_3fr_1.5fr_1.2fr_1fr] gap-4 items-center px-4 py-3 hover:bg-[#fafaf9] dark:hover:bg-[#1f1f1f] transition-colors"
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
                      {m.name || <span className="text-[#9b9a97] italic">미설정</span>}
                    </span>
                  </div>

                  {/* 이메일 */}
                  <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">
                    {m.email}
                  </span>

                  {/* 역할 */}
                  <div>
                    {isAdmin && m.id !== profile.id ? (
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

                  {/* 상태 */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                      m.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {m.status === "active" ? "활성" : "초대대기"}
                  </span>

                  {/* 관리 */}
                  <div>
                    {isAdmin && m.id !== profile.id && (
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
      </div>

      {/* 팀원 초대 모달 */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-[#9b9a97]" />
                <h2 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">팀원 초대</h2>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9b9a97] mb-1.5">이름 (선택)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="홍길동"
                  className="input-style w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9b9a97] mb-1.5">이메일 <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="team@example.com"
                  required
                  className="input-style w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9b9a97] mb-1.5">역할</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRole("member")}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      inviteRole === "member"
                        ? "bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] border-[#37352f] dark:border-[#e6e6e4]"
                        : "border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]"
                    }`}
                  >
                    팀원
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRole("admin")}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      inviteRole === "admin"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]"
                    }`}
                  >
                    관리자
                  </button>
                </div>
              </div>

              {inviteMsg && (
                <p className={`text-sm ${inviteMsg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {inviteMsg.type === "success" ? "✓ " : "✗ "}{inviteMsg.text}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 py-2 text-sm rounded-lg bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {inviteLoading ? "발송 중..." : "초대 보내기"}
                </button>
              </div>

              <p className="text-xs text-[#9b9a97] dark:text-[#6b6b6b] text-center">
                초대 메일을 받은 사람만 Hub에 접근할 수 있습니다.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">팀원 제거</h3>
                <p className="text-sm text-[#9b9a97] mt-1">
                  정말 이 팀원을 제거하시겠습니까?
                </p>
              </div>
            </div>

            <div className="bg-[#f7f6f3] dark:bg-[#1f1f1f] rounded-lg px-4 py-3 mb-5">
              <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4]">
                {deleteTarget.name || "이름 미설정"}
              </p>
              <p className="text-xs text-[#9b9a97] mt-0.5">{deleteTarget.email}</p>
            </div>

            <p className="text-xs text-red-500 dark:text-red-400 mb-4">
              삭제 시 해당 계정의 접근 권한이 즉시 제거됩니다.
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
