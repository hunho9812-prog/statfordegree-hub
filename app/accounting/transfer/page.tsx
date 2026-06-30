"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface DebitItem {
  id: string;
  vendor: string;
  day: number;
  amount: number;
  currency: "KRW" | "USD";
}

function fmtKRW(v: number) { return "₩" + Math.round(v).toLocaleString("ko-KR"); }
function fmtUSD(v: number) { return "$" + v.toFixed(2); }

export default function TransferPage() {
  const router = useRouter();
  const [items, setItems] = useState<DebitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState("");
  const [day, setDay] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"KRW" | "USD">("KRW");
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("debit_items")
      .select("*")
      .order("day", { ascending: true });
    if (data) setItems(data as DebitItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Realtime 구독
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const ch = supabase!
      .channel("debit_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "debit_items" }, loadItems)
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [loadItems]);

  useEffect(() => {
    setRateLoading(true);
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.json())
      .then(d => { if (d?.rates?.KRW) setUsdRate(d.rates.KRW); })
      .catch(() => {})
      .finally(() => setRateLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseInt(day);
    const a = parseFloat(amount);
    if (!vendor.trim() || !d || d < 1 || d > 31 || !a || a <= 0) return;
    if (!isSupabaseConfigured || !supabase) return;

    const item: DebitItem = { id: uuidv4(), vendor: vendor.trim(), day: d, amount: a, currency };
    setSaving(true);
    const { error } = await supabase.from("debit_items").insert(item);
    setSaving(false);
    if (error) { alert("추가 실패: " + error.message); return; }
    setVendor(""); setDay(""); setAmount(""); setCurrency("KRW");
    loadItems();
  };

  const handleDelete = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from("debit_items").delete().eq("id", id);
    setConfirmId(null);
    loadItems();
  };

  const krwItems = items.filter(i => i.currency === "KRW");
  const usdItems = items.filter(i => i.currency === "USD");
  const totalKRW = krwItems.reduce((s, i) => s + i.amount, 0);
  const totalUSD = usdItems.reduce((s, i) => s + i.amount, 0);
  const totalUSDinKRW = usdRate ? totalUSD * usdRate : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="px-6 py-6">

        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/accounting")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
            <ArrowLeft size={14} /> 회계
          </button>
          <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">자동이체</h1>
        </div>

        {/* Add form */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">자동이체 추가</h2>
          </div>
          <form onSubmit={handleAdd} className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wide">매입처</label>
                <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="예: Notion, ChatGPT" required
                  className="px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors" />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wide">결제일</label>
                <input type="number" value={day} onChange={e => setDay(e.target.value)} placeholder="1~31" min="1" max="31" required
                  className="px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wide">금액</label>
                <div className="flex gap-2">
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="금액" min="0" step="any" required
                    className="flex-1 px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors" />
                  <select value={currency} onChange={e => setCurrency(e.target.value as "KRW" | "USD")}
                    className="px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors">
                    <option value="KRW">₩ 원화</option>
                    <option value="USD">$ 달러</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-60 transition-colors whitespace-nowrap">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} 추가
              </button>
            </div>
          </form>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "총 항목", value: `${items.length}건`, color: "border-l-indigo-500", textColor: "text-indigo-600 dark:text-indigo-400" },
            { label: "월 KRW 합계", value: fmtKRW(totalKRW), color: "border-l-violet-500", textColor: "text-violet-600 dark:text-violet-400" },
            { label: "월 USD 합계", value: fmtUSD(totalUSD), color: "border-l-amber-500", textColor: "text-amber-600 dark:text-amber-400", sub: totalUSDinKRW ? `≈ ${fmtKRW(totalUSDinKRW)} (₩${Math.round(usdRate || 0).toLocaleString()}/달러)` : rateLoading ? "환율 로딩 중…" : "환율 정보 없음" },
          ].map(c => (
            <div key={c.label} className={`bg-white dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-5 border-l-4 ${c.color} flex flex-col gap-1.5`}>
              <span className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide">{c.label}</span>
              <span className={`text-2xl font-extrabold ${c.textColor}`}>{c.value}</span>
              {c.sub && <span className="text-xs text-[#9b9a97]">{c.sub}</span>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">자동이체 내역 <span className="text-xs font-normal text-[#9b9a97] ml-1">결제일 순</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f7f6f3] dark:bg-[#2f2f2f]">
                  {["매입처", "결제일", "금액", "통화", "삭제"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-[#9b9a97] uppercase tracking-wide border-b border-[#e9e9e7] dark:border-[#2f2f2f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#9b9a97]"><Loader2 size={18} className="animate-spin inline-block mr-2" />불러오는 중...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#9b9a97]">등록된 자동이체가 없습니다.</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-t border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#f7f6f3] dark:hover:bg-[#1f1f1f]">
                    <td className="px-4 py-3 font-semibold text-[#37352f] dark:text-[#e6e6e4]">{item.vendor}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#f7f6f3] dark:bg-[#2f2f2f] text-sm font-bold text-[#37352f] dark:text-[#e6e6e4]">{item.day}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                      {item.currency === "KRW" ? fmtKRW(item.amount) : fmtUSD(item.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.currency === "KRW" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                        {item.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(item.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                          confirmId === item.id ? "bg-red-500 text-white animate-pulse" : "text-[#c4c3bf] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        }`}>
                        <Trash2 size={13} />
                        {confirmId === item.id && "삭제?"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
