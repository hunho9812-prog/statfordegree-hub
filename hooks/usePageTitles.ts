"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const REALTIME_DEBOUNCE_MS = 400;

let cachedTitles: Record<string, string> | null = null;

export function usePageTitles() {
  const [titles, setTitles] = useState<Record<string, string>>(() => cachedTitles ?? {});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("page_titles").select("key, title");
    if (error) {
      console.error("[page_titles] fetchAll:", error);
      return;
    }
    const map: Record<string, string> = {};
    for (const row of data as { key: string; title: string }[]) map[row.key] = row.title;
    cachedTitles = map;
    setTitles(map);
  }, []);

  useEffect(() => {
    reload();

    if (!isSupabaseConfigured || !supabase) return;

    const scheduleReload = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(reload, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("page_titles")
      .on("postgres_changes", { event: "*", schema: "public", table: "page_titles" }, scheduleReload)
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase?.removeChannel(channel);
    };
  }, [reload]);

  const setTitle = useCallback(async (key: string, title: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase
      .from("page_titles")
      .upsert({ key, title, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return { success: false, error: error.message };
    setTitles((prev) => {
      const next = { ...prev, [key]: title };
      cachedTitles = next;
      return next;
    });
    return { success: true };
  }, []);

  const getTitle = useCallback((key: string, fallback: string) => titles[key] ?? fallback, [titles]);

  return { getTitle, setTitle };
}
