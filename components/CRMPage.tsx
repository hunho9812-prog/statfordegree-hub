"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/lib/store";
import type { Customer, CustomerRoute, StatusOption, StatusCategory, CustomColumnDef } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import {
  Plus, Trash2, Settings, X, Check, GripVertical, ArrowRightLeft,
  Filter, ChevronUp, ChevronDown, Pencil,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const ASSIGNEES = ["김은호", "김세윤", "김현호", "오승준"];

const ASSIGNEE_STYLES: Record<string, { bg: string; text: string }> = {
  "김은호": { bg: "#fde68a", text: "#78350f" },
  "김세윤": { bg: "#ddd6fe", text: "#5b21b6" },
  "김현호": { bg: "#a7f3d0", text: "#065f46" },
  "오승준": { bg: "#fecaca", text: "#991b1b" },
};

const ROUTE_STYLES: Record<string, { bg: string; text: string }> = {
  "크몽": { bg: "#eef2ff", text: "#4338ca" },
  "메일": { bg: "#eff6ff", text: "#1d4ed8" },
};

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
}

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

// ─── Assignee avatar ──────────────────────────────────────────────────────────

function AssigneeAvatar({ name, size = 18 }: { name: string; size?: number }) {
  const style = ASSIGNEE_STYLES[name] ?? { bg: "#e5e7eb", text: "#374151" };
  return (
    <span
      className="rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
      style={{ width: size, height: size, backgroundColor: style.bg, color: style.text }}
    >
      {name ? name[0] : "?"}
    </span>
  );
}

function AssigneeCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-left w-full">
        <AssigneeAvatar name={value} />
        <span className="text-xs text-[#37352f] dark:text-[#e6e6e4] truncate">{value || "—"}</span>
      </button>
      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={140}>
        {ASSIGNEES.map((a) => (
          <button key={a} onClick={() => { onChange(a); setOpen(false); }}
            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">
            <AssigneeAvatar name={a} />
            <span className="text-[#37352f] dark:text-[#e6e6e4]">{a}</span>
          </button>
        ))}
      </AnchoredDropdown>
    </>
  );
}

function TagsCell({ value, onChange }: { value: CustomerRoute; onChange: (v: CustomerRoute) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const style = value ? ROUTE_STYLES[value] : null;
  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} className="text-left">
        {style ? (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: style.bg, color: style.text }}>{value}</span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </button>
      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={120}>
        <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">—</button>
        {(["크몽", "메일"] as CustomerRoute[]).map((r) => (
          <button key={r} onClick={() => { onChange(r); setOpen(false); }} className="w-full text-left px-3 py-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: ROUTE_STYLES[r].bg, color: ROUTE_STYLES[r].text }}>{r}</span>
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
  onRename?: (label: string) => void;
  onDelete?: () => void;
  onEditStatus?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function ColumnHeader({
  col, allCols,
  sortField, sortDir, onSort,
  assignees, assigneeFilter, onAssigneeFilter,
  allStatuses, statusFilter, onStatusFilter,
  onMoveLeft, onMoveRight, onInsertLeft, onInsertRight,
  onRename, onDelete, onEditStatus,
  isFirst, isLast,
}: ColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"filter" | "rename" | null>(null);
  const [renameVal, setRenameVal] = useState(col.label);
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

        {/* Rename */}
        {!confirmDelete && subPanel === "rename" && (
          <div className="p-3">
            <p className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-2">열 이름 변경</p>
            <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && renameVal.trim()) { onRename?.(renameVal.trim()); close(); } if (e.key === "Escape") setSubPanel(null); }}
              autoFocus className="input-style w-full text-xs mb-2" />
            <div className="flex gap-2">
              <button onClick={() => setSubPanel(null)} className="flex-1 py-1 text-xs rounded border border-[#e9e9e7] dark:border-[#3f3f3f] text-gray-400 hover:bg-gray-50">취소</button>
              <button onClick={() => { if (renameVal.trim()) { onRename?.(renameVal.trim()); close(); } }} disabled={!renameVal.trim()}
                className="flex-1 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40">확인</button>
            </div>
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
            {mi(<><Pencil size={12} className="text-gray-400 flex-shrink-0" /><span>속성 편집 (이름 변경)</span></>,
              () => { setRenameVal(col.label); setSubPanel("rename"); })}

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
          </>
        )}
      </AnchoredDropdown>
    </div>
  );
}

