"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getAllUsers, type UserProfile } from "@/lib/auth";
import { Shield, UserPlus, Trash2, RefreshCw, Crown, User } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const list = await getAllUsers();
    setUsers(list);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!profile || profile.role !== "admin") {
        router.replace("/");
        return;
      }
      fetchUsers();
    }
  }, [loading, profile, router, fetchUsers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMsg(null);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMsg({ type: "error", text: data.error ?? "초대 실패" });
      } else {
        setInviteMsg({ type: "success", text: `${inviteEmail}로 초대 메일을 발송했습니다.` });
        setInviteEmail("");
        fetchUsers();
      }
    } catch {
      setInviteMsg({ type: "error", text: "요청 중 오류가 발생했습니다." });
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: "admin" | "member") {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) fetchUsers();
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`${email} 계정을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#37352f] dark:border-[#e6e6e4] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") return null;

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-8 pt-12 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">
              팀 관리
            </h1>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b]">
              팀원 초대 및 권한 관리
            </p>
          </div>
        </div>

        {/* 팀원 초대 */}
        <section className="mb-8 bg-[#f7f6f3] dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-4">
            <UserPlus size={16} className="text-[#9b9a97]" />
            팀원 초대
          </h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="초대할 이메일 주소"
              required
              className="input-style flex-1"
            />
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-4 py-2 bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
            >
              {inviteLoading ? "발송 중..." : "초대 보내기"}
            </button>
          </form>

          {inviteMsg && (
            <p
              className={`mt-3 text-sm ${
                inviteMsg.type === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {inviteMsg.type === "success" ? "✓ " : "✗ "}
              {inviteMsg.text}
            </p>
          )}
          <p className="mt-3 text-xs text-[#9b9a97] dark:text-[#6b6b6b]">
            초대 메일을 받은 사람만 계정을 만들고 Hub에 접근할 수 있습니다.
          </p>
        </section>

        {/* 팀원 목록 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">
              팀원 목록
              <span className="ml-2 text-sm font-normal text-[#9b9a97]">
                ({users.length}명)
              </span>
            </h2>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors"
            >
              <RefreshCw size={13} />
              새로고침
            </button>
          </div>

          {usersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-5 h-5 border-2 border-[#9b9a97] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f]"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center flex-shrink-0">
                    {u.role === "admin" ? (
                      <Crown size={15} className="text-amber-500" />
                    ) : (
                      <User size={15} className="text-[#9b9a97]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] truncate">
                      {u.email}
                    </p>
                    <p className="text-xs text-[#9b9a97] mt-0.5">
                      가입일:{" "}
                      {new Date(u.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>

                  {/* Role badge + change */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {u.role === "admin" ? "관리자" : "멤버"}
                    </span>

                    {/* 자기 자신은 수정 불가 */}
                    {u.id !== profile.id && (
                      <>
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(
                              u.id,
                              e.target.value as "admin" | "member"
                            )
                          }
                          className="text-xs px-2 py-1 border border-[#e9e9e7] dark:border-[#3f3f3f] rounded bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-[#e6e6e4] focus:outline-none"
                        >
                          <option value="member">멤버</option>
                          <option value="admin">관리자</option>
                        </select>
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          className="w-7 h-7 flex items-center justify-center rounded text-[#9b9a97] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="계정 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <p className="text-center text-sm text-[#9b9a97] py-6">
                  팀원이 없습니다. 초대를 보내보세요.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
