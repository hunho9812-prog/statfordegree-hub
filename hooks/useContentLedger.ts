"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dbContentLedger, type ContentLedgerEntry } from "@/lib/db-content-ledger";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const REALTIME_DEBOUNCE_MS = 400;

// 세션 내 모듈 레벨 캐시 — 페이지를 벗어났다가 다시 들어와도 이전 데이터를
// 즉시 보여주고(깜빡이는 로딩 없이) 뒤에서 조용히 최신화합니다(stale-while-revalidate).
let cachedEntries: ContentLedgerEntry[] | null = null;

export function useContentLedger() {
  const [entries, setEntries] = useState<ContentLedgerEntry[]>(() => cachedEntries ?? []);
  const [loading, setLoading] = useState(() => cachedEntries === null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEntriesAndCache: typeof setEntries = useCallback((update) => {
    setEntries((prev) => {
      const next = typeof update === "function" ? (update as (p: ContentLedgerEntry[]) => ContentLedgerEntry[])(prev) : update;
      cachedEntries = next;
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    const data = await dbContentLedger.fetchAll();
    cachedEntries = data;
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();

    if (!isSupabaseConfigured || !supabase) return;

    const scheduleReload = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(reload, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("content_ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_ledger" }, scheduleReload)
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase?.removeChannel(channel);
    };
  }, [reload]);

  const upsert = useCallback(async (entry: ContentLedgerEntry): Promise<{ success: boolean; error?: string }> => {
    const result = await dbContentLedger.upsert(entry);
    if (result.success) {
      setEntriesAndCache((prev) => {
        const idx = prev.findIndex((e) => e.year === entry.year && e.month === entry.month);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
      });
    }
    return result;
  }, [setEntriesAndCache]);

  const remove = useCallback(async (year: number, month: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await dbContentLedger.delete(year, month);
      setEntriesAndCache((prev) => prev.filter((e) => !(e.year === year && e.month === month)));
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, [setEntriesAndCache]);

  return { entries, loading, reload, upsert, remove };
}
