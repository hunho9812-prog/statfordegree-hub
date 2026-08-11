"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Pencil, Loader2, X, BookOpen } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useFluentoLedger } from "@/hooks/useFluentoLedger";

interface CostEntry {
  id: string;
  year: number;
  month: number;
  desc_text: string;
  amount: number;
}

function fmt(v: number) {
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

const NOW = new Date();
const YEARS = Array.from({ length: 5 }, (_, i) => NOW.getFullYear() - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function FluentoPage() {
  const router = useRouter();
  const { entries: ledgerEntries } = useFluentoLedger();

  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 입력 폼
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  // 수정 모달
  const [editItem, setEditItem] = useState<CostEntry | null>(null);
  const [editYear, setEditYear] = useState(NOW.getFullYear());
  const [editMonth, setEditMonth] = useState(NOW.getMonth() + 1);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");

  // 삭제 확인
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── 데이터 로드 ────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("fluento_cost_entries")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setEntries(data as CostEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const ch = supabase!
      .channel("fluento_cost_entries")
      .on("postgres_changes", { event: "*", schema: "public", table: "fluento_cost_entries" }, loadEntries)
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [loadEntries]);

  // ── 계산 ──────────────────────────────────────────────────────
  const totalCost = entries.reduce((s, e) => s + e.amount, 0);
  const totalRevenue = ledgerEntries.reduce((s, e) => s + e.sales, 0);
  const bepRemain = Math.max(0, totalCost - totalRevenue);
  const bepPct = totalCost > 0 ? Math.min(100, Math.round((totalRevenue / totalCost) * 100)) : 0;
  const netProfit = totalRevenue - totalCost;

  // ── 추가 ──────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseInt(amount) || 0;
    if (!desc.trim() || a <= 0) return;
    if (!isSupabaseConfigured || !supabase) return;
    const item: CostEntry = { id: uuidv4(), year, month, desc_text: desc.trim(), amount: a };
    setSaving(true);
    const { error } = await supabase.from("fluento_cost_entries").insert(item);
    setSaving(false);
    if (error) { alert("추가 실패: " + error.message); return; }
    setDesc(""); setAmount("");
    loadEntries();
  };

  // ── 삭제 ──────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from("fluento_cost_entries").delete().eq("id", id);
    setDeleteId(null);
    loadEntries();
  };

  // ── 수정 ──────────────────────────────────────────────────────
  const openEdit = (item: CostEntry) => {
    setEditItem(item);
    setEditYear(item.year);
    setEditMonth(item.month);
    setEditDesc(item.desc_text);
    setEditAmount(String(item.amount));
  };

  const handleSaveEdit = async () => {
    if (!editItem || !isSupabaseConfigured || !supabase) return;
    const a = parseInt(editAmount) || 0;
    if (!editDesc.trim() || a <= 0) return;
    await supabase.from("fluento_cost_entries").update({
      year: editYear, month: editMonth, desc_text: editDesc.trim(), amount: a
    }).eq("id", editItem.id);
    setEditItem(null);
    loadEntries();
  };

  // ── 월별 그룹 ─────────────────────────────────────────────────
  const grouped = entries.reduce<Record<string, CostEntry[]>>((acc, e) => {
    const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="px-6 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
            <ArrowLeft size={14} /> 홈
          </button>
          <h1 className="text-xl font-bold flex-1">
            💡 <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">플루엔토</span>
          </h1>
          <button onClick={() => router.push("/fluento/ledger")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 border border-green-200 dark:border-green-800 transition-colors font-medium">
            <BookOpen size={14} /> 장부
          </button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-5 border-l-4 border-l-green-400">
            <p className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide mb-1">총 투자비용</p>
            <p className="text-2xl font-extrabold text-green-500">{fmt(totalCost)}</p>
            <p className="text-xs text-[#9b9a97] mt-1">{entries.length}건</p>
          </div>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-5 border-l-4 border-l-blue-400">
            <p className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide mb-1">누적 수익 (플루엔토 장부)</p>
            <p className="text-2xl font-extrabold text-blue-500">{fmt(totalRevenue)}</p>
            <p className="text-xs text-[#9b9a97] mt-1">{ledgerEntries.length > 0 ? `${ledgerEntries.length}개월 합산` : "장부 데이터 없음"}</p>
          </div>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-5 border-l-4 border-l-emerald-400">
            <p className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide mb-1">손익분기까지</p>
            <p className={`text-2xl font-extrabold ${bepRemain === 0 && totalCost > 0 ? "text-emerald-500" : "text-emerald-500"}`}>
              {bepRemain === 0 && totalCost > 0 ? "달성! 🎉" : fmt(bepRemain)}
            </p>
            <p className={`text-xs mt-1 font-semibold ${netProfit >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {totalCost === 0 ? "비용 내역을 추가하세요" : netProfit >= 0 ? `순이익 ${fmt(netProfit)}` : `${fmt(Math.abs(netProfit))} 미회수`}
            </p>
          </div>
        </div>

        {/* 손익분기 달성률 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4]">손익분기 달성률</span>
            <span className="text-sm font-bold text-emerald-500">{bepPct}%</span>
          </div>
          <div className="h-2.5 bg-[#f1f5f9] dark:bg-[#3f3f3f] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${bepPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#9b9a97] mt-1.5 font-semibold">
            <span>{fmt(totalRevenue)}</span>
            <span>목표: {fmt(totalCost)}</span>
          </div>
          <p className="text-xs text-[#9b9a97] mt-2">투자비용을 모두 회수하면 손익분기점 달성입니다.</p>
        </div>

        {/* 비용 내역 추가 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] border-t-[3px] border-t-green-400 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">💸 비용 내역 추가</h2>
          </div>
          <form onSubmit={handleAdd} className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              {/* 날짜 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide">날짜</label>
                <div className="flex items-center gap-1.5">
                  <select value={year} onChange={e => setYear(Number(e.target.value))}
                    className="px-2 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400">
                    {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <select value={month} onChange={e => setMonth(Number(e.target.value))}
                    className="px-2 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400">
                    {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                </div>
              </div>
              {/* 내역 */}
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide">내역</label>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="예) 서버 호스팅, 광고비, 개발 도구…" required
                  className="px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400 transition-colors" />
              </div>
              {/* 금액 */}
              <div className="flex flex-col gap-1 w-36">
                <label className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide">금액 (원)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" required
                  className="px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400 transition-colors" />
              </div>
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-green-950 font-bold rounded-lg text-sm hover:opacity-90 disabled:opacity-60 transition-all whitespace-nowrap">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} + 추가
              </button>
            </div>
          </form>
        </div>

        {/* 비용 목록 */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">📋 비용 목록</h2>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-[#9b9a97]">
              <Loader2 size={18} className="animate-spin inline-block mr-2" />불러오는 중...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#9b9a97]">등록된 비용 내역이 없습니다.</div>
          ) : (
            <div className="divide-y divide-[#e9e9e7] dark:divide-[#2f2f2f]">
              {groupKeys.map(key => {
                const [gy, gm] = key.split("-");
                const groupItems = grouped[key];
                const groupTotal = groupItems.reduce((s, i) => s + i.amount, 0);
                return (
                  <div key={key}>
                    {/* 월 헤더 */}
                    <div className="flex items-center justify-between px-5 py-2.5 bg-green-50 dark:bg-green-950/20 border-b border-green-100 dark:border-green-900/30">
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">{gy}년 {parseInt(gm)}월</span>
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">{fmt(groupTotal)}</span>
                    </div>
                    {/* 항목 */}
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#f7f6f3] dark:bg-[#2a2a2a]">
                          <th className="px-5 py-2 text-left text-xs font-bold text-[#9b9a97] uppercase tracking-wide">날짜</th>
                          <th className="px-5 py-2 text-left text-xs font-bold text-[#9b9a97] uppercase tracking-wide">내역</th>
                          <th className="px-5 py-2 text-left text-xs font-bold text-[#9b9a97] uppercase tracking-wide">금액</th>
                          <th className="px-5 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupItems.map(item => (
                          <tr key={item.id} className="border-t border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#f7f6f3] dark:hover:bg-[#1f1f1f]">
                            <td className="px-5 py-3 text-[#9b9a97] whitespace-nowrap">{item.year}.{String(item.month).padStart(2, "0")}</td>
                            <td className="px-5 py-3 text-[#37352f] dark:text-[#e6e6e4]">{item.desc_text}</td>
                            <td className="px-5 py-3 font-semibold text-[#37352f] dark:text-[#e6e6e4]">{fmt(item.amount)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(item)}
                                  className="p-1.5 text-[#9b9a97] hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-md transition-colors">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => setDeleteId(item.id)}
                                  className="p-1.5 text-[#9b9a97] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 수정 모달 */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditItem(null)}>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] border-t-4 border-t-green-400 shadow-xl p-6 w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">✏️ 비용 내역 수정</h3>
              <button onClick={() => setEditItem(null)} className="p-1 text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide mb-1 block">날짜</label>
                <div className="flex items-center gap-2">
                  <select value={editYear} onChange={e => setEditYear(Number(e.target.value))}
                    className="px-2 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400">
                    {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <select value={editMonth} onChange={e => setEditMonth(Number(e.target.value))}
                    className="px-2 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400">
                    {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide mb-1 block">내역</label>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#9b9a97] uppercase tracking-wide mb-1 block">금액 (원)</label>
                <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="0"
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-green-400 transition-colors" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditItem(null)}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors">
                취소
              </button>
              <button onClick={handleSaveEdit}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-green-400 to-green-600 text-green-950 text-sm font-bold hover:opacity-90 transition-all">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-xl p-6 w-80 mx-4"
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4] mb-2">비용 내역을 삭제할까요?</p>
            <p className="text-xs text-red-400 mb-5">삭제한 내역은 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors">
                취소
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
