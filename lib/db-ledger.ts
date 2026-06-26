import { supabase } from "./supabase";

export interface LedgerRow {
  id: string;
  year: number;
  month: number;
  sales: number;
  labor_cost: number;
  business_cost: number;
  profit: number;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  year: number;
  month: number;
  sales: number;
  laborCost: number;
  businessCost: number;
  profit: number;
}

function rowToEntry(r: LedgerRow): LedgerEntry {
  return {
    year: r.year,
    month: r.month,
    sales: r.sales,
    laborCost: r.labor_cost,
    businessCost: r.business_cost,
    profit: r.profit,
  };
}

export const dbLedger = {
  async fetchAll(): Promise<LedgerEntry[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("ledger")
      .select("*")
      .order("year", { ascending: true })
      .order("month", { ascending: true });
    if (error) { console.error("[ledger] fetchAll:", error); return []; }
    return (data as LedgerRow[]).map(rowToEntry);
  },

  async upsert(entry: LedgerEntry): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "로그인이 필요합니다." };
    const { error } = await supabase.from("ledger").upsert(
      {
        user_id: user.id,
        year: entry.year,
        month: entry.month,
        sales: entry.sales,
        labor_cost: entry.laborCost,
        business_cost: entry.businessCost,
        profit: entry.profit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year,month" }
    );
    if (error) {
      console.error("[ledger] upsert:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async delete(year: number, month: number): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from("ledger")
      .delete()
      .eq("year", year)
      .eq("month", month);
    if (error) console.error("[ledger] delete:", error);
  },
};
