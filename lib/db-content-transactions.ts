import { supabase } from "./supabase";

export type TransactionType = "income" | "expense";

export interface ContentTransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  occurred_on: string;
  memo: string;
  created_at: string;
}

export interface ContentTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  occurredOn: string;
  memo: string;
}

function rowToEntry(r: ContentTransactionRow): ContentTransaction {
  return {
    id: r.id,
    type: r.type,
    amount: r.amount,
    occurredOn: r.occurred_on,
    memo: r.memo,
  };
}

export const dbContentTransactions = {
  async fetchAll(): Promise<ContentTransaction[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("content_transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[content_transactions] fetchAll:", error);
      return [];
    }
    return (data as ContentTransactionRow[]).map(rowToEntry);
  },

  async insert(entry: {
    type: TransactionType;
    amount: number;
    occurredOn: string;
    memo: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase.from("content_transactions").insert({
      type: entry.type,
      amount: entry.amount,
      occurred_on: entry.occurredOn,
      memo: entry.memo,
    });
    if (error) {
      console.error("[content_transactions] insert:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async update(
    id: string,
    entry: { type: TransactionType; amount: number; occurredOn: string; memo: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase
      .from("content_transactions")
      .update({
        type: entry.type,
        amount: entry.amount,
        occurred_on: entry.occurredOn,
        memo: entry.memo,
      })
      .eq("id", id);
    if (error) {
      console.error("[content_transactions] update:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async remove(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("content_transactions").delete().eq("id", id);
    if (error) console.error("[content_transactions] delete:", error);
  },
};
