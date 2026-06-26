"use client";

import { useState, useEffect, useCallback } from "react";
import { dbLedger, type LedgerEntry } from "@/lib/db-ledger";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await dbLedger.fetchAll();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();

    if (!isSupabaseConfigured || !supabase) return;

    // 실시간 구독 — 장부 저장 즉시 통계에 반영
    const channel = supabase
      .channel("realtime:public:ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "ledger" }, () => {
        reload();
      })
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [reload]);

  const upsert = useCallback(async (entry: LedgerEntry) => {
    await dbLedger.upsert(entry);
    // 로컬 상태도 즉시 갱신 (실시간 이벤트 도달 전 즉각 반영)
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.year === entry.year && e.month === entry.month);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    });
  }, []);

  return { entries, loading, reload, upsert };
}
