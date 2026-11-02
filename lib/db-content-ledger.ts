import { supabase } from "./supabase";

export interface ContentLedgerRow {
  id: string;
  year: number;
  month: number;
  sales: number;
  labor_cost: number;
  business_cost: number;
  non_operating_income: number;
  profit: number;
  created_at: string;
  updated_at: string;
}

export interface ContentLedgerEntry {
  year: number;
  month: number;
  sales: number;
  laborCost: number;
  businessCost: number;
  nonOperatingIncome: number;
  profit: number;
}

function rowToEntry(r: ContentLedgerRow): ContentLedgerEntry {
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

export const dbContentLedger = {
  async fetchAll(): Promise<ContentLedgerEntry[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("content_ledger")
      .select("*")
      .order("year", { ascending: true })
      .order("month", { ascending: true });
    if (error) { console.error("[content_ledger] fetchAll:", error); return []; }
    return (data as ContentLedgerRow[]).map(rowToEntry);
  },

  async upsert(entry: ContentLedgerEntry): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase.from("content_ledger").upsert(
      {
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
    if (error) {
      console.error("[content_ledger] upsert:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async delete(year: number, month: number): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from("content_ledger")
      .delete()
      .eq("year", year)
      .eq("month", month);
    if (error) console.error("[content_ledger] delete:", error);
  },
};
