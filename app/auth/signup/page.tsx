"use client";

/**
 * /auth/signup
 *
 * 초대 링크를 통해 인증된 사용자가 비밀번호(+이름)를 설정하는 페이지.
 *
 * 흐름:
 *   초대 링크 클릭 → /auth/callback (Supabase 토큰 처리) → 이 페이지
 *   → 비밀번호 설정 → 홈(/)
 *
 * 로그인 페이지에서 직접 접근:
 *   → 세션이 없으면 "초대가 필요하다"는 안내 화면 표시 (redirect 안 함)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, CheckCircle, Mail, ArrowLeft } from "lucide-react";

function StrengthItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${
        ok ? "text-emerald-600 dark:text-emerald-400" : "text-[#9b9a97]"
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
          ok ? "bg-emerald-500 border-emerald-500" : "border-[#c4c3bf]"
        }`}
      />
      {text}
    </div>
  );
}

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 이름 초기값: 초대 시 전달된 메타데이터에서
  useEffect(() => {
    if (user?.user_metadata?.name) {
      setName(user.user_metadata.name as string);
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      // 비밀번호 + 이름 업데이트
      const { error: updateError } = await supabase!.auth.updateUser({
        password,
        data: { name: name.trim() || user?.user_metadata?.name || "" },
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/"), 2000);
    } catch {
      setError("가입 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── 로딩 중 ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-[#191919]">
        <div className="w-6 h-6 border-2 border-[#37352f] dark:border-[#e6e6e4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── 초대 세션 없음: 안내 화면 ─────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-[#191919] px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg mb-4">
              📚
            </div>
            <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4] tracking-tight">
              Statfordegree Hub
            </h1>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-1">
              팀 지식관리 시스템
            </p>
          </div>

          <div className="bg-white dark:bg-[#252525] rounded-2xl shadow-sm border border-[#e9e9e7] dark:border-[#2f2f2f] p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-4">
              <Mail size={22} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-2">
              초대 링크가 필요합니다
            </h2>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mb-6 leading-relaxed">
              회원가입은 관리자가 발송한
              <br />
              <strong className="text-[#37352f] dark:text-[#e6e6e4]">초대 링크</strong>를 통해서만 가능합니다.
              <br />
              초대 메일을 확인하거나 관리자에게 문의하세요.
            </p>

            <div className="p-3 rounded-lg bg-[#f7f6f3] dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] text-left mb-6">
              <p className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-2">가입 방법</p>
              <ol className="text-xs text-[#9b9a97] dark:text-[#6b6b6b] space-y-1 list-decimal list-inside">
                <li>관리자에게 초대 요청</li>
                <li>이메일로 초대 링크 수신</li>
                <li>링크 클릭 → 비밀번호 설정</li>
                <li>로그인 완료</li>
              </ol>
            </div>

            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors mx-auto"
            >
              <ArrowLeft size={14} />
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 초대 세션 있음: 비밀번호 설정 ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-[#191919] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg mb-4">
            📚
          </div>
          <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4] tracking-tight">
            Statfordegree Hub
          </h1>
          <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-1">
            팀 지식관리 시스템
          </p>
        </div>

        <div className="bg-white dark:bg-[#252525] rounded-2xl shadow-sm border border-[#e9e9e7] dark:border-[#2f2f2f] p-8">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={40} className="text-emerald-500" />
              <h2 className="text-lg font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                가입 완료!
              </h2>
              <p className="text-sm text-[#9b9a97] text-center">
                비밀번호가 설정되었습니다.
                <br />
                잠시 후 메인 화면으로 이동합니다.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                  회원가입
                </h2>
                <p className="text-xs text-[#9b9a97] dark:text-[#6b6b6b] mt-1">
                  초대된 이메일:{" "}
                  <strong className="text-[#37352f] dark:text-[#e6e6e4]">
                    {user.email}
                  </strong>
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 이름 */}
                <div>
                  <label className="block text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] mb-1.5">
                    이름
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="input-style"
                    autoComplete="name"
                  />
                </div>

                {/* 이메일 (읽기 전용) */}
                <div>
                  <label className="block text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] mb-1.5">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={user.email ?? ""}
                    readOnly
                    className="input-style bg-[#f7f6f3] dark:bg-[#1f1f1f] text-[#9b9a97] cursor-not-allowed"
                  />
                </div>

                {/* 비밀번호 */}
                <div>
                  <label className="block text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] mb-1.5">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8자 이상"
                      required
                      className="input-style pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* 비밀번호 확인 */}
                <div>
                  <label className="block text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] mb-1.5">
                    비밀번호 확인
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="비밀번호 재입력"
                    required
                    className="input-style"
                    autoComplete="new-password"
                  />
                </div>

                {/* 비밀번호 강도 */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <StrengthItem ok={password.length >= 8} text="8자 이상" />
                    <StrengthItem ok={/[A-Za-z]/.test(password)} text="영문 포함" />
                    <StrengthItem ok={/[0-9]/.test(password)} text="숫자 포함" />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      가입 완료 중...
                    </span>
                  ) : (
                    "가입 완료"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
