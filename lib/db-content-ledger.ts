import { supabase } from "./supabase";

export type ContentLedgerType = "income" | "expense";

export interface ContentLedgerEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  type: ContentLedgerType;
  item: string;
  channel: string;
  amount: number;
  memo: string;
  created_at?: string;
}

export const dbContentLedger = {
  async fetchAll(): Promise<ContentLedgerEntry[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("content_ledger_entries")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) { console.error("[content_ledger_entries] fetchAll:", error); return []; }
    return (data ?? []) as ContentLedgerEntry[];
  },

  async upsert(row: ContentLedgerEntry): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase 미설정" };
    const { error } = await supabase.from("content_ledger_entries").upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase 미설정" };
    const { error } = await supabase.from("content_ledger_entries").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
