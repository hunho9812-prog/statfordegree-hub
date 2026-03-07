"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "@/lib/store";
import type { Customer, CustomerRoute, StatusOption, StatusCategory } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { Plus, Trash2, Settings, X, Check, GripVertical } from "lucide-react";

const ASSIGNEES = ["김은호", "김세윤", "김현호", "오승준"];
const ROUTES: CustomerRoute[] = ["크몽", "메일", ""];

// ─── Preset color palette for status options ─────────────────────────────────
const COLOR_PRESETS = [
  { color: "#f3f0ff", textColor: "#7c3aed", label: "보라" },
  { color: "#fef9c3", textColor: "#854d0e", label: "노랑" },
  { color: "#fff7ed", textColor: "#9a3412", label: "주황" },
  { color: "#eff6ff", textColor: "#1d4ed8", label: "파랑" },
  { color: "#f0fdf4", textColor: "#166534", label: "초록" },
  { color: "#fdf2f8", textColor: "#9d174d", label: "분홍" },
  { color: "#f9fafb", textColor: "#374151", label: "회색" },
  { color: "#fef2f2", textColor: "#991b1b", label: "빨강" },
];

const CATEGORIES: StatusCategory[] = ["할 일", "진행 중", "완료"];

// ─── Inline cell components ──────────────────────────────────────────────────

function TextCell({
  value,
  onChange,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="w-full bg-transparent outline-none border-b border-blue-400 text-sm"
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`block w-full cursor-text text-sm min-h-[20px] ${!value ? "text-gray-300 dark:text-gray-600" : ""}`}
    >
      {value || placeholder}
    </span>
  );
}

function NumberCell({
  value,
  onChange,
  placeholder = "",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value !== null ? String(value) : "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    const n = draft.trim() === "" ? null : Number(draft.replace(/,/g, ""));
    onChange(isNaN(n as number) ? null : n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value !== null ? String(value) : ""); setEditing(false); }
        }}
        className="w-full bg-transparent outline-none border-b border-blue-400 text-sm text-right"
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value !== null ? String(value) : ""); setEditing(true); }}
      className={`block w-full text-right cursor-text text-sm min-h-[20px] ${value === null ? "text-gray-300 dark:text-gray-600" : ""}`}
    >
      {value !== null ? value.toLocaleString() : placeholder}
    </span>
  );
}

function SelectCell({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-sm outline-none cursor-pointer dark:text-[#e6e6e4]"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "—"}
        </option>
      ))}
    </select>
  );
}

function BoolCell({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-center">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-500 cursor-pointer"
      />
    </div>
  );
}

// ─── Status cell with Notion-style grouped dropdown ──────────────────────────

