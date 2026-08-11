import { supabase } from "./supabase";

export interface KeywordEntry {
  id: string;
  keyword: string;
  is_exposed: boolean;
  link: string;
  check_date: string;  // "YYYY-MM-DD" or ""
  sort_order: number;
}

export const dbKeywords = {
  async fetchAll(): Promise<KeywordEntry[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("keywords")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) { console.error("[keywords] fetchAll:", error); return []; }
    return (data ?? []) as KeywordEntry[];
  },

  async upsert(entry: KeywordEntry): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase.from("keywords").upsert(
      { ...entry, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (error) { console.error("[keywords] upsert:", error); return { success: false, error: error.message }; }
    return { success: true };
  },

  async updateOrder(ids: string[]): Promise<void> {
    if (!supabase) return;
    const updates = ids.map((id, i) => ({ id, sort_order: i }));
    const { error } = await supabase.from("keywords").upsert(updates, { onConflict: "id" });
    if (error) console.error("[keywords] updateOrder:", error);
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase가 설정되지 않았습니다." };
    const { error } = await supabase.from("keywords").delete().eq("id", id);
    if (error) { console.error("[keywords] delete:", error); return { success: false, error: error.message }; }
    return { success: true };
  },
};
