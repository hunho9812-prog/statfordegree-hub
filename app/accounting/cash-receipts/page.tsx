"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Check, X,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Filter, Search, RefreshCw, Pencil, CheckSquare, Square, ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useCashReceipts } from "@/hooks/useCashReceipts";
import { type CashReceipt } from "@/lib/db-cash-receipts";
import { useWorkspaceStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// ── Column config ─────────────────────────────────────────────────────────────

const COL_IDS = ["customer_name", "assignee", "phone", "amount", "issued"] as const;
type ColId = typeof COL_IDS[number];

const DEFAULT_LABELS: Record<ColId, string> = {
  customer_name: "고객 이름",
  assignee: "담당자",
  phone: "번호",
  amount: "비용",
  issued: "발급완료",
};

const LABEL_STORAGE_KEY = "cash_receipts_col_labels_v1";
function loadColLabels(): Record<ColId, string> {
  if (typeof window === "undefined") return DEFAULT_LABELS;
  try {
    const raw = localStorage.getItem(LABEL_STORAGE_KEY);
    if (raw) return { ...DEFAULT_LABELS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_LABELS;
}

// ── Month helpers ─────────────────────────────────────────────────────────────

function getYM(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function shiftYM(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getYM(d);
}
function fmtYM(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${y}년 ${m}월`;
}

// ── Filter types ──────────────────────────────────────────────────────────────

type ColFilterMulti = { kind: "multiselect"; selected: string[] };
type ColFilterText  = { kind: "text"; value: string };
type ColFilterBool  = { kind: "bool"; value: true | false | null };
type ColFilter = ColFilterMulti | ColFilterText | ColFilterBool;

type SortDir = "asc" | "desc";

function fmt(v: number) {
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

function getVal(row: CashReceipt, colId: ColId): string {
  if (colId === "customer_name") return row.customer_name;
  if (colId === "assignee")      return row.assignee;
  if (colId === "phone")         return row.phone;
  if (colId === "amount")        return String(row.amount);
  if (colId === "issued")        return row.issued ? "발급완료" : "미발급";
  return "";
}

// ── CustomerPicker ─────────────────────────────────────────────────────────────

function CustomerPicker({
  value, onChange, onSelect, customers,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (name: string, assignee: string, id: string, amount: number) => void;
  customers: { id: string; name: string; assignee: string; total_amount: number }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    value.trim()
      ? customers.filter((c) => c.name.includes(value.trim())).slice(0, 8)
      : customers.slice(0, 8),
    [customers, value]
  );

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="고객 이름 입력 또는 검색"
        className="w-full px-2 py-1 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl w-72 overflow-hidden">
          <div className="py-1 max-h-52 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.name, c.assignee, c.id, c.total_amount); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] text-left gap-2"
              >
                <span className="font-medium text-[#37352f] dark:text-[#e6e6e4] truncate">{c.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs text-[#9b9a97]">
                  <span>{c.assignee}</span>
                  {c.total_amount > 0 && <span>{fmt(c.total_amount)}</span>}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-[#e9e9e7] dark:border-[#3f3f3f] px-3 py-1.5">
            <p className="text-[10px] text-[#9b9a97]">선택 시 담당자·비용 자동 입력</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

function FilterChipMulti({ label, values, filter, onChange, onRemove }: {
  label: string; values: string[]; filter: ColFilterMulti;
  onChange: (f: ColFilterMulti) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const vis = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
          filter.selected.length < values.length
            ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300"
            : "bg-[#f7f6f3] dark:bg-[#2f2f2f] border-[#e9e9e7] dark:border-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4]"
        )}>
        <Filter size={10} />{label}
        {filter.selected.length < values.length && <span className="ml-0.5">({filter.selected.length})</span>}
        <X size={10} className="ml-0.5 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onRemove(); }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl w-52 overflow-hidden">
          <div className="p-2 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <div className="flex items-center gap-1.5 px-2 py-1 border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg">
              <Search size={11} className="text-[#9b9a97]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색…"
                className="flex-1 bg-transparent text-xs outline-none text-[#37352f] dark:text-[#e6e6e4]" />
            </div>
          </div>
          <div className="flex gap-1 px-2 pt-1.5">
            <button onClick={() => onChange({ kind: "multiselect", selected: [...values] })} className="text-[10px] text-blue-500 hover:underline">전체</button>
            <span className="text-[#9b9a97] text-[10px]">·</span>
            <button onClick={() => onChange({ kind: "multiselect", selected: [] })} className="text-[10px] text-[#9b9a97] hover:underline">해제</button>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {vis.map((v) => {
              const checked = filter.selected.includes(v);
              return (
                <button key={v} onClick={() => onChange({ kind: "multiselect", selected: checked ? filter.selected.filter((s) => s !== v) : [...filter.selected, v] })}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]">
                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0", checked ? "bg-blue-500 border-blue-500" : "border-[#d0d0cc]")}>
                    {checked && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-xs text-[#37352f] dark:text-[#e6e6e4] truncate">{v}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChipText({ label, filter, onChange, onRemove }: {
  label: string; filter: ColFilterText; onChange: (f: ColFilterText) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
          filter.value ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300"
            : "bg-[#f7f6f3] dark:bg-[#2f2f2f] border-[#e9e9e7] dark:border-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4]"
        )}>
        <Filter size={10} />{label}{filter.value && <span className="ml-0.5">: {filter.value}</span>}
        <X size={10} className="ml-0.5 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onRemove(); }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl p-2 w-52">
          <div className="flex items-center gap-1.5 px-2 py-1 border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg">
            <Search size={11} className="text-[#9b9a97]" />
            <input autoFocus value={filter.value} onChange={(e) => onChange({ kind: "text", value: e.target.value })}
              placeholder={`${label} 검색…`} className="flex-1 bg-transparent text-xs outline-none text-[#37352f] dark:text-[#e6e6e4]" />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChipBool({ label, filter, onChange, onRemove }: {
  label: string; filter: ColFilterBool; onChange: (f: ColFilterBool) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const display = filter.value === true ? "발급완료" : filter.value === false ? "미발급" : null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
          filter.value !== null ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300"
            : "bg-[#f7f6f3] dark:bg-[#2f2f2f] border-[#e9e9e7] dark:border-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4]"
        )}>
        <Filter size={10} />{label}{display && <span className="ml-0.5">: {display}</span>}
        <X size={10} className="ml-0.5 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onRemove(); }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl overflow-hidden w-36">
          {([null, true, false] as const).map((v) => (
            <button key={String(v)} onClick={() => { onChange({ kind: "bool", value: v }); setOpen(false); }}
              className={cn("w-full px-3 py-2 text-xs text-left hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]",
                filter.value === v ? "text-blue-600 font-semibold" : "text-[#37352f] dark:text-[#e6e6e4]")}>
              {v === null ? "전체" : v ? "발급완료" : "미발급"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Column Header ─────────────────────────────────────────────────────────────

function ColHeader({ colId, label, sortDir, onSort, hasFilter, onAddFilter, onRename }: {
  colId: ColId; label: string; sortDir: SortDir | null;
  onSort: () => void; hasFilter: boolean; onAddFilter: () => void; onRename: (l: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(label);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const commit = () => { if (draft.trim()) onRename(draft.trim()); setRenaming(false); setMenuOpen(false); };
  if (renaming) return (
    <div className="flex items-center gap-1">
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setRenaming(false); setDraft(label); } }}
        className="px-1.5 py-0.5 text-xs border border-blue-400 rounded bg-white dark:bg-[#2f2f2f] outline-none text-[#37352f] dark:text-[#e6e6e4] w-24" />
      <button onClick={commit} className="text-blue-500"><Check size={12} /></button>
      <button onClick={() => { setRenaming(false); setDraft(label); }} className="text-[#9b9a97]"><X size={12} /></button>
    </div>
  );
  return (
    <div className="relative flex items-center gap-1 group" ref={menuRef}>
      <button onClick={() => setMenuOpen((v) => !v)}
        className={cn("flex items-center gap-1 text-xs font-semibold transition-colors",
          hasFilter ? "text-blue-600 dark:text-blue-400" : "text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"
        )}>
        {hasFilter && <Filter size={10} />}
        {label}
        {sortDir === "asc" ? <ChevronUp size={11} /> : sortDir === "desc" ? <ChevronDown size={11} /> : <ChevronsUpDown size={11} className="opacity-0 group-hover:opacity-100" />}
      </button>
      {menuOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl overflow-hidden w-40 py-1">
          <button onClick={() => { onSort(); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4]">
            <ChevronUp size={12} /> 오름차순
          </button>
          <button onClick={() => { onSort(); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4]">
            <ChevronDown size={12} /> 내림차순
          </button>
          <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
          <button onClick={() => { onAddFilter(); setMenuOpen(false); }}
            className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]",
              hasFilter ? "text-blue-500" : "text-[#37352f] dark:text-[#e6e6e4]")}>
            <Filter size={11} /> {hasFilter ? "필터 적용됨" : "필터"}
          </button>
          <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
          <button onClick={() => { setDraft(label); setRenaming(true); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4]">
            <Pencil size={11} /> 열 이름 변경
          </button>
        </div>
      )}
    </div>
  );
}

// ── Grid layout ───────────────────────────────────────────────────────────────
// drag | 이름 | 담당자 | 번호 | 비용 | 발급 | actions
const GRID = "grid-cols-[20px_1fr_1fr_1fr_1fr_1fr_60px]";

// ── Empty row ─────────────────────────────────────────────────────────────────

const EMPTY_ROW = (month: string): Omit<CashReceipt, "id" | "display_order"> => ({
  month, customer_id: null, customer_name: "", assignee: "", phone: "", amount: 0, issued: false,
});

// ── Main ──────────────────────────────────────────────────────────────────────

function CashReceiptsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { rows, loading, reload, upsert, remove, reorder } = useCashReceipts();
  const customers = useWorkspaceStore((s) => s.customers);
  const pages = useWorkspaceStore((s) => s.pages);

  // Month: ?month=YYYY-MM 쿼리 파라미터 우선 사용
  const [month, setMonth] = useState(() => {
    const qm = searchParams.get("month");
    if (qm && /^\d{4}-\d{2}$/.test(qm)) return qm;
    return getYM();
  });

  // Column labels
  const [colLabels, setColLabels] = useState<Record<ColId, string>>(DEFAULT_LABELS);
  useEffect(() => { setColLabels(loadColLabels()); }, []);
  const renameCol = (colId: ColId, label: string) => {
    setColLabels((prev) => {
      const next = { ...prev, [colId]: label };
      localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Sort
  const [sort, setSort] = useState<{ colId: ColId; dir: SortDir } | null>(null);
  const cycleSort = (colId: ColId) => {
    setSort((prev) => {
      if (!prev || prev.colId !== colId) return { colId, dir: "asc" };
      if (prev.dir === "asc") return { colId, dir: "desc" };
      return null;
    });
  };

  // Filters
  const [filters, setFilters] = useState<Partial<Record<ColId, ColFilter>>>({});
  const monthRows = useMemo(() => rows.filter((r) => r.month === month), [rows, month]);
  const addFilter = useCallback((colId: ColId) => {
    if (filters[colId]) return;
    if (colId === "issued") { setFilters((p) => ({ ...p, [colId]: { kind: "bool", value: null } as ColFilterBool })); return; }
    if (colId === "customer_name" || colId === "assignee") {
      const vals = Array.from(new Set(monthRows.map((r) => getVal(r, colId)).filter(Boolean)));
      setFilters((p) => ({ ...p, [colId]: { kind: "multiselect", selected: vals } as ColFilterMulti }));
      return;
    }
    setFilters((p) => ({ ...p, [colId]: { kind: "text", value: "" } as ColFilterText }));
  }, [filters, monthRows]);
  const removeFilter = (colId: ColId) => setFilters((p) => { const n = { ...p }; delete n[colId]; return n; });
  const updateFilter = (colId: ColId, f: ColFilter) => setFilters((p) => ({ ...p, [colId]: f }));

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<CashReceipt, "id" | "display_order">>(EMPTY_ROW(month));

  // Add
  const [addDraft, setAddDraft] = useState<Omit<CashReceipt, "id" | "display_order">>(EMPTY_ROW(month));
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // Drag
  const dragIdx = useRef<number | null>(null);

  // 현재 월에 해당하는 실제 CRM 월 페이지 ID 탐색
  const crmMonthPageId = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    // 1) 결정론적 ID 먼저 확인 (crm-month-YYYY-MM)
    const deterministicId = `crm-month-${y}-${String(m).padStart(2, "0")}`;
    if (pages[deterministicId]) return deterministicId;
    // 2) store의 페이지 트리에서 연도·월 타이틀로 탐색
    const yearPage = Object.values(pages).find((p) =>
      p.title.startsWith(`${y}년`) && !p.parentId
    ) ?? Object.values(pages).find((p) => new RegExp(`^${y}년`).test(p.title));
    if (!yearPage) return null;
    const monthPage = yearPage.children
      .map((id) => pages[id])
      .find((p) => p && new RegExp(`^${m}월$`).test(p.title));
    return monthPage?.id ?? null;
  }, [month, pages]);

  // CRM customers: name → assignee + total_amount 연동
  const crmCustomers = useMemo(() =>
    customers.map((c) => ({
      id: c.id,
      name: c.name,
      assignee: c.assignee ?? "",
      total_amount: c.total_amount ?? 0,
    })),
    [customers]
  );

  // Months that have data (for sidebar dots)
  const monthsWithData = useMemo(() => new Set(rows.map((r) => r.month)), [rows]);

  // Visible rows (current month → filter → sort)
  const visibleRows = useMemo(() => {
    let result = [...monthRows];
    for (const [colId, filt] of Object.entries(filters) as [ColId, ColFilter][]) {
      if (!filt) continue;
      if (filt.kind === "multiselect") {
        if (filt.selected.length > 0) result = result.filter((r) => filt.selected.includes(getVal(r, colId)));
      } else if (filt.kind === "text") {
        if (filt.value.trim()) result = result.filter((r) => getVal(r, colId).toLowerCase().includes(filt.value.toLowerCase()));
      } else if (filt.kind === "bool") {
        if (filt.value !== null) result = result.filter((r) => r.issued === filt.value);
      }
    }
    if (sort) {
      result.sort((a, b) => {
        const cmp = sort.colId === "amount" ? a.amount - b.amount : getVal(a, sort.colId).localeCompare(getVal(b, sort.colId), "ko");
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [monthRows, filters, sort]);

  // When month changes, update add form month and reset adding
  useEffect(() => {
    setAdding(false);
    setAddDraft(EMPTY_ROW(month));
    setFilters({});
  }, [month]);

  const handleAdd = async () => {
    if (!addDraft.customer_name.trim()) return;
    setSubmitting(true);
    const result = await upsert({ ...addDraft, month, id: uuidv4(), display_order: monthRows.length });
    setSubmitting(false);
    if (result.success) { setAddDraft(EMPTY_ROW(month)); setAdding(false); showToast("success", "추가됐습니다."); }
    else showToast("error", result.error ?? "추가 실패");
  };

  const startEdit = (row: CashReceipt) => {
    setEditId(row.id);
    setEditDraft({ month: row.month, customer_id: row.customer_id, customer_name: row.customer_name, assignee: row.assignee, phone: row.phone, amount: row.amount, issued: row.issued });
  };

  const saveEdit = async (row: CashReceipt) => {
    const result = await upsert({ ...editDraft, id: row.id, display_order: row.display_order });
    if (result.success) { setEditId(null); showToast("success", "수정됐습니다."); }
    else showToast("error", result.error ?? "수정 실패");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const result = await remove(deleteId);
    setDeleting(false); setDeleteId(null);
    if (result.success) showToast("success", "삭제됐습니다.");
    else showToast("error", result.error ?? "삭제 실패");
  };

  const onDragStart = (idx: number) => { dragIdx.current = idx; };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    const next = [...visibleRows];
    const [item] = next.splice(from, 1);
    next.splice(idx, 0, item);
    dragIdx.current = idx;
    reorder(next.map((r, i) => ({ ...r, display_order: i })));
  };

  const hasActiveFilter = Object.keys(filters).length > 0;
  const issuedCount = visibleRows.filter((r) => r.issued).length;
  const totalAmount = visibleRows.reduce((s, r) => s + r.amount, 0);

  // Build month list: last 6 months + months with data
  const monthList = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.add(getYM(d));
    }
    monthsWithData.forEach((m) => months.add(m));
    return Array.from(months).sort();
  }, [monthsWithData]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919] min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold",
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
          {toast.type === "success" ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/accounting")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
              <ArrowLeft size={14} /> 회계
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">현금영수증</h1>
          </div>
          <button onClick={() => reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex gap-5">
          {/* Month sidebar */}
          <div className="w-36 flex-shrink-0">
            <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
                <span className="text-xs font-bold text-[#37352f] dark:text-[#e6e6e4]">월별 보기</span>
              </div>
              <div className="py-1">
                {monthList.map((m) => {
                  const [y, mo] = m.split("-").map(Number);
                  const hasData = monthsWithData.has(m);
                  return (
                    <button key={m} onClick={() => setMonth(m)}
                      className={cn("w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                        month === m
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-[#37352f] dark:text-[#e6e6e4] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]"
                      )}>
                      <span>{y}년 {mo}월</span>
                      {hasData && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", month === m ? "bg-blue-400" : "bg-emerald-400")} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Month title + stats */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setMonth(shiftYM(month, -1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#9b9a97] hover:text-blue-500 hover:border-blue-400 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-base font-bold text-[#37352f] dark:text-[#e6e6e4]">{fmtYM(month)}</span>
                <button onClick={() => setMonth(shiftYM(month, 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#9b9a97] hover:text-blue-500 hover:border-blue-400 transition-colors">
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setAdding(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                  <Plus size={13} /> 추가
                </button>
                {crmMonthPageId && (
                  <button
                    onClick={() => router.push(`/p/${crmMonthPageId}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] bg-white dark:bg-[#252525] text-[#9b9a97] hover:text-blue-500 hover:border-blue-400 transition-colors">
                    <Users size={13} /> 고객관리
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#9b9a97]">
                <span>총 {visibleRows.length}건</span>
                <span>발급완료 {issuedCount}건</span>
                {totalAmount > 0 && <span className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">{fmt(totalAmount)}</span>}
              </div>
            </div>

            {/* Filter bar */}
            {hasActiveFilter && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {(Object.entries(filters) as [ColId, ColFilter][]).map(([colId, filt]) => {
                  const label = colLabels[colId];
                  if (filt.kind === "multiselect") {
                    const vals: string[] = Array.from(new Set(monthRows.map((r) => getVal(r, colId)).filter(Boolean)));
                    return <FilterChipMulti key={colId} label={label} values={vals} filter={filt} onChange={(f) => updateFilter(colId, f)} onRemove={() => removeFilter(colId)} />;
                  }
                  if (filt.kind === "bool") return <FilterChipBool key={colId} label={label} filter={filt} onChange={(f) => updateFilter(colId, f)} onRemove={() => removeFilter(colId)} />;
                  return <FilterChipText key={colId} label={label} filter={filt} onChange={(f) => updateFilter(colId, f)} onRemove={() => removeFilter(colId)} />;
                })}
                <button onClick={() => setFilters({})}
                  className="px-2.5 py-1 text-xs rounded-full border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-red-500 hover:border-red-400 transition-colors">
                  전체 초기화
                </button>
              </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
              {/* Header */}
              <div className={`grid ${GRID} gap-2 items-center px-3 py-2 border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#2a2a2a]`}>
                <div />
                {COL_IDS.map((colId) => (
                  <ColHeader key={colId} colId={colId} label={colLabels[colId]}
                    sortDir={sort?.colId === colId ? sort.dir : null}
                    onSort={() => cycleSort(colId)}
                    hasFilter={!!filters[colId]}
                    onAddFilter={() => addFilter(colId)}
                    onRename={(l) => renameCol(colId, l)}
                  />
                ))}
                <div />
              </div>

              {/* Add row */}
              {adding && (
                <div className={`grid ${GRID} gap-2 items-center px-3 py-2 border-b border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10`}>
                  <div />
                  <CustomerPicker value={addDraft.customer_name}
                    onChange={(v) => setAddDraft((p) => ({ ...p, customer_name: v }))}
                    onSelect={(name, assignee, id, total_amount) =>
                      setAddDraft((p) => ({ ...p, customer_name: name, assignee, customer_id: id, amount: total_amount || p.amount }))}
                    customers={crmCustomers}
                  />
                  <input value={addDraft.assignee} onChange={(e) => setAddDraft((p) => ({ ...p, assignee: e.target.value }))}
                    placeholder="담당자"
                    className="px-2 py-1 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400" />
                  <input value={addDraft.phone} onChange={(e) => setAddDraft((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="번호"
                    className="px-2 py-1 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400" />
                  <input type="number" value={addDraft.amount || ""} onChange={(e) => setAddDraft((p) => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
                    placeholder="비용"
                    className="px-2 py-1 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400" />
                  <button onClick={() => setAddDraft((p) => ({ ...p, issued: !p.issued }))}>
                    {addDraft.issued ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} className="text-[#9b9a97]" />}
                  </button>
                  <div className="flex gap-1">
                    <button onClick={handleAdd} disabled={submitting || !addDraft.customer_name.trim()}
                      className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"><Check size={12} /></button>
                    <button onClick={() => { setAdding(false); setAddDraft(EMPTY_ROW(month)); }}
                      className="p-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97]"><X size={12} /></button>
                  </div>
                </div>
              )}

              {/* Rows */}
              {loading ? (
                <div className="px-5 py-10 text-center text-sm text-[#9b9a97]">불러오는 중…</div>
              ) : visibleRows.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-[#9b9a97]">
                  {monthRows.length === 0 ? `${fmtYM(month)} 데이터가 없습니다.` : "필터 조건에 맞는 항목이 없습니다."}
                </div>
              ) : (
                visibleRows.map((row, idx) => (
                  <div key={row.id}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={(e) => onDragOver(e, idx)}
                    onDragEnd={() => { dragIdx.current = null; }}
                    onDoubleClick={() => { if (editId !== row.id) startEdit(row); }}
                    className={cn(
                      `group grid ${GRID} gap-2 items-center px-3 py-2 border-b border-[#e9e9e7] dark:border-[#2f2f2f] last:border-0 transition-colors cursor-pointer`,
                      editId === row.id ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-[#f7f6f3] dark:hover:bg-[#2a2a2a]"
                    )}
                  >
                    <div className="text-[#9b9a97] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                      <GripVertical size={13} />
                    </div>

                    {editId === row.id ? (
                      <>
                        <CustomerPicker value={editDraft.customer_name}
                          onChange={(v) => setEditDraft((p) => ({ ...p, customer_name: v }))}
                          onSelect={(name, assignee, id, total_amount) =>
                            setEditDraft((p) => ({ ...p, customer_name: name, assignee, customer_id: id, amount: total_amount || p.amount }))}
                          customers={crmCustomers}
                        />
                        <input value={editDraft.assignee} onChange={(e) => setEditDraft((p) => ({ ...p, assignee: e.target.value }))}
                          className="px-2 py-1 text-sm border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] outline-none text-[#37352f] dark:text-[#e6e6e4]" />
                        <input value={editDraft.phone} onChange={(e) => setEditDraft((p) => ({ ...p, phone: e.target.value }))}
                          className="px-2 py-1 text-sm border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] outline-none text-[#37352f] dark:text-[#e6e6e4]" />
                        <input type="number" value={editDraft.amount || ""}
                          onChange={(e) => setEditDraft((p) => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
                          className="px-2 py-1 text-sm border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] outline-none text-[#37352f] dark:text-[#e6e6e4]" />
                        <button onClick={() => setEditDraft((p) => ({ ...p, issued: !p.issued }))}>
                          {editDraft.issued ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} className="text-[#9b9a97]" />}
                        </button>
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(row)} className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"><Check size={12} /></button>
                          <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97]"><X size={12} /></button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4] truncate">{row.customer_name || "—"}</span>
                        <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">{row.assignee || "—"}</span>
                        <span className="text-sm text-[#37352f] dark:text-[#e6e6e4] truncate">{row.phone || "—"}</span>
                        <span className="text-sm text-[#37352f] dark:text-[#e6e6e4]">{row.amount ? fmt(row.amount) : "—"}</span>
                        <div>
                          {row.issued
                            ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckSquare size={13} />완료</span>
                            : <span className="flex items-center gap-1 text-xs text-[#9b9a97]"><Square size={13} />미발급</span>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button onClick={(e) => { e.stopPropagation(); startEdit(row); }}
                            className="p-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-blue-500 hover:border-blue-400 transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}
                            className="p-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-red-500 hover:border-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}

              {/* Footer */}
              {visibleRows.length > 0 && (
                <div className={`grid ${GRID} gap-2 items-center px-3 py-2 border-t border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#2a2a2a]`}>
                  <div /><div /><div /><div />
                  <span className="text-xs font-bold text-[#37352f] dark:text-[#e6e6e4]">{fmt(totalAmount)}</span>
                  <span className="text-xs text-[#9b9a97]">{issuedCount}/{visibleRows.length}</span>
                  <div />
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-[#9b9a97]">행 더블클릭 또는 ✏️ 아이콘으로 수정 · 드래그로 순서 변경</p>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-xl p-6 w-80 mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500"><Trash2 size={16} /></div>
              <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">항목 삭제</h2>
            </div>
            <p className="text-sm text-[#9b9a97] mb-5">
              <span className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">{rows.find((r) => r.id === deleteId)?.customer_name}</span> 항목을 삭제할까요?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]">취소</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50">
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CashReceiptsPage() {
  return (
    <Suspense>
      <CashReceiptsInner />
    </Suspense>
  );
}
