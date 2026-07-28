"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/lib/store";
import type { Customer, CustomerRoute, StatusOption, StatusCategory, CustomColumnDef, CustomColumnType, CrmTag } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import {
  Plus, Trash2, Settings, X, Check, GripVertical, ArrowRightLeft,
  Filter, ChevronUp, ChevronDown, Pencil,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// 담당자 아바타 색상 팔레트 (인덱스 순환)
const ASSIGNEE_PALETTE = [
  { bg: "#fde68a", text: "#78350f" },
  { bg: "#ddd6fe", text: "#5b21b6" },
  { bg: "#a7f3d0", text: "#065f46" },
  { bg: "#fecaca", text: "#991b1b" },
  { bg: "#bfdbfe", text: "#1e40af" },
  { bg: "#fcd34d", text: "#92400e" },
  { bg: "#d9f99d", text: "#3f6212" },
  { bg: "#fbcfe8", text: "#9d174d" },
];

function getAssigneeStyle(name: string, assignees: string[]) {
  const idx = assignees.indexOf(name);
  return ASSIGNEE_PALETTE[idx >= 0 ? idx % ASSIGNEE_PALETTE.length : 0];
}

const TAG_COLOR_PRESETS: CrmTag[] = [
  { label: "", bg: "#eef2ff", text: "#4338ca" },
  { label: "", bg: "#eff6ff", text: "#1d4ed8" },
  { label: "", bg: "#f0fdf4", text: "#166534" },
  { label: "", bg: "#fff7ed", text: "#9a3412" },
  { label: "", bg: "#fef9c3", text: "#854d0e" },
  { label: "", bg: "#fdf2f8", text: "#9d174d" },
  { label: "", bg: "#fef2f2", text: "#991b1b" },
  { label: "", bg: "#f9fafb", text: "#374151" },
];

// ─── Custom column type metadata ─────────────────────────────────────────────

const COL_TYPE_OPTIONS: { value: CustomColumnType; label: string; icon: string }[] = [
  { value: "checkbox",  label: "체크박스", icon: "☑" },
  { value: "text",      label: "텍스트",   icon: "T" },
  { value: "number",    label: "숫자",     icon: "#" },
  { value: "date",      label: "날짜",     icon: "📅" },
  { value: "assignee",  label: "담당자",   icon: "👤" },
  { value: "status",    label: "Status",   icon: "●" },
];

// ─── Built-in (fixed) column specs ───────────────────────────────────────────

interface BuiltinColSpec {
  id: string;
  defaultLabel: string;
  field: keyof Customer;
  deletable: boolean;
}

const BUILTIN_COLS: BuiltinColSpec[] = [
  { id: "_name",        defaultLabel: "이름",    field: "name",              deletable: false },
  { id: "_assignee",    defaultLabel: "담당자",   field: "assignee",          deletable: true  },
  { id: "_route",       defaultLabel: "Tags",    field: "route",             deletable: true  },
  { id: "_alba",        defaultLabel: "알바",    field: "alba",              deletable: true  },
  { id: "_settlement",  defaultLabel: "정산금액", field: "settlement_amount", deletable: true  },
  { id: "_total",       defaultLabel: "전체금액", field: "total_amount",      deletable: true  },
  { id: "_balance",     defaultLabel: "잔금",    field: "balance",           deletable: true  },
  { id: "_submit_date", defaultLabel: "제출날짜", field: "submit_date",       deletable: true  },
  { id: "_status",      defaultLabel: "Status",  field: "status",            deletable: true  },
  { id: "_memo",        defaultLabel: "메모",    field: "memo",              deletable: true  },
];

const BUILTIN_BY_ID = Object.fromEntries(BUILTIN_COLS.map((c) => [c.id, c]));

const DEFAULT_COL_ORDER: string[] = [
  "_name", "_assignee", "_route", "_alba", "_settlement", "_total", "_balance",
  // custom cols go here (dynamic)
  "_submit_date", "_status", "_memo",
];

// Unified column descriptor used throughout the component
interface AnyCol {
  id: string;
  label: string;
  kind: "builtin" | "checkbox"; // builtin = fixed field, checkbox = custom
  field?: keyof Customer;        // set for builtin
  colDef?: CustomColumnDef;      // set for checkbox
  deletable: boolean;
  effectiveType: CustomColumnType; // actual rendering type (may be overridden)
}

// default type per builtin column id
const BUILTIN_DEFAULT_TYPE: Record<string, CustomColumnType> = {
  _name: "text",
  _assignee: "assignee",
  _route: "text",
  _alba: "assignee",
  _settlement: "number",
  _total: "number",
  _balance: "number",
  _submit_date: "date",
  _status: "status",
  _memo: "text",
};

// ─── Portal dropdown ──────────────────────────────────────────────────────────

function AnchoredDropdown({
  open,
  anchorRef,
  onClose,
  width = 176,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const desiredMaxH = 320;
    const openUp = spaceBelow < desiredMaxH && spaceAbove > spaceBelow;
    let left = rect.left;
    if (left + width > viewportW - 8) left = Math.max(8, viewportW - width - 8);
    setStyle({
      position: "fixed",
      left,
      width,
      ...(openUp
        ? { bottom: viewportH - rect.top + 4, maxHeight: Math.max(80, spaceAbove - 12) }
        : { top: rect.bottom + 4, maxHeight: Math.max(80, spaceBelow - 12) }),
    });
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) { onClose(); }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className="z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg shadow-lg py-1 overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({ label, values, selectedValues, onChange, onRemove }: {
  label: string;
  values: { key: string; display: React.ReactNode }[];
  selectedValues: Set<string>;
  onChange: (next: Set<string>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const selected = selectedValues.size;
  const total = values.length;
  const allSelected = selected === total;

  return (
    <div className="flex items-center">
      <button ref={btnRef} onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 pl-2 pr-1.5 py-1 text-xs rounded-l border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
        <Filter size={10} />
        <span>{label} 값을 포함하는 데이터</span>
        {!allSelected && <span className="ml-1 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">{selected}</span>}
        <ChevronDown size={10} className="ml-0.5" />
      </button>
      <button onClick={onRemove}
        className="px-1.5 py-1 text-xs rounded-r border border-l-0 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
        <X size={10} />
      </button>
      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={200}>
        <div className="p-2">
          <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
            <button onClick={() => onChange(new Set(values.map((v) => v.key)))} className="text-[10px] text-blue-500 hover:underline">전체 선택</button>
            <button onClick={() => onChange(new Set())} className="text-[10px] text-gray-400 hover:underline">선택 해제</button>
          </div>
          {values.map(({ key, display }) => (
            <label key={key} className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3a3a3a] rounded font-normal">
              <input type="checkbox" checked={selectedValues.has(key)}
                onChange={() => {
                  const next = new Set(selectedValues);
                  if (next.has(key)) next.delete(key); else next.add(key);
                  onChange(next);
                }}
                className="w-3.5 h-3.5 accent-blue-500" />
              {display}
            </label>
          ))}
        </div>
      </AnchoredDropdown>
    </div>
  );
}

// ─── Assignee avatar ──────────────────────────────────────────────────────────

function AssigneeAvatar({ name, size = 18, assignees = [] }: { name: string; size?: number; assignees?: string[] }) {
  const style = getAssigneeStyle(name, assignees);
  return (
    <span
      className="rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
      style={{ width: size, height: size, backgroundColor: style.bg, color: style.text }}
    >
      {name ? name[0] : "?"}
    </span>
  );
}

function AssigneeCell({ value, onChange, assignees }: { value: string; onChange: (v: string) => void; assignees: string[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-left w-full">
        <AssigneeAvatar name={value} assignees={assignees} />
        <span className="text-xs text-[#37352f] dark:text-[#e6e6e4] truncate">{value || "—"}</span>
      </button>
      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={140}>
        {assignees.map((a) => (
          <button key={a} onClick={() => { onChange(a); setOpen(false); }}
            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">
            <AssigneeAvatar name={a} assignees={assignees} />
            <span className="text-[#37352f] dark:text-[#e6e6e4]">{a}</span>
          </button>
        ))}
      </AnchoredDropdown>
    </>
  );
}

function TagsCell({ value, onChange, tags }: { value: CustomerRoute; onChange: (v: CustomerRoute) => void; tags: CrmTag[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tagDef = tags.find((t) => t.label === value);
  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} className="text-left">
        {tagDef ? (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: tagDef.bg, color: tagDef.text }}>{value}</span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </button>
      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={120}>
        <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">—</button>
        {tags.map((t) => (
          <button key={t.label} onClick={() => { onChange(t.label as CustomerRoute); setOpen(false); }} className="w-full text-left px-3 py-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: t.bg, color: t.text }}>{t.label}</span>
          </button>
        ))}
      </AnchoredDropdown>
    </>
  );
}

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

function TextCell({ value, onChange, placeholder = "" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { onChange(draft); setEditing(false); };
  if (editing) {
    return (
      <input ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className="w-full bg-transparent outline-none border-b border-blue-400 text-sm" />
    );
  }
  return (
    <span onClick={() => { setDraft(value); setEditing(true); }}
      className={`block w-full cursor-text text-sm min-h-[20px] ${!value ? "text-gray-300 dark:text-gray-600" : ""}`}>
      {value || placeholder}
    </span>
  );
}

function NumberCell({ value, onChange, placeholder = "" }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value !== null ? String(value) : "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => {
    const n = draft.trim() === "" ? null : Number(draft.replace(/,/g, ""));
    onChange(isNaN(n as number) ? null : n);
    setEditing(false);
  };
  if (editing) {
    return (
      <input ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value !== null ? String(value) : ""); setEditing(false); } }}
        className="w-full bg-transparent outline-none border-b border-blue-400 text-sm text-right" />
    );
  }
  return (
    <span onClick={() => { setDraft(value !== null ? String(value) : ""); setEditing(true); }}
      className={`block w-full text-right cursor-text text-sm min-h-[20px] ${value === null ? "text-gray-300 dark:text-gray-600" : ""}`}>
      {value !== null ? value.toLocaleString() : placeholder}
    </span>
  );
}

