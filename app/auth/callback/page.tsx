"use client";

/**
 * /auth/callback
 *
 * Supabase 초대 메일 클릭 시 이 페이지로 이동합니다.
 * URL 해시(#access_token=...&type=invite)를 createBrowserClient가
 * 자동으로 감지해 세션을 수립하고, onAuthStateChange 이벤트가 발행됩니다.
 * 세션 수립이 확인되면 홈으로 redirect 합니다.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    // 이미 세션이 있으면 바로 홈으로
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/");
      }
    });

    // createBrowserClient가 URL hash 토큰을 자동 처리함
    // SIGNED_IN 이벤트가 발행되면 홈으로 이동
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
        router.replace("/");
      } else if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f7f6f3] dark:bg-[#191919]">
      <div className="w-8 h-8 border-2 border-[#37352f] dark:border-[#e6e6e4] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[#9b9a97]">로그인 처리 중...</p>
    </div>
  );
}
