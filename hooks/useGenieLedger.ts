"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface GenieLedgerEntry {
  year: number;
  month: number;
  sales: number;
  laborCost: number;
  businessCost: number;
  nonOperatingIncome: number;
  profit: number;
}

interface GenieLedgerRow {
  id: string;
  year: number;
  month: number;
  sales: number;
  labor_cost: number;
  business_cost: number;
  non_operating_income: number;
  profit: number;
}

function rowToEntry(r: GenieLedgerRow): GenieLedgerEntry {
  return {
    year: r.year,
    month: r.month,
    sales: r.sales,
    laborCost: r.labor_cost,
    businessCost: r.business_cost,
    nonOperatingIncome: r.non_operating_income ?? 0,
    profit: r.profit,
  };
}

export function useGenieLedger() {
  const [entries, setEntries] = useState<GenieLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from("genie_ledger")
      .select("*")
      .order("year", { ascending: true })
      .order("month", { ascending: true });
    if (data) setEntries((data as GenieLedgerRow[]).map(rowToEntry));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    if (!isSupabaseConfigured || !supabase) return;
    const ch = supabase!
      .channel("genie_ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "genie_ledger" }, reload)
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [reload]);

  const upsert = useCallback(async (entry: GenieLedgerEntry): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: "Supabase 미설정" };
    const { v4: uuidv4 } = await import("uuid");
    const { error } = await supabase.from("genie_ledger").upsert(
      {
        id: uuidv4(),
        year: entry.year,
        month: entry.month,
        sales: entry.sales,
        labor_cost: entry.laborCost,
        business_cost: entry.businessCost,
        non_operating_income: entry.nonOperatingIncome,
        profit: entry.profit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "year,month" }
    );
    if (error) return { success: false, error: error.message };
    await reload();
    return { success: true };
  }, [reload]);

  const remove = useCallback(async (year: number, month: number): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: "Supabase 미설정" };
    const { error } = await supabase.from("genie_ledger").delete().eq("year", year).eq("month", month);
    if (error) return { success: false, error: error.message };
    await reload();
    return { success: true };
  }, [reload]);

  return { entries, loading, reload, upsert, remove };
}
