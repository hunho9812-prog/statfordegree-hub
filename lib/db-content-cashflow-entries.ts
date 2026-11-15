import { supabase } from "./supabase";

export type CashflowEntryType = "income" | "expense";

export interface ContentCashflowEntryRow {
  id: string;
  type: CashflowEntryType;
  amount: number;
  occurred_on: string;
  memo: string;
  created_at: string;
}

export interface ContentCashflowEntry {
  id: string;
  type: CashflowEntryType;
  amount: number;
  occurredOn: string;
  memo: string;
}

function rowToEntry(r: ContentCashflowEntryRow): ContentCashflowEntry {
  return {
    id: r.id,
    type: r.type,
    amount: r.amount,
    occurredOn: r.occurred_on,
    memo: r.memo,
  };
}

export const dbContentCashflowEntries = {
  async fetchAll(): Promise<ContentCashflowEntry[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("content_cashflow_entries")
      .select("*")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[content_cashflow_entries] fetchAll:", error);
      return [];
    }
    return (data as ContentCashflowEntryRow[]).map(rowToEntry);
  },

  async insert(entry: {
    type: CashflowEntryType;
    amount: number;
    occurredOn: string;
    memo: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase.from("content_cashflow_entries").insert({
      type: entry.type,
      amount: entry.amount,
      occurred_on: entry.occurredOn,
      memo: entry.memo,
    });
    if (error) {
      console.error("[content_cashflow_entries] insert:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async update(
    id: string,
    entry: { type: CashflowEntryType; amount: number; occurredOn: string; memo: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase
      .from("content_cashflow_entries")
      .update({
        type: entry.type,
        amount: entry.amount,
        occurred_on: entry.occurredOn,
        memo: entry.memo,
      })
      .eq("id", id);
    if (error) {
      console.error("[content_cashflow_entries] update:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async remove(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("content_cashflow_entries").delete().eq("id", id);
    if (error) console.error("[content_cashflow_entries] delete:", error);
  },
};
