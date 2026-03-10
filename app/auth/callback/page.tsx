"use client";

/**
 * /auth/callback
 *
 * 초대 메일 링크 클릭 시 Supabase가 이 페이지로 redirect합니다.
 * URL에 포함된 hash 토큰(#access_token=...&type=invite)을
 * AuthProvider의 onAuthStateChange가 자동으로 처리합니다.
 *
 * 이 페이지는 useAuth()로 처리 결과만 기다립니다.
 * (중복 onAuthStateChange 리스너를 만들지 않음)
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // 아직 처리 중

    if (user) {
      // 초대 링크로 접속 → 비밀번호 설정 페이지로 이동
      router.replace("/auth/signup");
    } else {
      // 토큰 처리 실패 (만료 등) → 로그인 페이지
      router.replace("/login?error=invite_expired");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f7f6f3] dark:bg-[#191919]">
      <div className="w-8 h-8 border-2 border-[#37352f] dark:border-[#e6e6e4] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[#9b9a97]">초대 확인 중...</p>
    </div>
  );
}
