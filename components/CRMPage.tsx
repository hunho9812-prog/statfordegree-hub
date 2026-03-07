"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useWorkspaceStore } from "@/lib/store";
import type { Customer, CustomerRoute, CustomerStatus } from "@/lib/types";
import { Plus, Trash2, ChevronDown, X } from "lucide-react";

/* ─── Constants ────────────────────────────────────────────────── */
const ASSIGNEES = ["김은호", "김세윤", "김현호", "오승준"];
const ROUTES: CustomerRoute[] = ["크몽", "메일"];
const STATUSES: CustomerStatus[] = ["제출완료", "외주분석중", "프리랜서응대"];

const STATUS_STYLE: Record<CustomerStatus | "", string> = {
  제출완료: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  외주분석중: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  프리랜서응대: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "": "bg-[#f0f0ef] dark:bg-[#3f3f3f] text-[#9b9a97]",
};

const EMPTY: Omit<Customer, "id" | "created_at" | "updated_at"> = {
  name: "",
  assignee: "",
  route: "",
  tags: "",
  alba: "",
  total_amount: null,
  balance: null,
  review_proposed: false,
  balance_received: false,
  kmong_review: false,
  kakao_review: false,
  submit_date: "",
  status: "외주분석중",
  memo: "",
};

/* ─── Cell Primitives ───────────────────────────────────────────── */
function TextCell({
  value,
  onSave,
  placeholder = "",
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (local !== value) onSave(local);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setEditing(false); setLocal(value); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className={`w-full bg-transparent outline-none text-sm border-b border-blue-400 text-[#37352f] dark:text-[#e6e6e4] py-0.5 ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => { setLocal(value); setEditing(true); }}
      className={`min-h-[22px] text-sm cursor-text rounded px-0.5 hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.05)] text-[#37352f] dark:text-[#e6e6e4] ${className}`}
    >
      {value || <span className="text-[#c4c3bf] dark:text-[#4f4f4f]">{placeholder}</span>}
    </div>
  );
}

function NumberCell({
  value,
  onSave,
  placeholder = "",
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value !== null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const parsed = local.trim() === "" ? null : Number(local.replace(/,/g, ""));
    if (parsed !== value) onSave(isNaN(parsed as number) ? null : parsed);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setEditing(false); setLocal(value !== null ? String(value) : ""); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className="w-full bg-transparent outline-none text-sm border-b border-blue-400 text-right text-[#37352f] dark:text-[#e6e6e4] py-0.5"
      />
    );
  }

  return (
    <div
      onClick={() => { setLocal(value !== null ? String(value) : ""); setEditing(true); }}
      className="min-h-[22px] text-sm cursor-text rounded px-0.5 text-right hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.05)] text-[#37352f] dark:text-[#e6e6e4]"
    >
      {value !== null ? value.toLocaleString("ko-KR") : <span className="text-[#c4c3bf] dark:text-[#4f4f4f]">{placeholder}</span>}
    </div>
  );
}

