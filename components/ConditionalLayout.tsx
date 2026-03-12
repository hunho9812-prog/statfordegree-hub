"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "./AuthProvider";
import { useWorkspaceStore } from "@/lib/store";

// 로그인 없이 접근 허용되는 경로 (/auth/callback, /auth/signup 포함)
const PUBLIC_PATHS = ["/login", "/auth"];

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  const isInitialLoading = useWorkspaceStore((s) => s.isInitialLoading);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.replace("/login");
    }
  }, [user, loading, isPublicPath, router]);

  // /login, /auth/callback 등 공개 경로 → 그대로 렌더
  if (isPublicPath) {
    return <>{children}</>;
  }

  // 인증 로딩 중 → 스피너
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#191919]">
        <div className="w-6 h-6 border-2 border-[#37352f] dark:border-[#e6e6e4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 미로그인 (redirect 진행 중)
  if (!user) {
    return null;
  }

  // 로그인 후 Supabase에서 초기 데이터 로딩 중 → 스피너
  if (isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#191919]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#9b9a97]">데이터 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
