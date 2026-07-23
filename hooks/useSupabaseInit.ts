"use client";

import { useEffect, useRef } from "react";
import {
  useWorkspaceStore,
  runMigrationIfNeeded,
  forceReseedManualPages,
  _reloadCustomers,
  _reloadColumns,
  _reloadStatuses,
  _reloadWorkspaceConfig,
} from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// 페이지/태스크/메뉴얼 테이블 — 변경 시 전체 로드
const FULL_RELOAD_TABLES = ["pages", "tasks", "manual_nodes", "manual_page_roots"];

// CRM 테이블 — 변경 시 해당 테이블만 부분 reload (빠르고 가벼움)
const CRM_TABLE_RELOADERS: Record<string, () => Promise<void>> = {
  customers: _reloadCustomers,
  table_columns: _reloadColumns,
  customer_statuses: _reloadStatuses,
  workspace_config: _reloadWorkspaceConfig,
};

// 전체 reload 디바운스 (ms) — 연속 이벤트 묶음
const FULL_DEBOUNCE_MS = 300;
// CRM 부분 reload 디바운스 (ms)
const CRM_DEBOUNCE_MS = 800;

export function useSupabaseInit() {
  const loadFromSupabase = useWorkspaceStore((s) => s.loadFromSupabase);
  const { user } = useAuth();
  const fullDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crmDebounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

    // 전체 reload 스케줄러 (pages, tasks, manual 계열)
    const scheduleFullReload = () => {
      if (fullDebounceTimer.current) clearTimeout(fullDebounceTimer.current);
      fullDebounceTimer.current = setTimeout(() => loadFromSupabase(), FULL_DEBOUNCE_MS);
    };

    // CRM 테이블별 부분 reload 스케줄러
    const scheduleCrmReload = (table: string) => {
      const timers = crmDebounceTimers.current;
      if (timers[table]) clearTimeout(timers[table]);
      timers[table] = setTimeout(() => {
        delete timers[table];
        CRM_TABLE_RELOADERS[table]?.();
      }, CRM_DEBOUNCE_MS);
    };

    let channels: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) {
        supabase!.realtime.setAuth(session.access_token);
      }

      // 전체 reload 테이블 구독
      const fullChannels = FULL_RELOAD_TABLES.map((table) =>
        supabase!
          .channel(`realtime:public:${table}`)
          .on("postgres_changes", { event: "*", schema: "public", table }, scheduleFullReload)
          .subscribe((_, err) => {
            if (err) console.error(`[Realtime] ${table} 구독 오류:`, err);
          })
      );

      // CRM 테이블 구독 (테이블별 부분 reload)
      const crmChannels = Object.keys(CRM_TABLE_RELOADERS).map((table) =>
        supabase!
          .channel(`realtime:public:${table}`)
          .on("postgres_changes", { event: "*", schema: "public", table },
            () => scheduleCrmReload(table))
          .subscribe((_, err) => {
            if (err) console.error(`[Realtime] ${table} 구독 오류:`, err);
          })
      );

      channels = [...fullChannels, ...crmChannels];
    });

    return () => {
      cancelled = true;
      if (fullDebounceTimer.current) clearTimeout(fullDebounceTimer.current);
      Object.values(crmDebounceTimers.current).forEach(clearTimeout);
      channels.forEach((ch) => supabase?.removeChannel(ch));
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