function SelectCell({
  value,
  options,
  onSave,
  renderValue,
  placeholder = "선택",
}: {
  value: string;
  options: string[];
  onSave: (v: string) => void;
  renderValue?: (v: string) => React.ReactNode;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 min-h-[22px] w-full text-left text-sm rounded px-0.5 hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.05)]"
      >
        {value ? (renderValue ? renderValue(value) : <span className="text-[#37352f] dark:text-[#e6e6e4]">{value}</span>) : (
          <span className="text-[#c4c3bf] dark:text-[#4f4f4f]">{placeholder}</span>
        )}
        <ChevronDown size={11} className="ml-auto text-[#9b9a97] flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-0.5 z-30 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg shadow-xl min-w-[120px] py-1 overflow-hidden">
          <button
            onClick={() => { onSave(""); setOpen(false); }}
            className="w-full px-3 py-1.5 text-left text-sm text-[#9b9a97] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.05)]"
          >
            선택 안 함
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSave(opt); setOpen(false); }}
              className="w-full px-3 py-1.5 text-left text-sm text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
            >
              {opt === value && <span className="text-blue-500">✓</span>}
              {opt !== value && <span className="w-4" />}
              {renderValue ? renderValue(opt) : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BoolCell({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors ${
        value
          ? "bg-emerald-500 text-white"
          : "border-2 border-[#d3d2cf] dark:border-[#4f4f4f] text-transparent hover:border-emerald-400"
      }`}
    >
      ✓
    </button>
  );
}

/* ─── New Row Form ──────────────────────────────────────────────── */
function NewRowForm({
  onSave,
  onCancel,
}: {
  onSave: (data: Omit<Customer, "id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<Customer, "id" | "created_at" | "updated_at">>({ ...EMPTY });
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { nameRef.current?.focus(); return; }
    onSave(form);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Escape") onCancel();
  };

  return (
    <tr className="border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-blue-50/40 dark:bg-blue-950/10">
      {/* Name */}
      <td className="px-3 py-2">
        <input
          ref={nameRef}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          onKeyDown={onKey}
          placeholder="고객 이름 *"
          className="w-full bg-transparent outline-none text-sm border-b border-blue-400 text-[#37352f] dark:text-[#e6e6e4] placeholder-[#9b9a97] py-0.5"
        />
      </td>
      {/* 담당자 */}
      <td className="px-3 py-2">
        <select
          value={form.assignee}
          onChange={(e) => set("assignee", e.target.value)}
          onKeyDown={onKey}
          className="w-full bg-transparent text-sm outline-none text-[#37352f] dark:text-[#e6e6e4] dark:bg-transparent"
        >
          <option value="">선택</option>
          {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </td>
      {/* 경로 */}
      <td className="px-3 py-2">
        <select
          value={form.route}
          onChange={(e) => set("route", e.target.value as CustomerRoute)}
          onKeyDown={onKey}
          className="w-full bg-transparent text-sm outline-none text-[#37352f] dark:text-[#e6e6e4] dark:bg-transparent"
        >
          <option value="">선택</option>
          {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      {/* Tags */}
      <td className="px-3 py-2">
        <input
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
          onKeyDown={onKey}
          placeholder="태그"
          className="w-full bg-transparent outline-none text-sm border-b border-blue-400 text-[#37352f] dark:text-[#e6e6e4] placeholder-[#9b9a97] py-0.5"
        />
      </td>
      {/* 알바 */}
      <td className="px-3 py-2">
        <input
          value={form.alba}
          onChange={(e) => set("alba", e.target.value)}
          onKeyDown={onKey}
          placeholder="알바"
          className="w-full bg-transparent outline-none text-sm border-b border-blue-400 text-[#37352f] dark:text-[#e6e6e4] placeholder-[#9b9a97] py-0.5"
        />
      </td>
      {/* 전체금액 */}
      <td className="px-3 py-2">
        <input
          type="number"
          value={form.total_amount ?? ""}
          onChange={(e) => set("total_amount", e.target.value === "" ? null : Number(e.target.value))}
          onKeyDown={onKey}
          placeholder="0"
          className="w-full bg-transparent outline-none text-sm border-b border-blue-400 text-right text-[#37352f] dark:text-[#e6e6e4] placeholder-[#9b9a97] py-0.5"
        />
      </td>
      {/* 잔금 */}
      <td className="px-3 py-2">
        <input
          type="number"
          value={form.balance ?? ""}
          onChange={(e) => set("balance", e.target.value === "" ? null : Number(e.target.value))}
          onKeyDown={onKey}
          placeholder="0"
          className="w-full bg-transparent outline-none text-sm border-b border-blue-400 text-right text-[#37352f] dark:text-[#e6e6e4] placeholder-[#9b9a97] py-0.5"
        />
      </td>
      {/* 체크박스 4개 */}
      {(["review_proposed", "balance_received", "kmong_review", "kakao_review"] as const).map((k) => (
        <td key={k} className="px-3 py-2 text-center">
          <input
            type="checkbox"
            checked={form[k]}
            onChange={(e) => set(k, e.target.checked)}
            className="w-4 h-4 accent-emerald-500 cursor-pointer"
          />
        </td>
      ))}
      {/* 제출날짜 */}
      <td className="px-3 py-2">
        <input
          type="date"
          value={form.submit_date}
          onChange={(e) => set("submit_date", e.target.value)}
          className="bg-transparent text-sm outline-none text-[#37352f] dark:text-[#e6e6e4]"
        />
      </td>
      {/* Status */}
      <td className="px-3 py-2">
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value as CustomerStatus)}
          onKeyDown={onKey}
          className="w-full bg-transparent text-sm outline-none text-[#37352f] dark:text-[#e6e6e4] dark:bg-transparent"
        >
          <option value="">선택</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      {/* 메모 */}
      <td className="px-3 py-2">
        <input
          value={form.memo}
          onChange={(e) => set("memo", e.target.value)}
          onKeyDown={onKey}
          placeholder="메모"
          className="w-full bg-transparent outline-none text-sm border-b border-blue-400 text-[#37352f] dark:text-[#e6e6e4] placeholder-[#9b9a97] py-0.5"
        />
      </td>
      {/* 저장/취소 */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            저장
          </button>
          <button
            onClick={onCancel}
            className="p-1 text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"
          >
            <X size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─── Data Row ──────────────────────────────────────────────────── */
function DataRow({ customer }: { customer: Customer }) {
  const { updateCustomer, deleteCustomer } = useWorkspaceStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);

  const upd = <K extends keyof Customer>(k: K, v: Customer[K]) =>
    updateCustomer(customer.id, { [k]: v } as Partial<Customer>);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      className="border-b border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#fafafa] dark:hover:bg-[#222] transition-colors group"
    >
      {/* Name */}
      <td className="px-3 py-2 font-medium min-w-[120px]">
        <TextCell
          value={customer.name}
          onSave={(v) => upd("name", v)}
          placeholder="이름"
          className="font-medium"
        />
      </td>
      {/* 담당자 */}
      <td className="px-3 py-2 min-w-[100px]">
        <SelectCell
          value={customer.assignee}
          options={ASSIGNEES}
          onSave={(v) => upd("assignee", v)}
          placeholder="담당자"
        />
      </td>
      {/* 경로 */}
      <td className="px-3 py-2 min-w-[80px]">
        <SelectCell
          value={customer.route ?? ""}
          options={ROUTES}
          onSave={(v) => upd("route", v as CustomerRoute)}
          placeholder="경로"
          renderValue={(v) => (
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${v === "크몽" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"}`}>
              {v}
            </span>
          )}
        />
      </td>
      {/* Tags */}
      <td className="px-3 py-2 min-w-[100px]">
        <TextCell
          value={customer.tags ?? ""}
          onSave={(v) => upd("tags", v)}
          placeholder="태그"
        />
      </td>
      {/* 알바 */}
      <td className="px-3 py-2 min-w-[100px]">
        <TextCell
          value={customer.alba ?? ""}
          onSave={(v) => upd("alba", v)}
          placeholder="알바"
        />
      </td>
      {/* 전체금액 */}
      <td className="px-3 py-2 min-w-[90px]">
        <NumberCell
          value={customer.total_amount}
          onSave={(v) => upd("total_amount", v)}
          placeholder="0"
        />
      </td>
      {/* 잔금 */}
      <td className="px-3 py-2 min-w-[90px]">
        <NumberCell
          value={customer.balance}
          onSave={(v) => upd("balance", v)}
          placeholder="0"
        />
      </td>
      {/* 후기제안 */}
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.review_proposed} onToggle={() => upd("review_proposed", !customer.review_proposed)} />
      </td>
      {/* 잔금받음 */}
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.balance_received} onToggle={() => upd("balance_received", !customer.balance_received)} />
      </td>
      {/* 크몽후기 */}
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.kmong_review} onToggle={() => upd("kmong_review", !customer.kmong_review)} />
      </td>
      {/* 카톡후기 */}
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.kakao_review} onToggle={() => upd("kakao_review", !customer.kakao_review)} />
      </td>
      {/* 제출날짜 */}
      <td className="px-3 py-2 min-w-[110px]">
        <TextCell
          value={customer.submit_date}
          onSave={(v) => upd("submit_date", v)}
          placeholder="날짜"
        />
      </td>
      {/* Status */}
      <td className="px-3 py-2 min-w-[110px]">
        <SelectCell
          value={customer.status}
          options={STATUSES}
          onSave={(v) => upd("status", v as CustomerStatus)}
          placeholder="상태"
          renderValue={(v) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[v as CustomerStatus]}`}>
              {v}
            </span>
          )}
        />
      </td>
      {/* 메모 */}
      <td className="px-3 py-2 min-w-[150px]">
        <TextCell
          value={customer.memo}
          onSave={(v) => upd("memo", v)}
          placeholder="메모"
        />
      </td>
      {/* 삭제 */}
      <td className="px-2 py-2 w-10">
        {hovered && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => deleteCustomer(customer.id)}
                className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded"
              >
                삭제
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[#9b9a97]">
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded text-[#9b9a97] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )
        )}
      </td>
    </tr>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function CRMPage() {
  const { customers, createCustomer } = useWorkspaceStore();
  const [addingRow, setAddingRow] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | "">("");

  const assignees = Array.from(new Set(customers.map((c) => c.assignee).filter(Boolean)));

  const filtered = customers.filter((c) => {
    if (filterAssignee && c.assignee !== filterAssignee) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const handleSaveNew = (data: Omit<Customer, "id" | "created_at" | "updated_at">) => {
    createCustomer(data);
    setAddingRow(false);
  };

  const COLS = [
    { label: "Aa  Name", icon: null },
    { label: "담당자" },
    { label: "경로" },
    { label: "Tags" },
    { label: "알바" },
    { label: "#  전체금액" },
    { label: "잔금" },
    { label: "☑  후기제안" },
    { label: "☑  잔금받음?" },
    { label: "☑  크몽후기" },
    { label: "☑  카톡후기" },
    { label: "📅  제출날짜" },
    { label: "⚡  Status" },
    { label: "≡  메모" },
    { label: "" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#191919] overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-10 pb-5 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">👤</span>
              <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">고객관리양식</h1>
            </div>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-1 ml-[52px]">
              총 {customers.length}명 · 표시 {filtered.length}명
            </p>
          </div>
          <button
            onClick={() => setAddingRow(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] text-sm font-medium hover:bg-[#1f1f1f] dark:hover:bg-white transition-colors"
          >
            <Plus size={14} />
            고객 추가
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4 ml-[52px] flex-wrap">
          <div className="relative inline-flex items-center">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="appearance-none text-xs pl-2 pr-6 py-1 rounded-md border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] cursor-pointer"
            >
              <option value="">담당자 전체</option>
              {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#9b9a97] pointer-events-none" />
          </div>
          <div className="relative inline-flex items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CustomerStatus | "")}
              className="appearance-none text-xs pl-2 pr-6 py-1 rounded-md border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] cursor-pointer"
            >
              <option value="">상태 전체</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#9b9a97] pointer-events-none" />
          </div>
          {(filterAssignee || filterStatus) && (
            <button
              onClick={() => { setFilterAssignee(""); setFilterStatus(""); }}
              className="text-xs text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] flex items-center gap-0.5"
            >
              <X size={11} /> 초기화
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 1400 }}>
          <thead className="sticky top-0 z-10 bg-[#f7f6f3] dark:bg-[#252525]">
            <tr>
              {COLS.map((col, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left text-xs font-medium text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap tracking-wide"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <DataRow key={c.id} customer={c} />
            ))}

            {/* New row form */}
            {addingRow && (
              <NewRowForm
                onSave={handleSaveNew}
                onCancel={() => setAddingRow(false)}
              />
            )}

            {/* Empty state or add row button */}
            {filtered.length === 0 && !addingRow ? (
              <tr>
                <td colSpan={COLS.length} className="text-center py-20 text-[#9b9a97] dark:text-[#6b6b6b]">
                  <div className="text-4xl mb-3">👤</div>
                  <div className="text-sm mb-4">고객 데이터가 없습니다.</div>
                  <button
                    onClick={() => setAddingRow(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[#d3d2cf] dark:border-[#4f4f4f] text-sm text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] hover:border-[#9b9a97] transition-colors"
                  >
                    <Plus size={14} /> 첫 고객 추가하기
                  </button>
                </td>
              </tr>
            ) : (
              !addingRow && (
                <tr>
                  <td colSpan={COLS.length} className="px-3 py-1">
                    <button
                      onClick={() => setAddingRow(true)}
                      className="flex items-center gap-1.5 text-xs text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] py-1.5 transition-colors"
                    >
                      <Plus size={13} />
                      새 고객
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
