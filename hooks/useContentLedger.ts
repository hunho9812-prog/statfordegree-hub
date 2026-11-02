"use client";

import { useState, useEffect, useCallback } from "react";
import { dbContentLedger, type ContentLedgerEntry } from "@/lib/db-content-ledger";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useContentLedger() {
  const [entries, setEntries] = useState<ContentLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await dbContentLedger.fetchAll();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();

    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel("content_ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_ledger" }, () => {
        reload();
      })
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [reload]);

  const upsert = useCallback(async (entry: ContentLedgerEntry): Promise<{ success: boolean; error?: string }> => {
    const result = await dbContentLedger.upsert(entry);
    if (result.success) {
      setEntries((prev) => {
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
  }, []);

  const remove = useCallback(async (year: number, month: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await dbContentLedger.delete(year, month);
      setEntries((prev) => prev.filter((e) => !(e.year === year && e.month === month)));
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, []);

  return { entries, loading, reload, upsert, remove };
}
