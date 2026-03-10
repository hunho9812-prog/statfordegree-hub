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

    // 300ms 디바운스 재로드: 연속 이벤트를 하나의 fetch로 묶음
    const scheduleReload = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => loadFromSupabase(), DEBOUNCE_MS);
    };

    // @supabase/ssr의 createBrowserClient는 쿠키 기반 세션을 사용하므로
    // Realtime WebSocket에 인증 토큰을 명시적으로 전달해야 합니다.
    // 이를 하지 않으면 구독은 맺어지지만 이벤트를 수신하지 못합니다.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        supabase!.realtime.setAuth(session.access_token);
      }
    });

    // 테이블별 독립 채널 생성
    // 단일 채널에 여러 테이블을 묶으면 하나의 구독 실패가 전체에 영향을 줄 수 있으므로
    // 테이블마다 별도 채널을 사용합니다.
    const channels = REALTIME_TABLES.map((table) =>
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

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      channels.forEach((ch) => supabase?.removeChannel(ch));
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
