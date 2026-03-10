"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// 실시간 변경을 감지할 테이블 목록
const REALTIME_TABLES = [
  "pages",
  "tasks",
  "customers",
  "customer_statuses",
  "manual_nodes",
  "manual_page_roots",
  "workspace_config",
];

// 연속 이벤트를 하나로 묶어 불필요한 중복 fetch 방지 (ms)
const DEBOUNCE_MS = 300;

export function useSupabaseInit() {
  const loadFromSupabase = useWorkspaceStore((s) => s.loadFromSupabase);
  const { user } = useAuth();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 로그인 완료 전 또는 Supabase 미설정 시 중단
    if (!isSupabaseConfigured || !supabase || !user) return;

    // 최초 로드
    loadFromSupabase();

    // 300ms 디바운스 재로드 함수:
    // 현재 기기의 변경과 다른 기기의 변경 모두 동일하게 처리하되,
    // 연속 이벤트가 몰릴 때 fetch를 하나로 묶음
    const scheduleReload = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => loadFromSupabase(), DEBOUNCE_MS);
    };

    // 모든 테이블의 INSERT / UPDATE / DELETE 이벤트 구독
    // ※ Supabase 대시보드에서 해당 테이블의 Realtime이 활성화되어 있어야 합니다.
    let channel = supabase.channel("workspace-realtime");
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        scheduleReload
      );
    }
    channel.subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
