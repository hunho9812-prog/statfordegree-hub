"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceStore, runMigrationIfNeeded } from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// 실시간 변경을 감지할 테이블 목록
const REALTIME_TABLES = [
  "pages",
  "tasks",
  "customers",
  "customer_statuses",
  "table_columns",
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

  // 탭/창이 다시 보이게 될 때 자동 새로고침
  // → 다른 기기에서 변경한 내용을 노트북으로 전환 시 즉시 반영
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadFromSupabase();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user?.id, loadFromSupabase]);

  useEffect(() => {
    // 로그인 완료 전 또는 Supabase 미설정 시 중단
    if (!isSupabaseConfigured || !supabase || !user) return;

    // 최초 로드: 마이그레이션 먼저 실행 후 Supabase 데이터 로드
    // runMigrationIfNeeded: localStorage 데이터를 Supabase로 한 번만 업로드 (각 기기별)
    runMigrationIfNeeded().then(() => loadFromSupabase());

    // 300ms 디바운스 재로드: 연속 이벤트를 하나의 fetch로 묶음
    const scheduleReload = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => loadFromSupabase(), DEBOUNCE_MS);
    };

    // Realtime WebSocket에 인증 토큰을 먼저 설정한 뒤 채널 구독
    // (토큰 설정 전에 구독하면 이벤트를 수신하지 못할 수 있음)
    let channels: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) {
        supabase!.realtime.setAuth(session.access_token);
      }

      channels = REALTIME_TABLES.map((table) =>
        supabase!
          .channel(`realtime:public:${table}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table },
            scheduleReload
          )
          .subscribe((status, err) => {
            if (err) {
              console.error(`[Realtime] ${table} 구독 오류:`, err);
            }
          })
      );
    });

    return () => {
      cancelled = true;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      channels.forEach((ch) => supabase?.removeChannel(ch));
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
