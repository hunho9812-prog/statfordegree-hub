"use client";

import { useState, useEffect, useCallback } from "react";
import { dbKeywords, type KeywordEntry } from "@/lib/db-keywords";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useKeywords() {
  const [entries, setEntries] = useState<KeywordEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await dbKeywords.fetchAll();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();

    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel("realtime:public:keywords")
      .on("postgres_changes", { event: "*", schema: "public", table: "keywords" }, reload)
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [reload]);

  const upsert = useCallback(async (entry: KeywordEntry): Promise<{ success: boolean; error?: string }> => {
    const result = await dbKeywords.upsert(entry);
    if (result.success) {
      setEntries((prev) => {
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
  }, []);

  const remove = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const result = await dbKeywords.delete(id);
    if (result.success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
    return result;
  }, []);

  const reorder = useCallback(async (newOrder: KeywordEntry[]) => {
    setEntries(newOrder);
    await dbKeywords.updateOrder(newOrder.map((e) => e.id));
  }, []);

  return { entries, loading, reload, upsert, remove, reorder };
}
