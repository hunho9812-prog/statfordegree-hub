"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "./AuthProvider";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  // 로그인 안된 경우 /login으로 redirect
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  if (pathname === "/login") {
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

  // 로그인 안된 상태 (redirect 진행 중) → 빈 화면
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
