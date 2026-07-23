"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceStore, runMigrationIfNeeded, forceReseedManualPages } from "@/lib/store";
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

// updateCustomer는 로컬 state만 수정하므로 CRM도 짧은 디바운스로 처리
const CRM_TABLES = new Set(["customers", "customer_statuses", "table_columns", "workspace_config"]);
const FULL_DEBOUNCE_MS = 400;
const CRM_DEBOUNCE_MS = 300;

export function useSupabaseInit() {
  const loadFromSupabase = useWorkspaceStore((s) => s.loadFromSupabase);
  const { user } = useAuth();
  const fullDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crmDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 탭/창이 다시 보이게 될 때 자동 새로고침
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
    if (!isSupabaseConfigured || !supabase || !user) return;

    runMigrationIfNeeded()
      .then(() => forceReseedManualPages())
      .then(() => loadFromSupabase());

    // 일반 테이블 변경 → 400ms 후 전체 로드
    const scheduleFullReload = () => {
      if (fullDebounceTimer.current) clearTimeout(fullDebounceTimer.current);
      fullDebounceTimer.current = setTimeout(() => loadFromSupabase(), FULL_DEBOUNCE_MS);
    };

    // CRM 테이블 변경 → 2000ms 후 전체 로드
    // loadFromSupabase 내부에 로컬 신규 고객 보존 로직이 있어 race condition 없음
    const scheduleCrmReload = () => {
      if (crmDebounceTimer.current) clearTimeout(crmDebounceTimer.current);
      crmDebounceTimer.current = setTimeout(() => loadFromSupabase(), CRM_DEBOUNCE_MS);
    };

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
          .on("postgres_changes", { event: "*", schema: "public", table },
            CRM_TABLES.has(table) ? scheduleCrmReload : scheduleFullReload)
          .subscribe((_, err) => {
            if (err) console.error(`[Realtime] ${table} 구독 오류:`, err);
          })
      );
    });

    return () => {
      cancelled = true;
      if (fullDebounceTimer.current) clearTimeout(fullDebounceTimer.current);
      if (crmDebounceTimer.current) clearTimeout(crmDebounceTimer.current);
      channels.forEach((ch) => supabase?.removeChannel(ch));
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
