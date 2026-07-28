import { supabase } from "./supabase";

export interface CashReceipt {
  id: string;
  customer_id: string | null;
  customer_name: string;
  assignee: string;
  phone: string;
  amount: number;
  issued: boolean;
  display_order: number;
  created_at?: string;
}

export const dbCashReceipts = {
  async fetchAll(): Promise<CashReceipt[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("cash_receipts")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) { console.error("[cash_receipts] fetchAll:", error); return []; }
    return (data ?? []) as CashReceipt[];
  },

  async upsert(row: CashReceipt): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase 미설정" };
    const { error } = await supabase.from("cash_receipts").upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updateOrder(ids: string[]): Promise<void> {
    if (!supabase) return;
    const updates = ids.map((id, i) => ({ id, display_order: i }));
    await supabase.from("cash_receipts").upsert(updates, { onConflict: "id" });
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase 미설정" };
    const { error } = await supabase.from("cash_receipts").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
