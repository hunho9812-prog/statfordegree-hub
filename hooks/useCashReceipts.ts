"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dbCashReceipts, type CashReceipt } from "@/lib/db-cash-receipts";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const REALTIME_DEBOUNCE_MS = 400;

// 세션 내 모듈 레벨 캐시 — 페이지를 벗어났다가 다시 들어와도 이전 데이터를
// 즉시 보여주고(깜빡이는 로딩 없이) 뒤에서 조용히 최신화합니다(stale-while-revalidate).
// 첫 진입(캐시 없음)은 여전히 네트워크 왕복만큼 딜레이가 있습니다.
let cachedRows: CashReceipt[] | null = null;

export function useCashReceipts() {
  const [rows, setRows] = useState<CashReceipt[]>(() => cachedRows ?? []);
  const [loading, setLoading] = useState(() => cachedRows === null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setRowsAndCache: typeof setRows = useCallback((update) => {
    setRows((prev) => {
      const next = typeof update === "function" ? (update as (p: CashReceipt[]) => CashReceipt[])(prev) : update;
      cachedRows = next;
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    const data = await dbCashReceipts.fetchAll();
    cachedRows = data;
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    if (!isSupabaseConfigured || !supabase) return;

    // 여러 행이 연속으로 바뀌어도(대량 추가/수정) 이벤트마다 재조회하지 않고 묶어서 한 번만 조회
    const scheduleReload = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(reload, REALTIME_DEBOUNCE_MS);
    };

    const ch = supabase
      .channel("realtime:public:cash_receipts")
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_receipts" }, scheduleReload)
      .subscribe();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase?.removeChannel(ch);
    };
  }, [reload]);

  const upsert = useCallback(async (row: CashReceipt) => {
    const result = await dbCashReceipts.upsert(row);
    if (result.success) {
      setRowsAndCache((prev) => {
        const idx = prev.findIndex((r) => r.id === row.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = row; return n; }
        return [...prev, row];
      });
    }
    return result;
  }, [setRowsAndCache]);

  const remove = useCallback(async (id: string) => {
    const result = await dbCashReceipts.delete(id);
    if (result.success) setRowsAndCache((prev) => prev.filter((r) => r.id !== id));
    return result;
  }, [setRowsAndCache]);

  const reorder = useCallback(async (newRows: CashReceipt[]) => {
    setRowsAndCache(newRows);
    await dbCashReceipts.updateOrder(newRows.map((r) => r.id));
  }, [setRowsAndCache]);

  return { rows, loading, reload, upsert, remove, reorder };
}
