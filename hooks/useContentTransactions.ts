"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dbContentTransactions, type ContentTransaction, type TransactionType } from "@/lib/db-content-transactions";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const REALTIME_DEBOUNCE_MS = 400;

let cachedEntries: ContentTransaction[] | null = null;

export function useContentTransactions() {
  const [entries, setEntries] = useState<ContentTransaction[]>(() => cachedEntries ?? []);
  const [loading, setLoading] = useState(() => cachedEntries === null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const data = await dbContentTransactions.fetchAll();
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
      .channel("content_transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_transactions" }, scheduleReload)
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase?.removeChannel(channel);
    };
  }, [reload]);

  const add = useCallback(
    async (entry: { type: TransactionType; amount: number; occurredOn: string; memo: string }) => {
      const result = await dbContentTransactions.insert(entry);
      if (result.success) await reload();
      return result;
    },
    [reload]
  );

  const remove = useCallback(async (id: string) => {
    await dbContentTransactions.remove(id);
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      cachedEntries = next;
      return next;
    });
  }, []);

  return { entries, loading, add, remove };
}
