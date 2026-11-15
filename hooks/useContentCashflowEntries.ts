"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dbContentCashflowEntries, type ContentCashflowEntry, type CashflowEntryType } from "@/lib/db-content-cashflow-entries";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const REALTIME_DEBOUNCE_MS = 400;

let cachedEntries: ContentCashflowEntry[] | null = null;

export function useContentCashflowEntries() {
  const [entries, setEntries] = useState<ContentCashflowEntry[]>(() => cachedEntries ?? []);
  const [loading, setLoading] = useState(() => cachedEntries === null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const data = await dbContentCashflowEntries.fetchAll();
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
      .channel("content_cashflow_entries")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_cashflow_entries" }, scheduleReload)
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase?.removeChannel(channel);
    };
  }, [reload]);

  const add = useCallback(
    async (entry: { type: CashflowEntryType; amount: number; occurredOn: string; memo: string }) => {
      const result = await dbContentCashflowEntries.insert(entry);
      if (result.success) await reload();
      return result;
    },
    [reload]
  );

  const remove = useCallback(async (id: string) => {
    await dbContentCashflowEntries.remove(id);
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      cachedEntries = next;
      return next;
    });
  }, []);

  return { entries, loading, add, remove };
}
