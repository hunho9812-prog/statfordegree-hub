"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dbContentLedger, type ContentLedgerEntry } from "@/lib/db-content-ledger";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const REALTIME_DEBOUNCE_MS = 400;

export function useContentLedger() {
  const [entries, setEntries] = useState<ContentLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const data = await dbContentLedger.fetchAll();
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
      .channel("content_ledger_entries")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_ledger_entries" }, scheduleReload)
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase?.removeChannel(channel);
    };
  }, [reload]);

  const upsert = useCallback(async (entry: ContentLedgerEntry) => {
    const result = await dbContentLedger.upsert(entry);
    if (result.success) {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === entry.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = entry; return next; }
        return [entry, ...prev];
      });
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    const result = await dbContentLedger.delete(id);
    if (result.success) setEntries((prev) => prev.filter((e) => e.id !== id));
    return result;
  }, []);

  return { entries, loading, reload, upsert, remove };
}
