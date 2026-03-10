"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export function useSupabaseInit() {
  const loadFromSupabase = useWorkspaceStore((s) => s.loadFromSupabase);
  const { user } = useAuth();

  // 인증 완료 후에만 실행 — 미인증 상태에서는 RLS가 모든 쿼리를 차단해
  // fetchAll이 빈 배열을 반환하고 로컬 데이터가 날아가거나 동기화가 실패함
  useEffect(() => {
    if (isSupabaseConfigured && user) {
      loadFromSupabase();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
