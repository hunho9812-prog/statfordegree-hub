"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, RotateCcw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const LABOR_KEY = "labor_data";

interface LaborItem {
  id: string;
  month: string;
  name: string;
  ssn: string;
  account: string;
  pay: number;
  tax33: number;
  tax3: number;
  local: number;
  net: number;
}

function fmt(v: number) {
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

function getYM(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function calcTax(pay: number) {
  const tax33 = Math.round(pay * 0.033);
  const tax3 = Math.round(pay * 0.03);
  const local = Math.round(pay * 0.003);
  const net = pay - tax33;
  return { tax33, tax3, local, net };
}

export default function PayrollPage() {
  const router = useRouter();
  const [items, setItems] = useState<LaborItem[]>([]);
  const [filterMonth, setFilterMonth] = useState(getYM());

  const [form, setForm] = useState({ month: getYM(), name: "", ssn: "", account: "", pay: "" });
  const [calc, setCalc] = useState({ tax33: 0, tax3: 0, local: 0, net: 0 });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LABOR_KEY) || "[]");
      setItems(stored);
    } catch { /**/ }
  }, []);

  const persist = (list: LaborItem[]) => {
    setItems(list);
    localStorage.setItem(LABOR_KEY, JSON.stringify(list));
  };

  const updatePay = (val: string) => {
    setForm(f => ({ ...f, pay: val }));
    const n = parseFloat(val) || 0;
    setCalc(calcTax(n));
  };

  const handleAdd = () => {
    const pay = parseFloat(form.pay) || 0;
    if (!form.name.trim() || pay <= 0) return;
    const taxes = calcTax(pay);
    const item: LaborItem = { id: uuidv4(), month: form.month, name: form.name.trim(), ssn: form.ssn, account: form.account, pay, ...taxes };
    persist([item, ...items]);
    setForm(f => ({ ...f, name: "", ssn: "", account: "", pay: "" }));
    setCalc({ tax33: 0, tax3: 0, local: 0, net: 0 });
  };

  const handleDelete = (id: string) => persist(items.filter(i => i.id !== id));

  const handleRefill = (item: LaborItem) => {
    setForm({ month: item.month, name: item.name, ssn: item.ssn, account: item.account, pay: String(item.pay) });
    setCalc(calcTax(item.pay));
  };

  const visible = items.filter(i => i.month === filterMonth);
  const totalPay = visible.reduce((s, i) => s + i.pay, 0);
  const totalTax = visible.reduce((s, i) => s + i.tax33, 0);
  const totalNet = visible.reduce((s, i) => s + i.net, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/statfordegree")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
            <ArrowLeft size={14} /> 스탯포디그리
          </button>
          <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">인건비</h1>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">인건비 입력</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {[
                { label: "귀속 연월", el: <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="form-input" /> },
                { label: "이름", el: <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="홍길동" className="form-input" /> },
                { label: "주민번호", el: <input type="text" value={form.ssn} onChange={e => setForm(f => ({ ...f, ssn: e.target.value }))} placeholder="000000-0000000" maxLength={14} className="form-input" /> },
                { label: "계좌번호", el: <input type="text" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} placeholder="은행명 000-000-000000" className="form-input" /> },
                { label: "지급액 (원)", el: (
                  <input type="number" value={form.pay} onChange={e => updatePay(e.target.value)} placeholder="지급액 입력" min="0" className="form-input col-span-full" />
                )},
              ].map(({ label, el }) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wide">{label}</label>
                  {el}
                </div>
              ))}
            </div>

            {/* Calc result */}
            {(parseFloat(form.pay) > 0) && (
              <div className="flex flex-wrap gap-4 px-4 py-3 bg-[#f7f6f3] dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl mb-4">
                {[
                  { label: "세금 (3.3%)", value: calc.tax33 },
                  { label: "ㄴ 소득세 (3%)", value: calc.tax3, sub: true },
                  { label: "ㄴ 지방세 (0.3%)", value: calc.local, sub: true },
                ].map(c => (
                  <div key={c.label} className="flex flex-col gap-0.5 min-w-[110px]">
                    <span className={`text-xs font-semibold ${c.sub ? "text-[#c4c3bf]" : "text-[#9b9a97]"} uppercase tracking-wide`}>{c.label}</span>
                    <span className={`font-bold ${c.sub ? "text-sm text-[#9b9a97]" : "text-base text-[#37352f] dark:text-[#e6e6e4]"}`}>{fmt(c.value)}</span>
                  </div>
                ))}
                <div className="flex flex-col gap-0.5 min-w-[110px] ml-auto items-end">
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">실수령액</span>
                  <span className="text-xl font-extrabold text-emerald-600">{fmt(calc.net)}</span>
                </div>
              </div>
            )}

            <button onClick={handleAdd} disabled={!form.name.trim() || !form.pay}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Plus size={15} /> 추가
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">인건비 내역</h2>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="form-input !w-auto !min-w-0 !flex-none" />
              <span className="text-xs text-[#9b9a97] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-full px-2 py-0.5">{visible.length}건</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f7f6f3] dark:bg-[#2f2f2f]">
                  {["귀속", "이름", "주민번호", "지급액", "세금(3.3%)", "소득세(3%)", "지방세(0.3%)", "실수령액", "계좌번호", "재입력", "삭제"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-[#9b9a97] uppercase tracking-wide whitespace-nowrap border-b border-[#e9e9e7] dark:border-[#2f2f2f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-sm text-[#9b9a97]">해당 월의 인건비 내역이 없습니다.</td></tr>
                ) : (
                  <>
                    {visible.map(item => (
                      <tr key={item.id} className="border-t border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#f7f6f3] dark:hover:bg-[#1f1f1f]">
                        <td className="px-3 py-2.5 whitespace-nowrap">{item.month}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{item.name}</td>
                        <td className="px-3 py-2.5 text-[#9b9a97] whitespace-nowrap font-mono text-xs">{item.ssn}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{fmt(item.pay)}</td>
                        <td className="px-3 py-2.5 text-red-500 whitespace-nowrap">{fmt(item.tax33)}</td>
                        <td className="px-3 py-2.5 text-[#9b9a97] whitespace-nowrap">{fmt(item.tax3)}</td>
                        <td className="px-3 py-2.5 text-[#9b9a97] whitespace-nowrap">{fmt(item.local)}</td>
                        <td className="px-3 py-2.5 text-emerald-600 font-bold whitespace-nowrap">{fmt(item.net)}</td>
                        <td className="px-3 py-2.5 text-xs text-[#9b9a97] whitespace-nowrap">{item.account}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => handleRefill(item)} className="flex items-center gap-1 px-2 py-1 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors whitespace-nowrap">
                            <RotateCcw size={11} /> 재입력
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-[#c4c3bf] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#2f2f2f] font-bold">
                      <td className="px-3 py-2.5 text-xs text-[#9b9a97] uppercase tracking-wide" colSpan={3}>합계</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{fmt(totalPay)}</td>
                      <td className="px-3 py-2.5 text-red-500 whitespace-nowrap">{fmt(totalTax)}</td>
                      <td colSpan={2} />
                      <td className="px-3 py-2.5 text-emerald-600 whitespace-nowrap">{fmt(totalNet)}</td>
                      <td colSpan={3} />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .form-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e9e9e7;
          border-radius: 8px;
          font-size: 0.875rem;
          background: #f7f6f3;
          color: #37352f;
          outline: none;
          transition: border-color .2s;
        }
        .dark .form-input {
          border-color: #3f3f3f;
          background: #2f2f2f;
          color: #e6e6e4;
        }
        .form-input:focus { border-color: #3b82f6; }
      `}</style>
    </div>
  );
}
