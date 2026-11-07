"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dbKeywords, type KeywordEntry } from "@/lib/db-keywords";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const REALTIME_DEBOUNCE_MS = 400;

// 세션 내 모듈 레벨 캐시 — 페이지를 벗어났다가 다시 들어와도 이전 데이터를
// 즉시 보여주고(깜빡이는 로딩 없이) 뒤에서 조용히 최신화합니다(stale-while-revalidate).
let cachedEntries: KeywordEntry[] | null = null;

export function useKeywords() {
  const [entries, setEntries] = useState<KeywordEntry[]>(() => cachedEntries ?? []);
  const [loading, setLoading] = useState(() => cachedEntries === null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEntriesAndCache: typeof setEntries = useCallback((update) => {
    setEntries((prev) => {
      const next = typeof update === "function" ? (update as (p: KeywordEntry[]) => KeywordEntry[])(prev) : update;
      cachedEntries = next;
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    const data = await dbKeywords.fetchAll();
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
      .channel("realtime:public:keywords")
      .on("postgres_changes", { event: "*", schema: "public", table: "keywords" }, scheduleReload)
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase?.removeChannel(channel);
    };
  }, [reload]);

  const upsert = useCallback(async (entry: KeywordEntry): Promise<{ success: boolean; error?: string }> => {
    const result = await dbKeywords.upsert(entry);
    if (result.success) {
      setEntriesAndCache((prev) => {
        const idx = prev.findIndex((e) => e.id === entry.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });
    }
    return result;
  }, [setEntriesAndCache]);

  const remove = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const result = await dbKeywords.delete(id);
    if (result.success) {
      setEntriesAndCache((prev) => prev.filter((e) => e.id !== id));
    }
    return result;
  }, [setEntriesAndCache]);

  const reorder = useCallback(async (newOrder: KeywordEntry[]) => {
    setEntriesAndCache(newOrder);
    await dbKeywords.updateOrder(newOrder.map((e) => e.id));
  }, [setEntriesAndCache]);

  return { entries, loading, reload, upsert, remove, reorder };
}