// ─── Add customer row ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", assignee: ASSIGNEES[0], route: "" as CustomerRoute,
  settlement_amount: null as number | null, alba: "",
  total_amount: null as number | null, balance: null as number | null,
  custom_fields: {} as Record<string, boolean>,
  submit_date: "", status: "", memo: "", monthPageId: null as string | null,
};

function AddCustomerRow({ statuses, allCols, onSave, onCancel }: {
  statuses: StatusOption[];
  allCols: AnyCol[];
  onSave: (c: Omit<Customer, "id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
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
              <AssigneeCell value={form.assignee} onChange={(v) => set("assignee", v)} />
            </td>
          );
          if (col.id === "_route") return (
            <td key={col.id} className="px-3 py-2">
              <TagsCell value={form.route} onChange={(v) => set("route", v)} />
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
        // checkbox custom col
        return (
          <td key={col.id} className="px-3 py-2 text-center">
            <input type="checkbox" checked={form.custom_fields[col.id] ?? false}
              onChange={(e) => set("custom_fields", { ...form.custom_fields, [col.id]: e.target.checked })}
              className="w-4 h-4 accent-blue-500 cursor-pointer" />
          </td>
        );
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

function DataRow({ customer, statuses, allCols, onUpdate, onDelete, onMove }: {
  customer: Customer;
  statuses: StatusOption[];
  allCols: AnyCol[];
  onUpdate: (updates: Partial<Omit<Customer, "id" | "created_at">>) => void;
  onDelete: () => void;
  onMove: (targetMonthPageId: string | null) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  function handleDeleteClick() {
    if (confirmDelete) { onDelete(); }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
  }

  return (
    <tr className="border-t border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] group transition-colors">
      {allCols.map((col) => {
        const cellCls = "px-3 py-2";

        if (col.kind === "builtin") {
          if (col.id === "_name") return (
            <td key={col.id} className={`${cellCls} min-w-[120px]`}>
              <TextCell value={customer.name} onChange={(v) => onUpdate({ name: v })} placeholder="이름" />
            </td>
          );
          if (col.id === "_assignee") return (
            <td key={col.id} className={`${cellCls} min-w-[90px]`}>
              <AssigneeCell value={customer.assignee} onChange={(v) => onUpdate({ assignee: v })} />
            </td>
          );
          if (col.id === "_route") return (
            <td key={col.id} className={`${cellCls} min-w-[80px]`}>
              <TagsCell value={customer.route} onChange={(v) => onUpdate({ route: v })} />
            </td>
          );
          if (col.id === "_alba") return (
            <td key={col.id} className={`${cellCls} min-w-[80px]`}>
              <TextCell value={customer.alba} onChange={(v) => onUpdate({ alba: v })} placeholder="알바" />
            </td>
          );
          if (col.id === "_settlement") return (
            <td key={col.id} className={`${cellCls} min-w-[90px]`}>
              <NumberCell value={customer.settlement_amount ?? null} onChange={(v) => onUpdate({ settlement_amount: v })} placeholder="0" />
            </td>
          );
          if (col.id === "_total") return (
            <td key={col.id} className={`${cellCls} min-w-[90px]`}>
              <NumberCell value={customer.total_amount} onChange={(v) => onUpdate({ total_amount: v })} placeholder="0" />
            </td>
          );
          if (col.id === "_balance") return (
            <td key={col.id} className={`${cellCls} min-w-[90px]`}>
              <NumberCell value={customer.balance} onChange={(v) => onUpdate({ balance: v })} placeholder="0" />
            </td>
          );
          if (col.id === "_submit_date") return (
            <td key={col.id} className={`${cellCls} min-w-[130px]`}>
              <input type="date" value={customer.submit_date ?? ""} onChange={(e) => onUpdate({ submit_date: e.target.value })}
                className="w-full bg-transparent outline-none text-sm cursor-pointer dark:text-[#e6e6e4] dark:color-scheme-dark" />
            </td>
          );
          if (col.id === "_status") return (
            <td key={col.id} className={`${cellCls} min-w-[130px]`}>
              <StatusCell value={customer.status} statuses={statuses} onChange={(v) => onUpdate({ status: v })} />
            </td>
          );
          if (col.id === "_memo") return (
            <td key={col.id} className={`${cellCls} min-w-[140px]`}>
              <TextCell value={customer.memo} onChange={(v) => onUpdate({ memo: v })} placeholder="메모" />
            </td>
          );
          // unknown builtin
          return <td key={col.id} className={cellCls} />;
        }

        // checkbox custom col
        return (
          <td key={col.id} className={`${cellCls} text-center`}>
            <BoolCell
              value={customer.custom_fields?.[col.id] ?? false}
              onChange={(v) => onUpdate({ custom_fields: { ...customer.custom_fields, [col.id]: v } })}
            />
          </td>
        );
      })}
      {/* Action cell */}
      <td className="px-3 py-2 min-w-[100px]">
        <div className="flex items-center gap-1.5">
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
    createCustomer, updateCustomer, deleteCustomer,
    upsertCustomColumn, deleteCustomColumn, reorderCustomColumns,
    crmColOrder, crmColLabels, crmHiddenCols,
    setCrmColOrder, setCrmColLabel, setCrmHiddenCols,
  } = useWorkspaceStore();

  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleUpdate = useCallback((id: string, updates: Partial<Omit<Customer, "id" | "created_at">>) => {
    updateCustomer(id, updates);
  }, [updateCustomer]);

  // ─── Filters & sort ───────────────────────────────────────────────────────
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string> | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string> | null>(null);
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
        };
      })
      .filter((c): c is AnyCol => c !== null);
  }, [crmColOrder, crmColLabels, crmHiddenCols, sortedCustomCols, setCrmColOrder]);

  // Move a column left or right in the unified order
  const moveCol = useCallback((colId: string, direction: "left" | "right") => {
    const ids = allCols.map((c) => c.id);
    const idx = ids.indexOf(colId);
    if (idx === -1) return;
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= ids.length) return;
    const newIds = [...ids];
    [newIds[idx], newIds[newIdx]] = [newIds[newIdx], newIds[idx]];
    // Persist unified order
    setCrmColOrder(newIds);
    // Also update customColumns order field
    const customOrder = newIds.filter((id) => !BUILTIN_BY_ID[id]);
    reorderCustomColumns(customOrder);
  }, [allCols, setCrmColOrder, reorderCustomColumns]);

  // Rename a column
  const renameCol = useCallback((colId: string, label: string) => {
    setCrmColLabel(colId, label);
    // For custom cols, also update the colDef label in store
    const col = sortedCustomCols.find((c) => c.id === colId);
    if (col) upsertCustomColumn({ ...col, label });
  }, [setCrmColLabel, sortedCustomCols, upsertCustomColumn]);

  // Delete / hide a column
  const deleteCol = useCallback((col: AnyCol) => {
    if (col.kind === "builtin") {
      setCrmHiddenCols([...crmHiddenCols, col.id]);
      // Also remove from colOrder
      if (crmColOrder) setCrmColOrder(crmColOrder.filter((id) => id !== col.id));
    } else {
      deleteCustomColumn(col.id);
      if (crmColOrder) setCrmColOrder(crmColOrder.filter((id) => id !== col.id));
    }
  }, [crmHiddenCols, crmColOrder, setCrmHiddenCols, setCrmColOrder, deleteCustomColumn]);

  // Insert a new custom column to the left or right of a given column
  const insertCol = useCallback((atColId: string, side: "left" | "right") => {
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
  }, [crmColOrder, sortedCustomCols, upsertCustomColumn, setCrmColOrder]);

  // Add a new custom column (inserted at the end before _submit_date)
  const addColumn = useCallback(() => {
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
  }, [crmColOrder, sortedCustomCols, upsertCustomColumn, setCrmColOrder]);

  // ─── Customers visible in this month scope ────────────────────────────────
  const monthScoped = monthPageId ? customers.filter((c) => c.monthPageId === monthPageId) : customers;

  const distinctAssignees = useMemo(() =>
    Array.from(new Set(monthScoped.map((c) => c.assignee).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko")),
    [monthScoped]);

  let visibleCustomers = monthScoped;
  if (assigneeFilter !== null) visibleCustomers = visibleCustomers.filter((c) => assigneeFilter.has(c.assignee));
  if (statusFilter !== null) visibleCustomers = visibleCustomers.filter((c) => statusFilter.has(c.status ?? ""));

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
    createCustomer({ ...data, monthPageId: monthPageId ?? null });
    setShowAddForm(false);
  };

  const header = (
    <div className={`flex items-center justify-between border-b border-[#e9e9e7] dark:border-[#2f2f2f] ${embedded ? "px-4 py-3" : "px-6 py-4"}`}>
      <div>
        {!embedded && <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">고객 관리</h1>}
        <div className="flex items-center gap-3 text-sm text-[#9b9a97] dark:text-[#6b6b6b]">
          <span>총 {visibleCustomers.length}명</span>
          {totalRevenue > 0 && <><span>·</span><span className="font-semibold text-blue-500">매출 {formatWon(totalRevenue)}</span></>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          <Plus size={15} /> 고객 추가
        </button>
      </div>
    </div>
  );

  const table = (
    <div className={embedded ? "overflow-x-auto" : "flex-1 overflow-auto"}>
      <table className="w-full border-collapse text-[#37352f] dark:text-[#e6e6e4] text-sm">
        <thead className="sticky top-0 bg-[#f7f6f3] dark:bg-[#252525] z-10">
          <tr>
            {allCols.map((col, idx) => (
              <th key={col.id} className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap">
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
                  onRename={(label) => renameCol(col.id, label)}
                  onDelete={() => deleteCol(col)}
                  onEditStatus={() => setShowStatusEditor(true)}
                  isFirst={idx === 0}
                  isLast={idx === allCols.length - 1}
                />
              </th>
            ))}
            {/* + add column */}
            <th className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap">
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
              onDelete={() => deleteCustomer(c.id)}
              onMove={(targetMonthPageId) => handleUpdate(c.id, { monthPageId: targetMonthPageId })}
            />
          ))}
          {showAddForm ? (
            <AddCustomerRow statuses={customerStatuses} allCols={allCols} onSave={handleCreateCustomer} onCancel={() => setShowAddForm(false)} />
          ) : (
            <AddTriggerRow onAdd={() => setShowAddForm(true)} colSpan={totalColSpan} />
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#e9e9e7] dark:border-[#3f3f3f] bg-[#f7f6f3] dark:bg-[#232323] font-semibold sticky bottom-0">
            {allCols.map((col, idx) => {
              if (idx === 0) return <td key={col.id} className="px-3 py-2 text-xs text-[#9b9a97] dark:text-[#6b6b6b]">합계</td>;
              if (col.id === "_settlement") return <td key={col.id} className="px-3 py-2 text-sm text-right">{formatWon(settlementTotal)}</td>;
              if (col.id === "_total") return <td key={col.id} className="px-3 py-2 text-sm text-right">{formatWon(totalRevenue)}</td>;
              if (col.id === "_balance") return <td key={col.id} className="px-3 py-2 text-sm text-right">{formatWon(balanceTotal)}</td>;
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
    </>
  );
}