function StatusCell({
  value,
  statuses,
  onChange,
}: {
  value: string;
  statuses: StatusOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const current = statuses.find((s) => s.label === value);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        {current ? (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: current.color, color: current.textColor }}
          >
            {current.label}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg shadow-lg w-44 py-1">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
          >
            —
          </button>
          {CATEGORIES.map((cat) => {
            const items = statuses.filter((s) => s.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  {cat}
                </p>
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onChange(s.label); setOpen(false); }}
                    className="w-full text-left px-3 py-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
                  >
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: s.color, color: s.textColor }}
                    >
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Single status option row (in editor) ────────────────────────────────────

function StatusOptionRow({
  status,
  onSave,
  onDelete,
}: {
  status: StatusOption;
  onSave: (s: StatusOption) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(status.label);
  const [color, setColor] = useState(
    COLOR_PRESETS.find((p) => p.color === status.color) || COLOR_PRESETS[0]
  );
  const [category, setCategory] = useState<StatusCategory>(status.category);

  const save = () => {
    onSave({ ...status, label, color: color.color, textColor: color.textColor, category });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-50 dark:bg-[#2a2a2a] mb-1">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="input-style flex-1 py-0.5 text-xs"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as StatusCategory)}
          className="input-style w-24 py-0.5 text-xs"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setColor(p)}
              title={p.label}
              className={`w-4 h-4 rounded border ${color.color === p.color ? "border-blue-500" : "border-transparent"}`}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
        <button onClick={save} className="text-green-500 hover:text-green-700"><Check size={14} /></button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-[#2a2a2a] group mb-1">
      <GripVertical size={12} className="text-gray-300 cursor-grab flex-shrink-0" />
      <span
        className="inline-block px-2 py-0.5 rounded text-xs font-medium flex-1"
        style={{ backgroundColor: status.color, color: status.textColor }}
      >
        {status.label}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        편집
      </button>
      <button
        onClick={() => onDelete(status.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Status editor modal ──────────────────────────────────────────────────────

function StatusEditor({ onClose }: { onClose: () => void }) {
  const { customerStatuses, upsertCustomerStatus, deleteCustomerStatus } = useWorkspaceStore();
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<StatusCategory>("할 일");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);

  const addStatus = () => {
    if (!newLabel.trim()) return;
    upsertCustomerStatus({
      id: uuidv4(),
      label: newLabel.trim(),
      color: newColor.color,
      textColor: newColor.textColor,
      category: newCategory,
    });
    setNewLabel("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
          <h3 className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">Status 옵션 편집</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Existing statuses */}
        <div className="flex-1 overflow-y-auto p-4">
          {CATEGORIES.map((cat) => {
            const items = customerStatuses.filter((s) => s.category === cat);
            return (
              <div key={cat} className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
                {items.length === 0 && (
                  <p className="text-xs text-gray-300 dark:text-gray-600 px-2">옵션 없음</p>
                )}
                {items.map((s) => (
                  <StatusOptionRow
                    key={s.id}
                    status={s}
                    onSave={upsertCustomerStatus}
                    onDelete={deleteCustomerStatus}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Add new */}
        <div className="border-t border-[#e9e9e7] dark:border-[#3f3f3f] p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">새 옵션 추가</p>
          <div className="flex gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStatus()}
              placeholder="옵션 이름"
              className="input-style flex-1"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as StatusCategory)}
              className="input-style w-28"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setNewColor(p)}
                title={p.label}
                className={`w-6 h-6 rounded border-2 ${newColor.color === p.color ? "border-blue-500" : "border-transparent"}`}
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>
          {newLabel.trim() && (
            <div className="flex items-center gap-2">
              <span
                className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: newColor.color, color: newColor.textColor }}
              >
                {newLabel}
              </span>
              <span className="text-xs text-gray-400">미리보기</span>
            </div>
          )}
          <button
            onClick={addStatus}
            disabled={!newLabel.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            <Plus size={14} /> 추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add customer inline form (full row) ─────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  assignee: ASSIGNEES[0],
  route: "" as CustomerRoute,
  settlement_amount: null as number | null,
  alba: "",
  total_amount: null as number | null,
  balance: null as number | null,
  review_proposed: false,
  balance_received: false,
  kmong_review: false,
  kakao_review: false,
  submit_date: "",
  status: "",
  memo: "",
  monthPageId: null as string | null,
};

function AddCustomerRow({
  statuses,
  onSave,
  onCancel,
}: {
  statuses: StatusOption[];
  onSave: (c: Omit<Customer, "id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim() });
  };

  const numInput = (key: "settlement_amount" | "total_amount" | "balance") => (
    <input
      type="number"
      value={form[key] ?? ""}
      onChange={(e) =>
        set(key, e.target.value === "" ? null : Number(e.target.value))
      }
      className="w-full bg-transparent outline-none text-sm text-right"
      placeholder="0"
    />
  );

  return (
    <tr className="border-t-2 border-blue-400 bg-blue-50/50 dark:bg-blue-950/10">
      {/* 이름 */}
      <td className="px-3 py-2 min-w-[120px]">
        <input
          ref={nameRef}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="이름 입력"
          className="w-full bg-transparent outline-none text-sm text-[#37352f] dark:text-[#e6e6e4] placeholder-blue-300"
        />
      </td>
      {/* 담당자 */}
      <td className="px-3 py-2">
        <select
          value={form.assignee}
          onChange={(e) => set("assignee", e.target.value)}
          className="bg-transparent text-sm outline-none dark:text-[#e6e6e4]"
        >
          {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </td>
      {/* Tags */}
      <td className="px-3 py-2">
        <select
          value={form.route}
          onChange={(e) => set("route", e.target.value as CustomerRoute)}
          className="bg-transparent text-sm outline-none dark:text-[#e6e6e4]"
        >
          {ROUTES.map((r) => <option key={r} value={r}>{r || "—"}</option>)}
        </select>
      </td>
      {/* 알바 */}
      <td className="px-3 py-2">
        <input
          value={form.alba}
          onChange={(e) => set("alba", e.target.value)}
          placeholder="알바"
          className="w-full bg-transparent outline-none text-sm"
        />
      </td>
      {/* 정산금액 */}
      <td className="px-3 py-2">{numInput("settlement_amount")}</td>
      {/* 전체금액 */}
      <td className="px-3 py-2">{numInput("total_amount")}</td>
      {/* 잔금 */}
      <td className="px-3 py-2">{numInput("balance")}</td>
      {/* 후기제안 */}
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={form.review_proposed}
          onChange={(e) => set("review_proposed", e.target.checked)}
          className="w-4 h-4 accent-blue-500 cursor-pointer" />
      </td>
      {/* 잔금받음? */}
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={form.balance_received}
          onChange={(e) => set("balance_received", e.target.checked)}
          className="w-4 h-4 accent-blue-500 cursor-pointer" />
      </td>
      {/* 크몽후기 */}
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={form.kmong_review}
          onChange={(e) => set("kmong_review", e.target.checked)}
          className="w-4 h-4 accent-blue-500 cursor-pointer" />
      </td>
      {/* 카톡후기 */}
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={form.kakao_review}
          onChange={(e) => set("kakao_review", e.target.checked)}
          className="w-4 h-4 accent-blue-500 cursor-pointer" />
      </td>
      {/* 제출날짜 */}
      <td className="px-3 py-2">
        <input
          value={form.submit_date}
          onChange={(e) => set("submit_date", e.target.value)}
          placeholder="날짜"
          className="w-full bg-transparent outline-none text-sm"
        />
      </td>
      {/* Status */}
      <td className="px-3 py-2 min-w-[120px]">
        <StatusCell value={form.status} statuses={statuses} onChange={(v) => set("status", v)} />
      </td>
      {/* 메모 */}
      <td className="px-3 py-2">
        <input
          value={form.memo}
          onChange={(e) => set("memo", e.target.value)}
          placeholder="메모"
          className="w-full bg-transparent outline-none text-sm"
        />
      </td>
      {/* Save/Cancel */}
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={!form.name.trim()}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40"
          >
            저장
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            취소
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add trigger row ──────────────────────────────────────────────────────────

function AddTriggerRow({ onAdd }: { onAdd: () => void }) {
  return (
    <tr className="border-t border-[#e9e9e7] dark:border-[#2f2f2f]">
      <td colSpan={15} className="px-3 py-2">
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors"
        >
          <Plus size={14} /> 새 고객 추가
        </button>
      </td>
    </tr>
  );
}

// ─── Data row ─────────────────────────────────────────────────────────────────

function DataRow({
  customer,
  statuses,
  onUpdate,
  onDelete,
}: {
  customer: Customer;
  statuses: StatusOption[];
  onUpdate: (updates: Partial<Omit<Customer, "id" | "created_at">>) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-t border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] group">
      <td className="px-3 py-2 min-w-[120px]">
        <TextCell value={customer.name} onChange={(v) => onUpdate({ name: v })} placeholder="이름" />
      </td>
      <td className="px-3 py-2 min-w-[90px]">
        <SelectCell value={customer.assignee} options={ASSIGNEES} onChange={(v) => onUpdate({ assignee: v })} />
      </td>
      <td className="px-3 py-2 min-w-[80px]">
        <SelectCell value={customer.route} options={ROUTES} onChange={(v) => onUpdate({ route: v as CustomerRoute })} />
      </td>
      <td className="px-3 py-2 min-w-[80px]">
        <TextCell value={customer.alba} onChange={(v) => onUpdate({ alba: v })} placeholder="알바" />
      </td>
      <td className="px-3 py-2 min-w-[90px]">
        <NumberCell
          value={customer.settlement_amount ?? null}
          onChange={(v) => onUpdate({ settlement_amount: v })}
          placeholder="0"
        />
      </td>
      <td className="px-3 py-2 min-w-[90px]">
        <NumberCell value={customer.total_amount} onChange={(v) => onUpdate({ total_amount: v })} placeholder="0" />
      </td>
      <td className="px-3 py-2 min-w-[90px]">
        <NumberCell value={customer.balance} onChange={(v) => onUpdate({ balance: v })} placeholder="0" />
      </td>
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.review_proposed} onChange={(v) => onUpdate({ review_proposed: v })} />
      </td>
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.balance_received} onChange={(v) => onUpdate({ balance_received: v })} />
      </td>
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.kmong_review} onChange={(v) => onUpdate({ kmong_review: v })} />
      </td>
      <td className="px-3 py-2 text-center">
        <BoolCell value={customer.kakao_review} onChange={(v) => onUpdate({ kakao_review: v })} />
      </td>
      <td className="px-3 py-2 min-w-[110px]">
        <TextCell value={customer.submit_date} onChange={(v) => onUpdate({ submit_date: v })} placeholder="날짜" />
      </td>
      <td className="px-3 py-2 min-w-[130px]">
        <StatusCell value={customer.status} statuses={statuses} onChange={(v) => onUpdate({ status: v })} />
      </td>
      <td className="px-3 py-2 min-w-[140px]">
        <TextCell value={customer.memo} onChange={(v) => onUpdate({ memo: v })} placeholder="메모" />
      </td>
      <td className="px-3 py-2">
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

// ─── Main CRMPage ─────────────────────────────────────────────────────────────

/**
 * monthPageId — when provided, shows only customers belonging to that month page.
 * embedded    — when true, renders without the full-page flex wrapper (for use
 *               inside PageEditor's scroll area).
 */
export default function CRMPage({
  monthPageId = null,
  embedded = false,
}: {
  monthPageId?: string | null;
  embedded?: boolean;
}) {
  const { customers, customerStatuses, createCustomer, updateCustomer, deleteCustomer } =
    useWorkspaceStore();
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter customers by month page when monthPageId is provided
  const visibleCustomers = monthPageId
    ? customers.filter((c) => c.monthPageId === monthPageId)
    : customers;

  // Monthly / total revenue (전체금액 기준)
  const totalRevenue = visibleCustomers.reduce((sum, c) => sum + (c.total_amount ?? 0), 0);

  const HEADERS = [
    "이름", "담당자", "Tags", "알바", "정산금액",
    "전체금액", "잔금", "후기제안", "잔금받음?", "크몽후기", "카톡후기",
    "제출날짜", "Status", "메모", "",
  ];

  const handleSave = (data: Omit<Customer, "id" | "created_at" | "updated_at">) => {
    createCustomer({ ...data, monthPageId: monthPageId ?? null });
    setShowAddForm(false);
  };

  const header = (
    <div className={`flex items-center justify-between border-b border-[#e9e9e7] dark:border-[#2f2f2f] ${embedded ? "px-4 py-3" : "px-6 py-4"}`}>
      <div>
        {!embedded && (
          <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">고객 관리</h1>
        )}
        <div className="flex items-center gap-3 text-sm text-[#9b9a97] dark:text-[#6b6b6b]">
          <span>총 {visibleCustomers.length}명</span>
          {totalRevenue > 0 && (
            <>
              <span>·</span>
              <span className="font-semibold text-blue-500">
                매출 ₩{totalRevenue.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={15} /> 고객 추가
        </button>
        <button
          onClick={() => setShowStatusEditor(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] rounded-lg transition-colors"
        >
          <Settings size={15} /> Status 편집
        </button>
      </div>
    </div>
  );

  const table = (
    <div className={embedded ? "overflow-x-auto" : "flex-1 overflow-auto"}>
      <table className="w-full border-collapse text-[#37352f] dark:text-[#e6e6e4] text-sm">
        <thead className="sticky top-0 bg-[#f7f6f3] dark:bg-[#252525] z-10">
          <tr>
            {HEADERS.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleCustomers.map((c) => (
            <DataRow
              key={c.id}
              customer={c}
              statuses={customerStatuses}
              onUpdate={(updates) => updateCustomer(c.id, updates)}
              onDelete={() => deleteCustomer(c.id)}
            />
          ))}
          {showAddForm ? (
            <AddCustomerRow
              statuses={customerStatuses}
              onSave={handleSave}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <AddTriggerRow onAdd={() => setShowAddForm(true)} />
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {embedded ? (
        <div className="bg-white dark:bg-[#191919]">
          {header}
          {table}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#191919]">
          {header}
          {table}
        </div>
      )}
      {showStatusEditor && <StatusEditor onClose={() => setShowStatusEditor(false)} />}
    </>
  );
}
