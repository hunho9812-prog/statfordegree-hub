"use client";

import { useEffect, useRef } from "react";
import {
  useWorkspaceStore,
  runMigrationIfNeeded,
  forceReseedManualPages,
  _reloadPages,
  _reloadTasks,
  _reloadCustomers,
  _reloadStatuses,
  _reloadColumns,
  _reloadManualPages,
  _reloadWorkspaceConfig,
} from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// 테이블별 부분 reload — 변경된 테이블만 다시 가져와서, 서로 무관한 테이블 변경이
// (예: 매뉴얼 문서 자동저장) CRM/업무 전체 재조회·리렌더를 유발하지 않도록 함
const TABLE_RELOADERS: Record<string, () => Promise<void>> = {
  pages: _reloadPages,
  tasks: _reloadTasks,
  customers: _reloadCustomers,
  customer_statuses: _reloadStatuses,
  table_columns: _reloadColumns,
  manual_nodes: _reloadManualPages,
  manual_page_roots: _reloadManualPages,
  workspace_config: _reloadWorkspaceConfig,
};

// updateCustomer는 로컬 state만 수정하므로 CRM도 짧은 디바운스로 처리
const CRM_TABLES = new Set(["customers", "customer_statuses", "table_columns", "workspace_config"]);
const FULL_DEBOUNCE_MS = 400;
const CRM_DEBOUNCE_MS = 300;

export function useSupabaseInit() {
  const loadFromSupabase = useWorkspaceStore((s) => s.loadFromSupabase);
  const { user } = useAuth();
  // 테이블별 디바운스 타이머 (한 테이블의 연속 변경을 묶어서 한 번만 재조회)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

    // 테이블 변경 → 디바운스 후 그 테이블만 부분 재조회
    // (다른 테이블의 변경과 전혀 상관없는 전체 재조회가 발생하지 않도록 함)
    const scheduleReload = (table: string) => {
      const reloadFn = TABLE_RELOADERS[table];
      if (!reloadFn) return;
      const delay = CRM_TABLES.has(table) ? CRM_DEBOUNCE_MS : FULL_DEBOUNCE_MS;
      if (debounceTimers.current[table]) clearTimeout(debounceTimers.current[table]);
      debounceTimers.current[table] = setTimeout(() => {
        delete debounceTimers.current[table];
        reloadFn();
      }, delay);
    };

    let channels: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) {
        supabase!.realtime.setAuth(session.access_token);
      }

      channels = Object.keys(TABLE_RELOADERS).map((table) =>
        supabase!
          .channel(`realtime:public:${table}`)
          .on("postgres_changes", { event: "*", schema: "public", table },
            () => scheduleReload(table))
          .subscribe((_, err) => {
            if (err) console.error(`[Realtime] ${table} 구독 오류:`, err);
          })
      );
    });

    return () => {
      cancelled = true;
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};
      channels.forEach((ch) => supabase?.removeChannel(ch));
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
