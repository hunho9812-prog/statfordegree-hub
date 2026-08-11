"use client";

import { useState, useEffect, useCallback } from "react";
import { dbCashReceipts, type CashReceipt } from "@/lib/db-cash-receipts";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useCashReceipts() {
  const [rows, setRows] = useState<CashReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await dbCashReceipts.fetchAll();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    if (!isSupabaseConfigured || !supabase) return;
    const ch = supabase
      .channel("realtime:public:cash_receipts")
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_receipts" }, reload)
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [reload]);

  const upsert = useCallback(async (row: CashReceipt) => {
    const result = await dbCashReceipts.upsert(row);
    if (result.success) {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === row.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = row; return n; }
        return [...prev, row];
      });
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    const result = await dbCashReceipts.delete(id);
    if (result.success) setRows((prev) => prev.filter((r) => r.id !== id));
    return result;
  }, []);

  const reorder = useCallback(async (newRows: CashReceipt[]) => {
    setRows(newRows);
    await dbCashReceipts.updateOrder(newRows.map((r) => r.id));
  }, []);

  return { rows, loading, reload, upsert, remove, reorder };
}
