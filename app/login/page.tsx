"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 이미 로그인된 경우 홈으로
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace("/");
      });
    }
    // 에러 파라미터 처리
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError("초대받지 않은 계정입니다. 관리자에게 초대를 요청하세요.");
    } else if (errorParam === "invite_expired") {
      setError("초대 링크가 만료되었습니다. 관리자에게 재초대를 요청하세요.");
    }
  }, [router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("이메일 인증이 필요합니다. 메일함을 확인해주세요.");
        } else {
          setError(authError.message);
        }
        return;
      }
      // 로그인 성공 → 홈으로 (AuthProvider의 onAuthStateChange가 profile 로드)
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-[#191919] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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

        {/* Card */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl shadow-sm border border-[#e9e9e7] dark:border-[#2f2f2f] p-8">
          <h2 className="text-lg font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-6">
            로그인
          </h2>

          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400">
              Supabase가 설정되지 않았습니다. 환경변수를 확인해주세요.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@example.com"
                required
                className="input-style"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-style"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !isSupabaseConfigured}
              className="w-full py-2.5 px-4 bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-[#9b9a97] dark:text-[#6b6b6b]">
            계정이 없으신가요? 관리자에게 초대를 요청하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-[#191919]">
        <div className="w-6 h-6 border-2 border-[#37352f] dark:border-[#37352f] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