function BoolCell({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-center">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-blue-500 cursor-pointer" />
    </div>
  );
}

function StatusCell({ value, statuses, onChange }: { value: string; statuses: StatusOption[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = statuses.find((s) => s.label === value);
  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-1.5 text-left">
        {current ? (
          <><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: current.textColor }} /><span className="text-xs text-[#37352f] dark:text-[#e6e6e4] truncate">{current.label}</span></>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </button>
      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={176}>
        <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">—</button>
        {CATEGORIES.map((cat) => {
          const items = statuses.filter((s) => s.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{cat}</p>
              {items.map((s) => (
                <button key={s.id} onClick={() => { onChange(s.label); setOpen(false); }}
                  className="w-full flex items-center gap-1.5 text-left px-3 py-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.textColor }} />
                  <span className="text-xs text-[#37352f] dark:text-[#e6e6e4]">{s.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </AnchoredDropdown>
    </>
  );
}

// ─── Status option editor ─────────────────────────────────────────────────────

function StatusOptionRow({ status, onSave, onDelete }: { status: StatusOption; onSave: (s: StatusOption) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(status.label);
  const [color, setColor] = useState(COLOR_PRESETS.find((p) => p.color === status.color) || COLOR_PRESETS[0]);
  const [category, setCategory] = useState<StatusCategory>(status.category);
  const save = () => { onSave({ ...status, label, color: color.color, textColor: color.textColor, category }); setEditing(false); };
  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-50 dark:bg-[#2a2a2a] mb-1">
        <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className="input-style flex-1 py-0.5 text-xs" autoFocus />
        <select value={category} onChange={(e) => setCategory(e.target.value as StatusCategory)} className="input-style w-24 py-0.5 text-xs">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {COLOR_PRESETS.map((p) => (
            <button key={p.label} onClick={() => setColor(p)} title={p.label}
              className={`w-4 h-4 rounded border ${color.color === p.color ? "border-blue-500" : "border-transparent"}`}
              style={{ backgroundColor: p.color }} />
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
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium flex-1" style={{ backgroundColor: status.color, color: status.textColor }}>{status.label}</span>
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">편집</button>
      <button onClick={() => onDelete(status.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
    </div>
  );
}

function StatusEditor({ onClose }: { onClose: () => void }) {
  const { customerStatuses, upsertCustomerStatus, deleteCustomerStatus } = useWorkspaceStore();
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<StatusCategory>("할 일");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const addStatus = () => {
    if (!newLabel.trim()) return;
    upsertCustomerStatus({ id: uuidv4(), label: newLabel.trim(), color: newColor.color, textColor: newColor.textColor, category: newCategory });
    setNewLabel("");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
          <h3 className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">Status 옵션 편집</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {CATEGORIES.map((cat) => {
            const items = customerStatuses.filter((s) => s.category === cat);
            return (
              <div key={cat} className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
                {items.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 px-2">옵션 없음</p>}
                {items.map((s) => <StatusOptionRow key={s.id} status={s} onSave={upsertCustomerStatus} onDelete={deleteCustomerStatus} />)}
              </div>
            );
          })}
        </div>
        <div className="border-t border-[#e9e9e7] dark:border-[#3f3f3f] p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">새 옵션 추가</p>
          <div className="flex gap-2">
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStatus()} placeholder="옵션 이름" className="input-style flex-1" />
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as StatusCategory)} className="input-style w-28">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map((p) => (
              <button key={p.label} onClick={() => setNewColor(p)} title={p.label}
                className={`w-6 h-6 rounded border-2 ${newColor.color === p.color ? "border-blue-500" : "border-transparent"}`}
                style={{ backgroundColor: p.color }} />
            ))}
          </div>
          {newLabel.trim() && (
            <div className="flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: newColor.color, color: newColor.textColor }}>{newLabel}</span>
              <span className="text-xs text-gray-400">미리보기</span>
            </div>
          )}
          <button onClick={addStatus} disabled={!newLabel.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors">
            <Plus size={14} /> 추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assignee editor ─────────────────────────────────────────────────────────

function AssigneeEditor({ assignees, onSave, onClose }: {
  assignees: string[];
  onSave: (names: string[]) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState(assignees);
  const [newName, setNewName] = useState("");
  const add = () => {
    const t = newName.trim();
    if (!t || list.includes(t)) return;
    setList((l) => [...l, t]);
    setNewName("");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-2xl w-[360px] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
          <h3 className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">담당자 옵션 편집</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 max-h-60 space-y-1">
          {list.map((name, idx) => (
            <div key={name} className="flex items-center justify-between px-3 py-2 rounded bg-gray-50 dark:bg-[#2a2a2a] group">
              <div className="flex items-center gap-2">
                <AssigneeAvatar name={name} assignees={list} size={20} />
                <span className="text-sm text-[#37352f] dark:text-[#e6e6e4]">{name}</span>
              </div>
              <button onClick={() => setList((l) => l.filter((_, i) => i !== idx))}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"><Trash2 size={14} /></button>
            </div>
          ))}
          {list.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 px-2">담당자 없음</p>}
        </div>
        <div className="border-t border-[#e9e9e7] dark:border-[#3f3f3f] p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">새 담당자 추가</p>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="이름 입력" className="input-style flex-1 text-sm" />
            <button onClick={add} disabled={!newName.trim()}
              className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40"><Plus size={14} /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]">취소</button>
            <button onClick={() => { onSave(list); onClose(); }} className="flex-1 py-2 text-sm rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600">저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tags editor ──────────────────────────────────────────────────────────────

function TagsEditor({ tags, onSave, onClose }: {
  tags: CrmTag[];
  onSave: (tags: CrmTag[]) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState(tags);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLOR_PRESETS[0]);

  const add = () => {
    const t = newLabel.trim();
    if (!t || list.find((x) => x.label === t)) return;
    setList((l) => [...l, { label: t, bg: newColor.bg, text: newColor.text }]);
    setNewLabel("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-2xl w-[400px] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
          <h3 className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">Tags 옵션 편집</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 max-h-60 space-y-1">
          {list.map((tag, idx) => (
            <div key={tag.label} className="flex items-center justify-between px-3 py-2 rounded bg-gray-50 dark:bg-[#2a2a2a] group">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: tag.bg, color: tag.text }}>{tag.label}</span>
              <button onClick={() => setList((l) => l.filter((_, i) => i !== idx))}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"><Trash2 size={14} /></button>
            </div>
          ))}
          {list.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 px-2">태그 없음</p>}
        </div>
        <div className="border-t border-[#e9e9e7] dark:border-[#3f3f3f] p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">새 태그 추가</p>
          <div className="flex gap-2">
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="태그 이름" className="input-style flex-1 text-sm" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TAG_COLOR_PRESETS.map((p, i) => (
              <button key={i} onClick={() => setNewColor(p)}
                className={`w-6 h-6 rounded-full border-2 ${newColor.bg === p.bg ? "border-blue-500 scale-110" : "border-transparent"} transition-transform`}
                style={{ backgroundColor: p.bg }} />
            ))}
          </div>
          {newLabel.trim() && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: newColor.bg, color: newColor.text }}>{newLabel}</span>
          )}
          <div className="flex gap-2">
            <button onClick={add} disabled={!newLabel.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40">
              <Plus size={14} /> 추가
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]">취소</button>
            <button onClick={() => { onSave(list); onClose(); }} className="flex-1 py-2 text-sm rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600">저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notion-style unified column header ──────────────────────────────────────

type SortDir = "asc" | "desc" | null;

interface ColumnHeaderProps {
  col: AnyCol;
  allCols: AnyCol[];           // full visible list for move
  sortField: string | null;
  sortDir: SortDir;
  onSort: (id: string, dir: "asc" | "desc" | null) => void;
  // Filters
  assignees?: string[];
  assigneeFilter?: Set<string> | null;
  onAssigneeFilter?: (next: Set<string> | null) => void;
  allStatuses?: StatusOption[];
  statusFilter?: Set<string> | null;
  onStatusFilter?: (next: Set<string> | null) => void;
  // Mutations
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onInsertLeft?: () => void;
  onInsertRight?: () => void;
  onEditProp?: (label: string, type?: CustomColumnType) => void;
  onDelete?: () => void;
  onEditStatus?: () => void;
  onEditAssignee?: () => void;
  onEditTags?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function ColumnHeader({
  col, allCols,
  sortField, sortDir, onSort,
  assignees, assigneeFilter, onAssigneeFilter,
  allStatuses, statusFilter, onStatusFilter,
  onMoveLeft, onMoveRight, onInsertLeft, onInsertRight,
  onEditProp, onDelete, onEditStatus, onEditAssignee, onEditTags,
  isFirst, isLast,
}: ColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"filter" | "rename" | "type" | null>(null);
  const [renameVal, setRenameVal] = useState(col.label);
  const [typeVal, setTypeVal] = useState<CustomColumnType>(col.effectiveType);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isActiveSort = sortField === col.id;
  const activeSortDir = isActiveSort ? sortDir : null;
  const hasAssigneeFilter = col.id === "_assignee" && assigneeFilter !== null && assigneeFilter !== undefined && assignees !== undefined && assigneeFilter.size < assignees.length;
  const hasStatusFilter = col.id === "_status" && statusFilter !== null && statusFilter !== undefined && allStatuses !== undefined && statusFilter.size < allStatuses.length;
  const isFiltered = hasAssigneeFilter || hasStatusFilter;

  const close = () => { setOpen(false); setSubPanel(null); setConfirmDelete(false); };

  const mi = (content: React.ReactNode, onClick?: () => void, cls?: string) => (
    <button onClick={onClick} className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#3a3a3a] ${cls ?? ""}`}>
      {content}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5">
      <button
        ref={btnRef}
        onClick={() => { setOpen((o) => !o); if (open) { setSubPanel(null); setConfirmDelete(false); } }}
        className={`flex items-center gap-0.5 transition-colors hover:text-[#37352f] dark:hover:text-[#e6e6e4] ${isFiltered ? "text-blue-500" : ""} ${isActiveSort ? "font-bold" : ""}`}
      >
        {col.label}
        {isActiveSort && activeSortDir === "asc" && <ChevronUp size={11} />}
        {isActiveSort && activeSortDir === "desc" && <ChevronDown size={11} />}
        {isFiltered && !isActiveSort && <Filter size={10} fill="currentColor" className="ml-0.5" />}
      </button>

      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={close} width={210}>
        {/* Delete confirm */}
        {confirmDelete && (
          <div className="p-3">
            <p className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-1">열 삭제</p>
            <p className="text-[11px] text-gray-400 mb-3">&quot;{col.label}&quot; 열을 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1 text-xs rounded border border-[#e9e9e7] dark:border-[#3f3f3f] text-gray-400 hover:bg-gray-50">취소</button>
              <button onClick={() => { onDelete?.(); close(); }} className="flex-1 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600">삭제</button>
            </div>
          </div>
        )}

        {/* 이름 변경 패널 */}
        {!confirmDelete && subPanel === "rename" && (
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e4]">이름 변경</p>
            <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameVal.trim()) { onEditProp?.(renameVal.trim()); close(); }
                if (e.key === "Escape") setSubPanel(null);
              }}
              autoFocus className="input-style w-full text-xs" />
            <div className="flex gap-2">
              <button onClick={() => setSubPanel(null)} className="flex-1 py-1 text-xs rounded border border-[#e9e9e7] dark:border-[#3f3f3f] text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">취소</button>
              <button onClick={() => { if (renameVal.trim()) { onEditProp?.(renameVal.trim()); close(); } }}
                disabled={!renameVal.trim()}
                className="flex-1 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40">확인</button>
            </div>
          </div>
        )}

        {/* 유형 선택 패널 (커스텀 열 전용) */}
        {!confirmDelete && subPanel === "type" && (
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e4]">유형 선택</p>
            <div className="grid grid-cols-2 gap-1">
              {COL_TYPE_OPTIONS.map((opt) => (
                <button key={opt.value}
                  onClick={() => { setTypeVal(opt.value); onEditProp?.(col.label, opt.value); close(); }}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded text-xs border transition-colors ${typeVal === opt.value ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold" : "border-[#e9e9e7] dark:border-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"}`}>
                  <span className="text-[13px] w-5 text-center flex-shrink-0">{opt.icon}</span>
                  {opt.label}
                  {typeVal === opt.value && <Check size={10} className="ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
            <button onClick={() => setSubPanel(null)} className="w-full py-1 text-xs rounded border border-[#e9e9e7] dark:border-[#3f3f3f] text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">취소</button>
          </div>
        )}

        {/* Assignee filter */}
        {!confirmDelete && subPanel === "filter" && col.id === "_assignee" && (
          <div className="p-2">
            <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
              <button onClick={() => onAssigneeFilter?.(null)} className="text-[10px] text-blue-500 hover:underline">전체 선택</button>
              <button onClick={() => onAssigneeFilter?.(new Set())} className="text-[10px] text-gray-400 hover:underline">선택 해제</button>
            </div>
            {(assignees ?? []).length === 0 && <p className="px-1 py-1 text-xs text-gray-300">담당자 없음</p>}
            {(assignees ?? []).map((a) => {
              const checked = assigneeFilter == null ? true : assigneeFilter.has(a);
              return (
                <label key={a} className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3a3a3a] rounded font-normal">
                  <input type="checkbox" checked={checked} onChange={() => {
                    const base = assigneeFilter ?? new Set(assignees);
                    const next = new Set(base);
                    if (next.has(a)) next.delete(a); else next.add(a);
                    onAssigneeFilter?.(next);
                  }} className="w-3.5 h-3.5 accent-blue-500" />
                  <AssigneeAvatar name={a} />
                  <span className="text-[#37352f] dark:text-[#e6e6e4]">{a}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Status filter */}
        {!confirmDelete && subPanel === "filter" && col.id === "_status" && (
          <div className="p-2">
            <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
              <button onClick={() => onStatusFilter?.(null)} className="text-[10px] text-blue-500 hover:underline">전체 선택</button>
              <button onClick={() => onStatusFilter?.(new Set())} className="text-[10px] text-gray-400 hover:underline">선택 해제</button>
            </div>
            {(allStatuses ?? []).map((s) => {
              const checked = statusFilter == null ? true : statusFilter.has(s.label);
              return (
                <label key={s.id} className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3a3a3a] rounded font-normal">
                  <input type="checkbox" checked={checked} onChange={() => {
                    const base = statusFilter ?? new Set(allStatuses?.map((x) => x.label));
                    const next = new Set(base);
                    if (next.has(s.label)) next.delete(s.label); else next.add(s.label);
                    onStatusFilter?.(next);
                  }} className="w-3.5 h-3.5 accent-blue-500" />
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.textColor }} />
                  <span className="text-[#37352f] dark:text-[#e6e6e4]">{s.label}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Main menu */}
        {!confirmDelete && subPanel === null && (
          <>
            <div className="px-2 pt-2 pb-1">
              <p className="px-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">정렬</p>
              {mi(<><ChevronUp size={12} className="text-gray-400 flex-shrink-0" /><span>오름차순</span>{isActiveSort && activeSortDir === "asc" && <Check size={10} className="ml-auto text-blue-500" />}</>,
                () => { onSort(col.id, isActiveSort && activeSortDir === "asc" ? null : "asc"); close(); })}
              {mi(<><ChevronDown size={12} className="text-gray-400 flex-shrink-0" /><span>내림차순</span>{isActiveSort && activeSortDir === "desc" && <Check size={10} className="ml-auto text-blue-500" />}</>,
                () => { onSort(col.id, isActiveSort && activeSortDir === "desc" ? null : "desc"); close(); })}
            </div>

            {(col.id === "_assignee" || col.id === "_status") && (
              <>
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {mi(<><Filter size={12} className="text-gray-400 flex-shrink-0" /><span>필터</span>{isFiltered && <span className="ml-auto text-[10px] text-blue-500">적용됨</span>}</>,
                  () => setSubPanel("filter"))}
              </>
            )}

            <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
            {mi(<><ChevronLeft size={12} className="text-gray-400 flex-shrink-0" /><span>왼쪽으로 이동</span></>,
              () => { onMoveLeft?.(); close(); },
              isFirst ? "opacity-30 cursor-not-allowed pointer-events-none" : "")}
            {mi(<><ChevronRight size={12} className="text-gray-400 flex-shrink-0" /><span>오른쪽으로 이동</span></>,
              () => { onMoveRight?.(); close(); },
              isLast ? "opacity-30 cursor-not-allowed pointer-events-none" : "")}

            <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
            {mi(<><ChevronLeft size={12} className="text-blue-400 flex-shrink-0" /><span>왼쪽에 삽입</span></>,
              () => { onInsertLeft?.(); close(); })}
            {mi(<><ChevronRight size={12} className="text-blue-400 flex-shrink-0" /><span>오른쪽에 삽입</span></>,
              () => { onInsertRight?.(); close(); })}

            <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
            {mi(<><Pencil size={12} className="text-gray-400 flex-shrink-0" /><span>이름 변경</span></>,
              () => { setRenameVal(col.label); setSubPanel("rename"); })}
            {mi(<><span className="text-[13px] w-3 text-center flex-shrink-0">{COL_TYPE_OPTIONS.find(o => o.value === col.effectiveType)?.icon ?? "T"}</span><span>유형 선택</span><span className="ml-auto text-[10px] text-gray-400">{COL_TYPE_OPTIONS.find(o => o.value === col.effectiveType)?.label ?? "텍스트"}</span></>,
              () => { setTypeVal(col.effectiveType); setSubPanel("type"); })}

            {col.deletable && (
              mi(<><Trash2 size={12} className="flex-shrink-0" /><span>속성 삭제</span></>,
                () => setConfirmDelete(true),
                "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20")
            )}

            {col.id === "_status" && (
              <>
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {mi(<><Settings size={12} className="text-gray-400 flex-shrink-0" /><span>Status 옵션 편집</span></>,
                  () => { onEditStatus?.(); close(); })}
              </>
            )}
            {col.id === "_assignee" && (
              <>
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {mi(<><Settings size={12} className="text-gray-400 flex-shrink-0" /><span>담당자 옵션 편집</span></>,
                  () => { onEditAssignee?.(); close(); })}
              </>
            )}
            {col.id === "_route" && (
              <>
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {mi(<><Settings size={12} className="text-gray-400 flex-shrink-0" /><span>Tags 옵션 편집</span></>,
                  () => { onEditTags?.(); close(); })}
              </>
            )}
          </>
        )}
      </AnchoredDropdown>
    </div>
  );
}

// ─── Add customer row ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", assignee: "", route: "" as CustomerRoute,
  settlement_amount: null as number | null, alba: "",
  total_amount: null as number | null, balance: null as number | null,
  custom_fields: {} as Record<string, boolean | string | null>,
  submit_date: "", status: "", memo: "", monthPageId: null as string | null,
};

function AddCustomerRow({ statuses, allCols, onSave, onCancel, assignees, tags }: {
  statuses: StatusOption[];
  allCols: AnyCol[];
  onSave: (c: Omit<Customer, "id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
  assignees: string[];
  tags: CrmTag[];
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, assignee: assignees[0] ?? EMPTY_FORM.assignee });
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = () => { if (!form.name.trim()) return; onSave({ ...form, name: form.name.trim() }); };

  return (
    <tr className="border-t-2 border-blue-400 bg-blue-50/50 dark:bg-blue-950/10">
      {allCols.map((col) => {
        if (col.kind === "builtin") {
          if (col.id === "_name") return (
            <td key={col.id} className="px-3 py-2 min-w-[120px]">
              <input ref={nameRef} value={form.name} onChange={(e) => set("name", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }}
                placeholder="이름 입력" className="w-full bg-transparent outline-none text-sm placeholder-blue-300" />
            </td>
          );
          if (col.id === "_assignee") return (
            <td key={col.id} className="px-3 py-2">
              <AssigneeCell value={form.assignee} onChange={(v) => set("assignee", v)} assignees={assignees} />
            </td>
          );
          if (col.id === "_route") return (
            <td key={col.id} className="px-3 py-2">
              <TagsCell value={form.route} onChange={(v) => set("route", v)} tags={tags} />
            </td>
          );
          if (col.id === "_alba") return (
            <td key={col.id} className="px-3 py-2">
              <input value={form.alba} onChange={(e) => set("alba", e.target.value)} placeholder="알바" className="w-full bg-transparent outline-none text-sm" />
            </td>
          );
          if (col.id === "_settlement") return (
            <td key={col.id} className="px-3 py-2">
              <input type="number" value={form.settlement_amount ?? ""} onChange={(e) => set("settlement_amount", e.target.value === "" ? null : Number(e.target.value))} className="w-full bg-transparent outline-none text-sm text-right" placeholder="0" />
            </td>
          );
          if (col.id === "_total") return (
            <td key={col.id} className="px-3 py-2">
              <input type="number" value={form.total_amount ?? ""} onChange={(e) => set("total_amount", e.target.value === "" ? null : Number(e.target.value))} className="w-full bg-transparent outline-none text-sm text-right" placeholder="0" />
            </td>
          );
          if (col.id === "_balance") return (
            <td key={col.id} className="px-3 py-2">
              <input type="number" value={form.balance ?? ""} onChange={(e) => set("balance", e.target.value === "" ? null : Number(e.target.value))} className="w-full bg-transparent outline-none text-sm text-right" placeholder="0" />
            </td>
          );
          if (col.id === "_submit_date") return (
            <td key={col.id} className="px-3 py-2">
              <input type="date" value={form.submit_date} onChange={(e) => set("submit_date", e.target.value)} className="w-full bg-transparent outline-none text-sm cursor-pointer" />
            </td>
          );
          if (col.id === "_status") return (
            <td key={col.id} className="px-3 py-2 min-w-[120px]">
              <StatusCell value={form.status} statuses={statuses} onChange={(v) => set("status", v)} />
            </td>
          );
          if (col.id === "_memo") return (
            <td key={col.id} className="px-3 py-2">
              <input value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="메모" className="w-full bg-transparent outline-none text-sm" />
            </td>
          );
        }
        // custom col — by type
        const cfVal2 = form.custom_fields[col.id] ?? null;
        const cfSet = (v: boolean | string | null) => set("custom_fields", { ...form.custom_fields, [col.id]: v });
        switch (col.colDef?.type) {
          case "text":
            return <td key={col.id} className="px-3 py-2"><input value={String(cfVal2 ?? "")} onChange={(e) => cfSet(e.target.value)} placeholder="텍스트" className="w-full bg-transparent outline-none text-sm" /></td>;
          case "number":
            return <td key={col.id} className="px-3 py-2"><input type="number" value={cfVal2 !== null && cfVal2 !== "" ? String(cfVal2) : ""} onChange={(e) => cfSet(e.target.value === "" ? null : e.target.value)} placeholder="0" className="w-full bg-transparent outline-none text-sm text-right" /></td>;
          case "date":
            return <td key={col.id} className="px-3 py-2"><input type="date" value={String(cfVal2 ?? "")} onChange={(e) => cfSet(e.target.value)} className="w-full bg-transparent outline-none text-sm cursor-pointer" /></td>;
          case "assignee":
            return <td key={col.id} className="px-3 py-2"><AssigneeCell value={String(cfVal2 ?? "")} onChange={(v) => cfSet(v)} /></td>;
          case "status":
            return <td key={col.id} className="px-3 py-2 min-w-[120px]"><StatusCell value={String(cfVal2 ?? "")} statuses={statuses} onChange={(v) => cfSet(v)} /></td>;
          default:
            return (
              <td key={col.id} className="px-3 py-2 text-center">
                <input type="checkbox" checked={Boolean(cfVal2)}
                  onChange={(e) => cfSet(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 cursor-pointer" />
              </td>
            );
        }
      })}
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={save} disabled={!form.name.trim()} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40">저장</button>
          <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600">취소</button>
        </div>
      </td>
    </tr>
  );
}

function AddTriggerRow({ onAdd, colSpan }: { onAdd: () => void; colSpan: number }) {
  return (
    <tr className="border-t border-[#e9e9e7] dark:border-[#2f2f2f]">
      <td colSpan={colSpan} className="px-3 py-2">
        <button onClick={onAdd} className="flex items-center gap-1.5 text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors">
          <Plus size={14} /> 새 고객 추가
        </button>
      </td>
    </tr>
  );
}

// ─── Move modal ───────────────────────────────────────────────────────────────

function MoveModal({ currentMonthPageId, onMove, onClose }: { currentMonthPageId: string | null; onMove: (targetMonthPageId: string | null) => void; onClose: () => void }) {
  const { pages } = useWorkspaceStore();
  const [selected, setSelected] = useState<string | null>(null);
  const yearPages = Object.values(pages).filter((p) => /^(\d{4})년/.test(p.title)).sort((a, b) => {
    const ay = parseInt(a.title.match(/^(\d{4})/)?.[1] ?? "0");
    const by = parseInt(b.title.match(/^(\d{4})/)?.[1] ?? "0");
    return by - ay;
  });
  const getMonths = (yearPageId: string) =>
    (pages[yearPageId]?.children ?? []).map((id) => pages[id]).filter(Boolean).filter((p) => /^\d{1,2}월$/.test(p.title)).sort((a, b) => parseInt(a.title) - parseInt(b.title));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xs mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
          <h3 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">다른 달로 이동</h3>
          <button onClick={onClose} className="text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"><X size={16} /></button>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {yearPages.length === 0 && <p className="px-5 py-4 text-sm text-[#9b9a97]">이동할 수 있는 달이 없습니다.</p>}
          {yearPages.map((yearPage) => {
            const months = getMonths(yearPage.id);
            if (months.length === 0) return null;
            return (
              <div key={yearPage.id}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{yearPage.title.replace("고객관리양식", "").trim()}</p>
                {months.map((mp) => {
                  const isCurrent = mp.id === currentMonthPageId;
                  const isSelected = selected === mp.id;
                  return (
                    <button key={mp.id} disabled={isCurrent} onClick={() => setSelected(mp.id)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${isCurrent ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : isSelected ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" : "text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f]"}`}>
                      <span>{mp.title}</span>
                      {isCurrent && <span className="text-[10px] text-gray-400">현재</span>}
                      {isSelected && !isCurrent && <Check size={14} className="text-blue-500" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-[#e9e9e7] dark:border-[#2f2f2f] flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors">취소</button>
          <button disabled={!selected} onClick={() => { if (selected) { onMove(selected); onClose(); } }}
            className="flex-1 py-2 text-sm rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">이동</button>
        </div>
      </div>
    </div>
  );
}

// ─── Data row ─────────────────────────────────────────────────────────────────

function DataRow({ customer, statuses, allCols, onUpdate, onDelete, onMove, draggable, onDragStart, onDragOver, onDrop, compact, assignees, tags }: {
  customer: Customer;
  statuses: StatusOption[];
  allCols: AnyCol[];
  onUpdate: (updates: Partial<Omit<Customer, "id" | "created_at">>) => void;
  onDelete: () => void;
  onMove: (targetMonthPageId: string | null) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  compact?: boolean;
  assignees: string[];
  tags: CrmTag[];
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDeleteClick() {
    if (confirmDelete) { onDelete(); }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
  }

  return (
    <tr
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); onDragOver?.(e); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop?.(); }}
      className={`border-t border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] group transition-colors ${isDragOver ? "border-t-2 border-t-blue-400" : ""}`}
    >
      {allCols.map((col) => {
        const cellCls = compact ? "px-1.5 py-0.5" : "px-3 py-2";

        // ── Unified cell rendering based on effectiveType ──────────────────
        // For builtin cols: value comes from customer[field], route col keeps TagsCell
        // For custom cols: value comes from customer.custom_fields[id]

        // Special case: _route uses a dedicated dropdown (not overridable)
        if (col.id === "_route") return (
          <td key={col.id} className={`${cellCls} min-w-[80px]`}>
            <TagsCell value={customer.route} onChange={(v) => onUpdate({ route: v })} tags={tags} />
          </td>
        );

        // Get raw string/number value from the right source
        const getRaw = (): string => {
          if (col.kind === "builtin" && col.field) {
            const v = customer[col.field];
            return v === null || v === undefined ? "" : String(v);
          }
          const v = customer.custom_fields?.[col.id] ?? null;
          return v === null ? "" : String(v);
        };

        const setVal = (v: string | number | boolean | null) => {
          if (col.kind === "builtin" && col.field) {
            onUpdate({ [col.field]: v } as Partial<Omit<Customer, "id" | "created_at">>);
          } else {
            const cfv: boolean | string | null =
              typeof v === "number" ? String(v) : v;
            onUpdate({ custom_fields: { ...customer.custom_fields, [col.id]: cfv } });
          }
        };

        const rawStr = getRaw();

        switch (col.effectiveType) {
          case "number":
            return (
              <td key={col.id} className={`${cellCls} min-w-[90px]`}>
                <NumberCell
                  value={rawStr !== "" && rawStr !== null ? Number(rawStr) : null}
                  onChange={(v) => setVal(v)}
                  placeholder="0"
                />
              </td>
            );
          case "date":
            return (
              <td key={col.id} className={`${cellCls} min-w-[130px]`}>
                <input type="date" value={rawStr} onChange={(e) => setVal(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm cursor-pointer dark:text-[#e6e6e4] dark:color-scheme-dark" />
              </td>
            );
          case "assignee":
            return (
              <td key={col.id} className={`${cellCls} min-w-[90px]`}>
                <AssigneeCell value={rawStr} onChange={(v) => setVal(v)} assignees={assignees} />
              </td>
            );
          case "status":
            return (
              <td key={col.id} className={`${cellCls} min-w-[120px]`}>
                <StatusCell value={rawStr} statuses={statuses} onChange={(v) => setVal(v)} />
              </td>
            );
          case "checkbox":
            return (
              <td key={col.id} className={`${cellCls} text-center`}>
                <BoolCell value={rawStr === "true" || rawStr === "1"} onChange={(v) => setVal(v)} />
              </td>
            );
          default: // "text"
            return (
              <td key={col.id} className={`${cellCls} min-w-[100px]`}>
                <TextCell value={rawStr} onChange={(v) => setVal(v)} placeholder="텍스트" />
              </td>
            );
        }
      })}
      {/* Action cell */}
      <td className={`${compact ? "px-1.5 py-0.5" : "px-3 py-2"} min-w-[80px]`}>
        <div className="flex items-center gap-1">
          <span title="드래그하여 순서 변경" className="cursor-grab active:cursor-grabbing text-[#c7c7c7] dark:text-[#555] hover:text-[#9b9a97] dark:hover:text-[#9b9a97] opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={14} />
          </span>
          <button onClick={() => setShowMoveModal(true)} title="다른 달로 이동"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-[#6b6b6b] dark:text-[#9b9a97] bg-[#f0efed] dark:bg-[#2f2f2f] hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-all">
            <ArrowRightLeft size={14} />
            <span>이동</span>
          </button>
          <button onClick={handleDeleteClick} title={confirmDelete ? "한 번 더 클릭하면 삭제됩니다" : "삭제"}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${confirmDelete ? "bg-red-500 text-white animate-pulse" : "text-[#6b6b6b] dark:text-[#9b9a97] bg-[#f0efed] dark:bg-[#2f2f2f] hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40"}`}>
            <Trash2 size={14} />
            <span>{confirmDelete ? "삭제?" : "삭제"}</span>
          </button>
        </div>
        {showMoveModal && <MoveModal currentMonthPageId={customer.monthPageId} onMove={onMove} onClose={() => setShowMoveModal(false)} />}
      </td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWon(n: number): string {
  return `₩${Math.round(n).toLocaleString()}`;
}

// ─── Main CRMPage ─────────────────────────────────────────────────────────────

export default function CRMPage({
  monthPageId = null,
  embedded = false,
}: {
  monthPageId?: string | null;
  embedded?: boolean;
}) {
  const {
    customers, customerStatuses, customColumns,
    createCustomer, updateCustomer, deleteCustomer, restoreCustomer, reorderCustomers,
    upsertCustomColumn, deleteCustomColumn, reorderCustomColumns,
    crmColOrder, crmColLabels, crmHiddenCols, crmColTypes,
    setCrmColOrder, setCrmColLabel, setCrmHiddenCols, setCrmColType,
    crmAssignees, crmTags, setCrmAssignees, setCrmTags,
  } = useWorkspaceStore();

  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showAssigneeEditor, setShowAssigneeEditor] = useState(false);
  const [showTagsEditor, setShowTagsEditor] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [compact, setCompact] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  // ─── Column resize ────────────────────────────────────────────────────────
  const resizingCol = useRef<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizingCol.current) return;
      const delta = e.clientX - resizeStartX.current;
      const newW = Math.max(40, resizeStartW.current + delta);
      setColWidths((prev) => ({ ...prev, [resizingCol.current!]: newW }));
    }
    function onMouseUp() { resizingCol.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); };
  }, []);

  // ─── Row drag-and-drop ────────────────────────────────────────────────────
  const dragRowId = useRef<string | null>(null);
  const dragOverRowId = useRef<string | null>(null);

  const handleRowDragStart = useCallback((id: string) => {
    dragRowId.current = id;
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverRowId.current = id;
  }, []);

  const handleRowDrop = useCallback((pageId: string | null) => {
    const fromId = dragRowId.current;
    const toId = dragOverRowId.current;
    if (!fromId || !toId || fromId === toId) return;
    dragRowId.current = null;
    dragOverRowId.current = null;

    const scopedIds = customers
      .filter((c) => c.monthPageId === pageId)
      .map((c) => c.id);
    const fromIdx = scopedIds.indexOf(fromId);
    const toIdx = scopedIds.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...scopedIds];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, fromId);
    reorderCustomers(reordered);
  }, [customers, reorderCustomers]);

  // ─── Undo stack ───────────────────────────────────────────────────────────
  type UndoSnapshot = {
    customers: Customer[];
    columns: CustomColumnDef[];
    colOrder: string[] | null;
    colLabels: Record<string, string>;
    hiddenCols: string[];
  };
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const lastUndoPushRef = useRef<number>(0);
  const monthScopedRef = useRef<Customer[]>([]);

  const pushUndoSnapshot = useCallback((force = false) => {
    const now = Date.now();
    // 800ms 내 연속 변경은 같은 undo 단계로 묶음 (force=true이면 항상 찍음)
    if (!force && now - lastUndoPushRef.current < 800) return;
    lastUndoPushRef.current = now;
    const { customColumns: cols, crmColOrder: colOrder, crmColLabels: colLabels, crmHiddenCols: hiddenCols } = useWorkspaceStore.getState();
    setUndoStack((prev) => [...prev.slice(-19), {
      customers: [...monthScopedRef.current],
      columns: cols.map((c) => ({ ...c })),
      colOrder: colOrder ? [...colOrder] : null,
      colLabels: { ...colLabels },
      hiddenCols: [...hiddenCols],
    }]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      const current = monthScopedRef.current;
      const snapshotIds = new Set(snapshot.customers.map((c) => c.id));
      // 고객 복원
      snapshot.customers.forEach((c) => restoreCustomer(c));
      current.forEach((c) => { if (!snapshotIds.has(c.id)) deleteCustomer(c.id); });
      // 컬럼 복원
      const { customColumns: curCols, upsertCustomColumn: upsertCol, deleteCustomColumn: delCol } = useWorkspaceStore.getState();
      const snapColIds = new Set(snapshot.columns.map((c) => c.id));
      snapshot.columns.forEach((c) => upsertCol(c));
      curCols.forEach((c) => { if (!snapColIds.has(c.id)) delCol(c.id); });
      // 컬럼 순서/라벨/숨김 복원 (setState로 한 번에 덮어씀)
      useWorkspaceStore.setState({
        crmColOrder: snapshot.colOrder,
        crmColLabels: { ...snapshot.colLabels },
        crmHiddenCols: [...snapshot.hiddenCols],
      });
      return prev.slice(0, -1);
    });
  }, [restoreCustomer, deleteCustomer]);

  // Ctrl+Z 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);


  const handleUpdate = useCallback((id: string, updates: Partial<Omit<Customer, "id" | "created_at">>) => {
    pushUndoSnapshot();
    updateCustomer(id, updates);
  }, [updateCustomer, pushUndoSnapshot]);

  // ─── Filters & sort ───────────────────────────────────────────────────────
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string> | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string> | null>(null);
  const [tagsFilter, setTagsFilter] = useState<Set<string> | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; dir: "asc" | "desc" } | null>(null);

  // ─── Unified column order ─────────────────────────────────────────────────
  const sortedCustomCols = useMemo(() => [...customColumns].sort((a, b) => a.order - b.order), [customColumns]);

  // Compute the merged ordered + filtered column list
  const allCols: AnyCol[] = useMemo(() => {
    const hiddenSet = new Set(crmHiddenCols);

    // Build the base order: stored order or default
    let order: string[];
    if (crmColOrder) {
      // Merge in any new custom cols not yet in the stored order
      const inOrder = new Set(crmColOrder);
      const newCustomIds = sortedCustomCols.filter((c) => !inOrder.has(c.id)).map((c) => c.id);
      if (newCustomIds.length > 0) {
        const merged = [...crmColOrder];
        // Insert before _submit_date if present, else at end
        const insertAt = merged.indexOf("_submit_date");
        merged.splice(insertAt === -1 ? merged.length : insertAt, 0, ...newCustomIds);
        order = merged;
        // Persist the merged order (deferred to avoid render loop)
        setTimeout(() => setCrmColOrder(merged), 0);
      } else {
        order = crmColOrder;
      }
    } else {
      order = [
        ...DEFAULT_COL_ORDER.slice(0, 7), // _name → _balance
        ...sortedCustomCols.map((c) => c.id),
        ...DEFAULT_COL_ORDER.slice(7), // _submit_date → _memo
      ];
    }

    // Remove hidden cols (keep _name always)
    const customById = Object.fromEntries(sortedCustomCols.map((c) => [c.id, c]));

    return order
      .filter((id) => id === "_name" || !hiddenSet.has(id))
      .map((id): AnyCol | null => {
        if (BUILTIN_BY_ID[id]) {
          const spec = BUILTIN_BY_ID[id];
          return {
            id,
            label: crmColLabels[id] ?? spec.defaultLabel,
            kind: "builtin",
            field: spec.field,
            deletable: spec.deletable,
            effectiveType: crmColTypes[id] ?? BUILTIN_DEFAULT_TYPE[id] ?? "text",
          };
        }
        const col = customById[id];
        if (!col) return null;
        return {
          id,
          label: crmColLabels[id] ?? col.label,
          kind: "checkbox",
          colDef: col,
          deletable: true,
          effectiveType: crmColTypes[id] ?? col.type ?? "checkbox",
        };
      })
      .filter((c): c is AnyCol => c !== null);
  }, [crmColOrder, crmColLabels, crmHiddenCols, crmColTypes, sortedCustomCols, setCrmColOrder]);

  // Move a column left or right in the unified order
  const moveCol = useCallback((colId: string, direction: "left" | "right") => {
    pushUndoSnapshot(true);
    const ids = allCols.map((c) => c.id);
    const idx = ids.indexOf(colId);
    if (idx === -1) return;
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= ids.length) return;
    const newIds = [...ids];
    [newIds[idx], newIds[newIdx]] = [newIds[newIdx], newIds[idx]];
    setCrmColOrder(newIds);
    const customOrder = newIds.filter((id) => !BUILTIN_BY_ID[id]);
    reorderCustomColumns(customOrder);
  }, [allCols, setCrmColOrder, reorderCustomColumns, pushUndoSnapshot]);

  // Edit a column's name and/or type (works for both builtin and custom)
  const editColProp = useCallback((colId: string, label: string, type?: CustomColumnType) => {
    pushUndoSnapshot(true);
    setCrmColLabel(colId, label);
    if (type) {
      // Always store in crmColTypes (covers both builtin and custom cols)
      setCrmColType(colId, type);
      // For custom cols, also update the colDef so it syncs to Supabase table_columns
      const col = sortedCustomCols.find((c) => c.id === colId);
      if (col) upsertCustomColumn({ ...col, label, type });
    } else {
      const col = sortedCustomCols.find((c) => c.id === colId);
      if (col) upsertCustomColumn({ ...col, label });
    }
  }, [setCrmColLabel, setCrmColType, sortedCustomCols, upsertCustomColumn, pushUndoSnapshot]);

  // Delete / hide a column
  const deleteCol = useCallback((col: AnyCol) => {
    pushUndoSnapshot(true);
    if (col.kind === "builtin") {
      setCrmHiddenCols([...crmHiddenCols, col.id]);
      if (crmColOrder) setCrmColOrder(crmColOrder.filter((id) => id !== col.id));
    } else {
      deleteCustomColumn(col.id);
      if (crmColOrder) setCrmColOrder(crmColOrder.filter((id) => id !== col.id));
    }
  }, [crmHiddenCols, crmColOrder, setCrmHiddenCols, setCrmColOrder, deleteCustomColumn, pushUndoSnapshot]);

  // Insert a new custom column to the left or right of a given column
  const insertCol = useCallback((atColId: string, side: "left" | "right") => {
    pushUndoSnapshot(true);
    const newId = uuidv4();
    const currentOrder = crmColOrder ?? [
      ...DEFAULT_COL_ORDER.slice(0, 7),
      ...sortedCustomCols.map((c) => c.id),
      ...DEFAULT_COL_ORDER.slice(7),
    ];
    const atIdx = currentOrder.indexOf(atColId);
    const newOrder = [...currentOrder];
    newOrder.splice(atIdx === -1 ? newOrder.length : (side === "left" ? atIdx : atIdx + 1), 0, newId);
    upsertCustomColumn({ id: newId, label: "새 열", type: "checkbox", order: sortedCustomCols.length });
    setCrmColOrder(newOrder);
  }, [crmColOrder, sortedCustomCols, upsertCustomColumn, setCrmColOrder, pushUndoSnapshot]);

  // Add a new custom column (inserted at the end before _submit_date)
  const addColumn = useCallback(() => {
    pushUndoSnapshot(true);
    const newId = uuidv4();
    const currentOrder = crmColOrder ?? [
      ...DEFAULT_COL_ORDER.slice(0, 7),
      ...sortedCustomCols.map((c) => c.id),
      ...DEFAULT_COL_ORDER.slice(7),
    ];
    const insertAt = currentOrder.indexOf("_submit_date");
    const newOrder = [...currentOrder];
    newOrder.splice(insertAt === -1 ? newOrder.length : insertAt, 0, newId);
    upsertCustomColumn({ id: newId, label: "새 열", type: "checkbox", order: sortedCustomCols.length });
    setCrmColOrder(newOrder);
  }, [crmColOrder, sortedCustomCols, upsertCustomColumn, setCrmColOrder, pushUndoSnapshot]);

  // ─── Customers visible in this month scope ────────────────────────────────
  const monthScoped = monthPageId ? customers.filter((c) => c.monthPageId === monthPageId) : customers;
  // undo 스냅샷 캡처용 ref 동기화 (매 렌더마다 최신값 유지)
  monthScopedRef.current = monthScoped;

  const distinctAssignees = useMemo(() => {
    const fromData = new Set(monthScoped.map((c) => c.assignee).filter(Boolean));
    // 스토어에 정의된 담당자 + 실제 데이터에 있는 담당자 합집합
    return Array.from(new Set([...crmAssignees, ...fromData]));
  }, [monthScoped, crmAssignees]);

  let visibleCustomers = monthScoped;
  if (assigneeFilter !== null) visibleCustomers = visibleCustomers.filter((c) => assigneeFilter.has(c.assignee));
  if (statusFilter !== null) visibleCustomers = visibleCustomers.filter((c) => statusFilter.has(c.status ?? ""));
  if (tagsFilter !== null) visibleCustomers = visibleCustomers.filter((c) => tagsFilter.has(c.route ?? ""));

  if (sortConfig) {
    const { field, dir } = sortConfig;
    visibleCustomers = [...visibleCustomers].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      // Map col id → actual value
      const spec = BUILTIN_BY_ID[field];
      if (spec) {
        av = ((a as unknown) as Record<string, unknown>)[spec.field as string] as string | number ?? "";
        bv = ((b as unknown) as Record<string, unknown>)[spec.field as string] as string | number ?? "";
      } else {
        av = a.custom_fields?.[field] ? 1 : 0;
        bv = b.custom_fields?.[field] ? 1 : 0;
      }
      if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
      return dir === "asc" ? String(av).localeCompare(String(bv), "ko") : String(bv).localeCompare(String(av), "ko");
    });
  }

  const totalRevenue = visibleCustomers.reduce((sum, c) => sum + (c.total_amount ?? 0), 0);
  const settlementTotal = visibleCustomers.reduce((sum, c) => sum + (c.settlement_amount ?? 0), 0);
  const balanceTotal = visibleCustomers.reduce((sum, c) => sum + (c.balance ?? 0), 0);

  // colSpan: all visible cols + action column
  const totalColSpan = allCols.length + 1;

  const handleCreateCustomer = (data: Omit<Customer, "id" | "created_at" | "updated_at">) => {
    pushUndoSnapshot(true);
    createCustomer({ ...data, monthPageId: monthPageId ?? null });
    setShowAddForm(false);
  };

  // ─── Filter bar helpers ───────────────────────────────────────────────────
  const hasActiveFilter = assigneeFilter !== null || statusFilter !== null || tagsFilter !== null;

  const FILTERABLE = [
    { id: "_assignee", label: "담당자" },
    { id: "_route",    label: "Tags"  },
    { id: "_status",   label: "Status"},
  ] as const;

  const isFilterActive = (id: string) =>
    (id === "_assignee" && assigneeFilter !== null) ||
    (id === "_route"    && tagsFilter !== null) ||
    (id === "_status"   && statusFilter !== null);

  const addFilter = (id: string) => {
    if (id === "_assignee" && assigneeFilter === null) setAssigneeFilter(new Set(distinctAssignees));
    if (id === "_route"    && tagsFilter === null)     setTagsFilter(new Set(crmTags.map((t) => t.label)));
    if (id === "_status"   && statusFilter === null)   setStatusFilter(new Set(customerStatuses.map((s) => s.label)));
  };

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const header = (
    <div className={`border-b border-[#e9e9e7] dark:border-[#2f2f2f]`}>
      <div className={`flex items-center justify-between ${embedded ? "px-4 py-3" : "px-6 py-4"}`}>
        <div>
          {!embedded && <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">고객 관리</h1>}
          <div className="flex items-center gap-3 text-sm text-[#9b9a97] dark:text-[#6b6b6b]">
            <span>총 {visibleCustomers.length}명</span>
            {monthScoped.length !== visibleCustomers.length && <span className="text-blue-400 text-xs">(필터 적용 중)</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {undoStack.length > 0 && (
            <button onClick={handleUndo} title={`실행 취소 (Ctrl+Z) — ${undoStack.length}단계 남음`}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors">
              ↩ 되돌리기 <span className="font-semibold text-blue-400">{undoStack.length}</span>
            </button>
          )}
          <button onClick={() => setCompact((v) => !v)} title="컴팩트 모드 토글"
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${compact ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" : "border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]"}`}>
            컴팩트
          </button>
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Plus size={15} /> 고객 추가
          </button>
        </div>
      </div>

      {/* Notion-style filter bar */}
      <div className={`flex items-center gap-1.5 flex-wrap ${embedded ? "px-4 pb-2" : "px-6 pb-3"}`}>
        {/* Assignee filter chip */}
        {assigneeFilter !== null && (() => {
          const allVals = distinctAssignees;
          return (
            <FilterChip
              label="담당자"
              values={allVals.map((a) => ({
                key: a,
                display: <span className="flex items-center gap-1.5"><AssigneeAvatar name={a} assignees={crmAssignees} size={14} />{a}</span>,
              }))}
              selectedValues={assigneeFilter}
              onChange={setAssigneeFilter}
              onRemove={() => setAssigneeFilter(null)}
            />
          );
        })()}

        {/* Tags filter chip */}
        {tagsFilter !== null && (() => {
          const allTags = crmTags;
          return (
            <FilterChip
              label="Tags"
              values={allTags.map((t) => ({
                key: t.label,
                display: <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: t.bg, color: t.text }}>{t.label}</span>,
              }))}
              selectedValues={tagsFilter}
              onChange={setTagsFilter}
              onRemove={() => setTagsFilter(null)}
            />
          );
        })()}

        {/* Status filter chip */}
        {statusFilter !== null && (() => {
          const allStatuses = customerStatuses;
          return (
            <FilterChip
              label="Status"
              values={allStatuses.map((s) => ({
                key: s.label,
                display: <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.textColor }} />{s.label}</span>,
              }))}
              selectedValues={statusFilter}
              onChange={setStatusFilter}
              onRemove={() => setStatusFilter(null)}
            />
          );
        })()}

        {/* + 필터 button */}
        <button ref={filterBtnRef} onClick={() => setShowFilterMenu((o) => !o)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-dashed border-[#d0d0cc] dark:border-[#4f4f4f] text-[#9b9a97] dark:text-[#6b6b6b] hover:border-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors">
          <Plus size={11} /> 필터
        </button>
        <AnchoredDropdown open={showFilterMenu} anchorRef={filterBtnRef} onClose={() => setShowFilterMenu(false)} width={150}>
          {FILTERABLE.map(({ id, label }) => (
            <button key={id} onClick={() => { addFilter(id); setShowFilterMenu(false); }}
              disabled={isFilterActive(id)}
              className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#3a3a3a] disabled:opacity-40 disabled:cursor-not-allowed">
              <Filter size={11} className="text-gray-400" /> {label}
              {isFilterActive(id) && <Check size={10} className="ml-auto text-blue-500" />}
            </button>
          ))}
          {hasActiveFilter && (
            <>
              <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
              <button onClick={() => { setAssigneeFilter(null); setStatusFilter(null); setTagsFilter(null); setShowFilterMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                필터 전체 초기화
              </button>
            </>
          )}
        </AnchoredDropdown>
      </div>
    </div>
  );

  const table = (
    <div className={embedded ? "overflow-x-auto" : "flex-1 overflow-auto"}>
      <table className="w-full border-collapse text-[#37352f] dark:text-[#e6e6e4] text-sm">
        <thead className="sticky top-0 bg-[#f7f6f3] dark:bg-[#252525] z-10">
          <tr>
            {allCols.map((col, idx) => (
              <th key={col.id} style={colWidths[col.id] ? { width: colWidths[col.id], minWidth: colWidths[col.id] } : undefined}
                className={`${compact ? "px-1.5 py-0.5" : "px-3 py-2"} text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap relative group/th`}>
                <ColumnHeader
                  col={col}
                  allCols={allCols}
                  sortField={sortConfig?.field ?? null}
                  sortDir={sortConfig?.dir ?? null}
                  onSort={(id, d) => setSortConfig(d ? { field: id, dir: d } : null)}
                  assignees={distinctAssignees}
                  assigneeFilter={assigneeFilter}
                  onAssigneeFilter={setAssigneeFilter}
                  allStatuses={customerStatuses}
                  statusFilter={statusFilter}
                  onStatusFilter={setStatusFilter}
                  onMoveLeft={() => moveCol(col.id, "left")}
                  onMoveRight={() => moveCol(col.id, "right")}
                  onInsertLeft={() => insertCol(col.id, "left")}
                  onInsertRight={() => insertCol(col.id, "right")}
                  onEditProp={(label, type) => editColProp(col.id, label, type)}
                  onDelete={() => deleteCol(col)}
                  onEditStatus={() => setShowStatusEditor(true)}
                  onEditAssignee={() => setShowAssigneeEditor(true)}
                  onEditTags={() => setShowTagsEditor(true)}
                  isFirst={idx === 0}
                  isLast={idx === allCols.length - 1}
                />
                {/* Resize handle */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    resizingCol.current = col.id;
                    resizeStartX.current = e.clientX;
                    resizeStartW.current = colWidths[col.id] ?? (e.currentTarget.parentElement?.offsetWidth ?? 100);
                    document.body.style.cursor = "col-resize";
                    document.body.style.userSelect = "none";
                  }}
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize opacity-0 group-hover/th:opacity-100 bg-blue-400/40 hover:bg-blue-500/60 transition-opacity"
                />
              </th>
            ))}
            {/* + add column */}
            <th className={`${compact ? "px-1.5 py-0.5" : "px-3 py-2"} text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap`}>
              <button onClick={addColumn} title="새 체크박스 열 추가"
                className="text-[#c4c3bf] hover:text-[#9b9a97] transition-colors">
                <Plus size={13} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleCustomers.map((c) => (
            <DataRow
              key={c.id}
              customer={c}
              statuses={customerStatuses}
              allCols={allCols}
              onUpdate={(updates) => handleUpdate(c.id, updates)}
              onDelete={() => { pushUndoSnapshot(true); deleteCustomer(c.id); }}
              onMove={(targetMonthPageId) => handleUpdate(c.id, { monthPageId: targetMonthPageId })}
              draggable
              onDragStart={() => handleRowDragStart(c.id)}
              onDragOver={(e) => handleRowDragOver(e, c.id)}
              onDrop={() => handleRowDrop(monthPageId)}
              compact={compact}
              assignees={crmAssignees}
              tags={crmTags}
            />
          ))}
          {showAddForm ? (
            <AddCustomerRow statuses={customerStatuses} allCols={allCols} onSave={handleCreateCustomer} onCancel={() => setShowAddForm(false)} assignees={crmAssignees} tags={crmTags} />
          ) : (
            <AddTriggerRow onAdd={() => setShowAddForm(true)} colSpan={totalColSpan} />
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#e9e9e7] dark:border-[#3f3f3f] bg-[#f7f6f3] dark:bg-[#232323] font-semibold sticky bottom-0">
            {allCols.map((col, idx) => {
              const fp = compact ? "px-1.5 py-0.5" : "px-3 py-2";
              if (idx === 0) return <td key={col.id} className={`${fp} text-xs text-[#9b9a97] dark:text-[#6b6b6b]`}>합계</td>;
              if (col.id === "_settlement") return <td key={col.id} className={`${fp} text-sm text-right`}>{formatWon(settlementTotal)}</td>;
              if (col.id === "_total") return <td key={col.id} className={`${fp} text-sm text-right`}>{formatWon(totalRevenue)}</td>;
              if (col.id === "_balance") return <td key={col.id} className={`${fp} text-sm text-right`}>{formatWon(balanceTotal)}</td>;
              return <td key={col.id} />;
            })}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <>
      {embedded ? (
        <div className="bg-white dark:bg-[#191919]">{header}{table}</div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#191919]">{header}{table}</div>
      )}
      {showStatusEditor && <StatusEditor onClose={() => setShowStatusEditor(false)} />}
      {showAssigneeEditor && <AssigneeEditor assignees={crmAssignees} onSave={setCrmAssignees} onClose={() => setShowAssigneeEditor(false)} />}
      {showTagsEditor && <TagsEditor tags={crmTags} onSave={setCrmTags} onClose={() => setShowTagsEditor(false)} />}
    </>
  );
}
