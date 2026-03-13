"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace("/");
      });
    }
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError("등록되지 않은 계정입니다. 회원가입을 신청해주세요.");
    } else if (errorParam === "invite_expired") {
      setError("초대 링크가 만료되었습니다. 관리자에게 문의하세요.");
    } else if (errorParam === "pending") {
      setError("가입 신청이 아직 승인되지 않았습니다. 관리자 승인 후 로그인 가능합니다.");
    } else if (errorParam === "rejected") {
      setError("가입이 거절된 계정입니다. 관리자에게 문의하세요.");
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
      router.refresh();
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-style pr-10"
                  autoComplete="current-password"
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

            {/* 로그인 버튼 */}
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

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#e9e9e7] dark:bg-[#2f2f2f]" />
            <span className="text-xs text-[#c4c3bf] dark:text-[#4f4f4f]">또는</span>
            <div className="flex-1 h-px bg-[#e9e9e7] dark:bg-[#2f2f2f]" />
          </div>

          {/* 회원가입하기 버튼 */}
          <button
            type="button"
            onClick={() => router.push("/auth/signup")}
            disabled={!isSupabaseConfigured}
            className="w-full py-2.5 px-4 bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e6e6e4] rounded-lg text-sm font-semibold border border-[#e9e9e7] dark:border-[#3f3f3f] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            회원가입하기
          </button>

          <p className="mt-4 text-xs text-center text-[#9b9a97] dark:text-[#6b6b6b]">
            가입 후 관리자 승인이 필요합니다.
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
