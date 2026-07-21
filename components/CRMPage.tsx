"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/lib/store";
import type { Customer, CustomerRoute, StatusOption, StatusCategory, CustomColumnDef } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import {
  Plus, Trash2, Settings, X, Check, GripVertical, ArrowRightLeft,
  Filter, ChevronUp, ChevronDown, RefreshCw, Save, Pencil,
} from "lucide-react";

const ASSIGNEES = ["김은호", "김세윤", "김현호", "오승준"];

// ─── Notion-스러운 색상 프리셋: 담당자 아바타 / Tags 배지 ──────────────────────
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

// ─── 스크롤 컨테이너에 잘리지 않도록 document.body에 포털로 띄우는 드롭다운 ──
// 트리거 버튼 기준으로 위/아래 중 공간이 넉넉한 쪽에 고정 위치로 렌더링한다.
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
    const desiredMaxH = 288; // max-h-72 상당
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
      ) {
        onClose();
      }
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

// ─── 담당자 아바타 뱃지 + 드롭다운 ────────────────────────────────────────────

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
          <button
            key={a}
            onClick={() => { onChange(a); setOpen(false); }}
            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
          >
            <AssigneeAvatar name={a} />
            <span className="text-[#37352f] dark:text-[#e6e6e4]">{a}</span>
          </button>
        ))}
      </AnchoredDropdown>
    </>
  );
}

// ─── Tags(크몽/메일) 배지 + 드롭다운 ──────────────────────────────────────────

function TagsCell({ value, onChange }: { value: CustomerRoute; onChange: (v: CustomerRoute) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const style = value ? ROUTE_STYLES[value] : null;

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} className="text-left">
        {style ? (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {value}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </button>
      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={120}>
        <button
          onClick={() => { onChange(""); setOpen(false); }}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
        >
          —
        </button>
        {(["크몽", "메일"] as CustomerRoute[]).map((r) => (
          <button
            key={r}
            onClick={() => { onChange(r); setOpen(false); }}
            className="w-full text-left px-3 py-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
          >
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: ROUTE_STYLES[r].bg, color: ROUTE_STYLES[r].text }}
            >
              {r}
            </span>
          </button>
        ))}
      </AnchoredDropdown>
    </>
  );
}

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
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = statuses.find((s) => s.label === value);

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-1.5 text-left">
        {current ? (
          <>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: current.textColor }} />
            <span className="text-xs text-[#37352f] dark:text-[#e6e6e4] truncate">{current.label}</span>
          </>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </button>

      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={176}>
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
                  className="w-full flex items-center gap-1.5 text-left px-3 py-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
                >
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

// ─── Notion-style unified column header with popup menu ──────────────────────

type SortDir = "asc" | "desc" | null;
type ColKind = "fixed" | "custom" | "status";

interface ColumnHeaderProps {
  label: string;
  kind: ColKind;
  field: string;
  sortField: string | null;
  sortDir: SortDir;
  onSort: (field: string, dir: "asc" | "desc" | null) => void;
  // Assignee filter (field === "assignee" only)
  assignees?: string[];
  assigneeFilter?: Set<string> | null;
  onAssigneeFilter?: (next: Set<string> | null) => void;
  // Status filter (kind === "status" only)
  allStatuses?: StatusOption[];
  statusFilter?: Set<string> | null;
  onStatusFilter?: (next: Set<string> | null) => void;
  // Custom column ops
  onInsertLeft?: () => void;
  onInsertRight?: () => void;
  onRename?: (label: string) => void;
  onDelete?: () => void;
  // Status editor
  onEditStatus?: () => void;
}

function ColumnHeader({
  label, kind, field,
  sortField, sortDir, onSort,
  assignees, assigneeFilter, onAssigneeFilter,
  allStatuses, statusFilter, onStatusFilter,
  onInsertLeft, onInsertRight, onRename, onDelete,
  onEditStatus,
}: ColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"filter" | "rename" | null>(null);
  const [renameVal, setRenameVal] = useState(label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isActiveSort = sortField === field;
  const activeSortDir = isActiveSort ? sortDir : null;

  const hasAssigneeFilter =
    field === "assignee" && assigneeFilter !== null && assigneeFilter !== undefined &&
    assignees !== undefined && assigneeFilter.size < assignees.length;
  const hasStatusFilter =
    kind === "status" && statusFilter !== null && statusFilter !== undefined &&
    allStatuses !== undefined && statusFilter.size < allStatuses.length;
  const isFiltered = hasAssigneeFilter || hasStatusFilter;

  const close = () => { setOpen(false); setSubPanel(null); setConfirmDelete(false); };

  const menuItem = (content: React.ReactNode, onClick?: () => void, extra?: string) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#3a3a3a] ${extra ?? ""}`}
    >
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
        {label}
        {isActiveSort && activeSortDir === "asc" && <ChevronUp size={11} />}
        {isActiveSort && activeSortDir === "desc" && <ChevronDown size={11} />}
        {isFiltered && !isActiveSort && <Filter size={10} fill="currentColor" className="ml-0.5" />}
      </button>

      <AnchoredDropdown open={open} anchorRef={btnRef} onClose={close} width={210}>
        {/* ── Delete confirmation ── */}
        {confirmDelete && (
          <div className="p-3">
            <p className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-1">열 삭제</p>
            <p className="text-[11px] text-gray-400 mb-3">
              &quot;{label}&quot; 열을 삭제하면 모든 고객의 체크 데이터가 사라집니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1 text-xs rounded border border-[#e9e9e7] dark:border-[#3f3f3f] text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
              >취소</button>
              <button
                onClick={() => { onDelete?.(); close(); }}
                className="flex-1 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
              >삭제</button>
            </div>
          </div>
        )}

        {/* ── Rename sub-panel ── */}
        {!confirmDelete && subPanel === "rename" && (
          <div className="p-3">
            <p className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-2">열 이름 변경</p>
            <input
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameVal.trim()) { onRename?.(renameVal.trim()); close(); }
                if (e.key === "Escape") setSubPanel(null);
              }}
              autoFocus
              className="input-style w-full text-xs mb-2"
            />
            <div className="flex gap-2">
              <button onClick={() => setSubPanel(null)} className="flex-1 py-1 text-xs rounded border border-[#e9e9e7] dark:border-[#3f3f3f] text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">취소</button>
              <button
                onClick={() => { if (renameVal.trim()) { onRename?.(renameVal.trim()); close(); } }}
                disabled={!renameVal.trim()}
                className="flex-1 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
              >확인</button>
            </div>
          </div>
        )}

        {/* ── Assignee filter sub-panel ── */}
        {!confirmDelete && subPanel === "filter" && field === "assignee" && (
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
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const base = assigneeFilter ?? new Set(assignees);
                      const next = new Set(base);
                      if (next.has(a)) next.delete(a); else next.add(a);
                      onAssigneeFilter?.(next);
                    }}
                    className="w-3.5 h-3.5 accent-blue-500"
                  />
                  <AssigneeAvatar name={a} />
                  <span className="text-[#37352f] dark:text-[#e6e6e4]">{a}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* ── Status filter sub-panel ── */}
        {!confirmDelete && subPanel === "filter" && kind === "status" && (
          <div className="p-2">
            <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
              <button onClick={() => onStatusFilter?.(null)} className="text-[10px] text-blue-500 hover:underline">전체 선택</button>
              <button onClick={() => onStatusFilter?.(new Set())} className="text-[10px] text-gray-400 hover:underline">선택 해제</button>
            </div>
            {(allStatuses ?? []).map((s) => {
              const checked = statusFilter == null ? true : statusFilter.has(s.label);
              return (
                <label key={s.id} className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3a3a3a] rounded font-normal">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const base = statusFilter ?? new Set(allStatuses?.map((x) => x.label));
                      const next = new Set(base);
                      if (next.has(s.label)) next.delete(s.label); else next.add(s.label);
                      onStatusFilter?.(next);
                    }}
                    className="w-3.5 h-3.5 accent-blue-500"
                  />
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.textColor }} />
                  <span className="text-[#37352f] dark:text-[#e6e6e4]">{s.label}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* ── Main menu ── */}
        {!confirmDelete && subPanel === null && (
          <>
            <div className="px-2 pt-2 pb-1">
              <p className="px-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">정렬</p>
              {menuItem(
                <><ChevronUp size={12} className="text-gray-400 flex-shrink-0" /><span>오름차순</span>{isActiveSort && activeSortDir === "asc" && <Check size={10} className="ml-auto text-blue-500" />}</>,
                () => { onSort(field, isActiveSort && activeSortDir === "asc" ? null : "asc"); close(); }
              )}
              {menuItem(
                <><ChevronDown size={12} className="text-gray-400 flex-shrink-0" /><span>내림차순</span>{isActiveSort && activeSortDir === "desc" && <Check size={10} className="ml-auto text-blue-500" />}</>,
                () => { onSort(field, isActiveSort && activeSortDir === "desc" ? null : "desc"); close(); }
              )}
            </div>

            {(field === "assignee" || kind === "status") && (
              <>
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {menuItem(
                  <><Filter size={12} className="text-gray-400 flex-shrink-0" /><span>필터</span>{isFiltered && <span className="ml-auto text-[10px] text-blue-500">적용됨</span>}</>,
                  () => setSubPanel("filter")
                )}
              </>
            )}

            <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
            <button className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs text-gray-300 dark:text-gray-600 cursor-default">
              <span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <span>그룹화</span><span className="ml-auto text-[10px]">준비 중</span>
            </button>
            <button className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs text-gray-300 dark:text-gray-600 cursor-default">
              <span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <span>고정</span><span className="ml-auto text-[10px]">준비 중</span>
            </button>

            {kind === "custom" && (
              <>
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {menuItem(<span>왼쪽에 삽입</span>, () => { onInsertLeft?.(); close(); })}
                {menuItem(<span>오른쪽에 삽입</span>, () => { onInsertRight?.(); close(); })}
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {menuItem(
                  <><Pencil size={12} className="text-gray-400 flex-shrink-0" /><span>속성 편집</span></>,
                  () => { setRenameVal(label); setSubPanel("rename"); }
                )}
                {menuItem(
                  <><Trash2 size={12} className="flex-shrink-0" /><span>속성 삭제</span></>,
                  () => setConfirmDelete(true),
                  "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                )}
              </>
            )}

            {kind === "status" && (
              <>
                <div className="h-px bg-[#e9e9e7] dark:bg-[#3f3f3f] mx-2 my-1" />
                {menuItem(
                  <><Settings size={12} className="text-gray-400 flex-shrink-0" /><span>Status 옵션 편집</span></>,
                  () => { onEditStatus?.(); close(); }
                )}
              </>
            )}
          </>
        )}
      </AnchoredDropdown>
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

// ─── Dynamic checkbox column manager ─────────────────────────────────────────

function ColumnManagerRow({
  column,
  onDragStart,
  onDragOver,
  onDrop,
  onRename,
  onDelete,
}: {
  column: CustomColumnDef;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(column.label);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const save = () => {
    const trimmed = label.trim();
    if (trimmed) onRename(trimmed);
    else setLabel(column.label);
    setEditing(false);
  };

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-[#2a2a2a] group mb-1"
      >
        <GripVertical size={12} className="text-gray-300 cursor-grab flex-shrink-0" />
        {editing ? (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setLabel(column.label); setEditing(false); }
            }}
            autoFocus
            className="input-style flex-1 py-0.5 text-xs"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className="flex-1 text-sm cursor-text text-[#37352f] dark:text-[#e6e6e4]"
          >
            {column.label}
          </span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          편집
        </button>
        <button
          onClick={() => setConfirmingDelete(true)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs mx-4 bg-white dark:bg-[#252525] rounded-xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl p-5">
            <h4 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4] mb-2">열 삭제</h4>
            <p className="text-xs text-[#9b9a97] dark:text-[#6b6b6b] mb-4">
              &quot;{column.label}&quot; 열을 삭제하면 모든 고객의 체크 데이터가 화면에서 사라집니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 py-1.5 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => { onDelete(); setConfirmingDelete(false); }}
                className="flex-1 py-1.5 text-xs rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ColumnManager({ onClose }: { onClose: () => void }) {
  const { customColumns, upsertCustomColumn, deleteCustomColumn, reorderCustomColumns } = useWorkspaceStore();
  const sorted = [...customColumns].sort((a, b) => a.order - b.order);
  const [newLabel, setNewLabel] = useState("");
  const dragId = useRef<string | null>(null);

  const addColumn = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    upsertCustomColumn({ id: uuidv4(), label: trimmed, type: "checkbox", order: sorted.length });
    setNewLabel("");
  };

  const handleDrop = (targetId: string) => {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    const ids = sorted.map((c) => c.id);
    const fromIdx = ids.indexOf(from);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, from);
    reorderCustomColumns(ids);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
          <h3 className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">열 관리 (체크박스 열)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {sorted.length === 0 && (
            <p className="text-xs text-gray-300 dark:text-gray-600 px-2">체크박스 열이 없습니다.</p>
          )}
          {sorted.map((col) => (
            <ColumnManagerRow
              key={col.id}
              column={col}
              onDragStart={() => { dragId.current = col.id; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
              onRename={(label) => upsertCustomColumn({ ...col, label })}
              onDelete={() => deleteCustomColumn(col.id)}
            />
          ))}
        </div>

        <div className="border-t border-[#e9e9e7] dark:border-[#3f3f3f] p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">새 체크박스 열 추가</p>
          <div className="flex gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addColumn()}
              placeholder="열 이름"
              className="input-style flex-1"
            />
            <button
              onClick={addColumn}
              disabled={!newLabel.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              <Plus size={14} /> 추가
            </button>
          </div>
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
  custom_fields: {} as Record<string, boolean>,
  submit_date: "",
  status: "",
  memo: "",
  monthPageId: null as string | null,
};

function AddCustomerRow({
  statuses,
  columns,
  onSave,
  onCancel,
}: {
  statuses: StatusOption[];
  columns: CustomColumnDef[];
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
        <AssigneeCell value={form.assignee} onChange={(v) => set("assignee", v)} />
      </td>
      {/* Tags */}
      <td className="px-3 py-2">
        <TagsCell value={form.route} onChange={(v) => set("route", v)} />
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
      {/* 동적 체크박스 열 */}
      {columns.map((col) => (
        <td key={col.id} className="px-3 py-2 text-center">
          <input
            type="checkbox"
            checked={form.custom_fields[col.id] ?? false}
            onChange={(e) =>
              set("custom_fields", { ...form.custom_fields, [col.id]: e.target.checked })
            }
            className="w-4 h-4 accent-blue-500 cursor-pointer"
          />
        </td>
      ))}
      {/* 제출날짜 */}
      <td className="px-3 py-2">
        <input
          type="date"
          value={form.submit_date}
          onChange={(e) => set("submit_date", e.target.value)}
          className="w-full bg-transparent outline-none text-sm cursor-pointer"
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

function AddTriggerRow({ onAdd, colSpan }: { onAdd: () => void; colSpan: number }) {
  return (
    <tr className="border-t border-[#e9e9e7] dark:border-[#2f2f2f]">
      <td colSpan={colSpan} className="px-3 py-2">
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

// ─── Move modal ───────────────────────────────────────────────────────────────

function MoveModal({
  currentMonthPageId,
  onMove,
  onClose,
}: {
  currentMonthPageId: string | null;
  onMove: (targetMonthPageId: string | null) => void;
  onClose: () => void;
}) {
  const { pages } = useWorkspaceStore();
  const [selected, setSelected] = useState<string | null>(null);

  // 연도 페이지 목록 (최신순)
  const yearPages = Object.values(pages)
    .filter((p) => /^(\d{4})년/.test(p.title))
    .sort((a, b) => {
      const ay = parseInt(a.title.match(/^(\d{4})/)?.[1] ?? "0");
      const by = parseInt(b.title.match(/^(\d{4})/)?.[1] ?? "0");
      return by - ay;
    });

  // 연도 하위 월 페이지
  const getMonths = (yearPageId: string) =>
    (pages[yearPageId]?.children ?? [])
      .map((id) => pages[id])
      .filter(Boolean)
      .filter((p) => /^\d{1,2}월$/.test(p.title))
      .sort((a, b) => parseInt(a.title) - parseInt(b.title));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xs mx-4 bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
          <h3 className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]">다른 달로 이동</h3>
          <button onClick={onClose} className="text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {yearPages.length === 0 && (
            <p className="px-5 py-4 text-sm text-[#9b9a97]">이동할 수 있는 달이 없습니다.</p>
          )}
          {yearPages.map((yearPage) => {
            const months = getMonths(yearPage.id);
            if (months.length === 0) return null;
            return (
              <div key={yearPage.id}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {yearPage.title.replace("고객관리양식", "").trim()}
                </p>
                {months.map((mp) => {
                  const isCurrent = mp.id === currentMonthPageId;
                  const isSelected = selected === mp.id;
                  return (
                    <button
                      key={mp.id}
                      disabled={isCurrent}
                      onClick={() => setSelected(mp.id)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                        isCurrent
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : isSelected
                          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                          : "text-[#37352f] dark:text-[#e6e6e4] hover:bg-gray-50 dark:hover:bg-[#2f2f2f]"
                      }`}
                    >
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
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] transition-colors"
          >
            취소
          </button>
          <button
            disabled={!selected}
            onClick={() => { if (selected) { onMove(selected); onClose(); } }}
            className="flex-1 py-2 text-sm rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이동
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Data row ─────────────────────────────────────────────────────────────────

function DataRow({
  customer,
  statuses,
  columns,
  isDirty,
  onUpdate,
  onDelete,
  onMove,
}: {
  customer: Customer;
  statuses: StatusOption[];
  columns: CustomColumnDef[];
  isDirty: boolean;
  onUpdate: (updates: Partial<Omit<Customer, "id" | "created_at">>) => void;
  onDelete: () => void;
  onMove: (targetMonthPageId: string | null) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      // 3초 후 자동 취소
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <tr className={`border-t border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] group transition-colors ${isDirty ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}>
      <td className={`px-3 py-2 min-w-[120px] relative ${isDirty ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-blue-400 before:rounded-r" : ""}`}>
        <TextCell value={customer.name} onChange={(v) => onUpdate({ name: v })} placeholder="이름" />
      </td>
      <td className="px-3 py-2 min-w-[90px]">
        <AssigneeCell value={customer.assignee} onChange={(v) => onUpdate({ assignee: v })} />
      </td>
      <td className="px-3 py-2 min-w-[80px]">
        <TagsCell value={customer.route} onChange={(v) => onUpdate({ route: v })} />
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
      {columns.map((col) => (
        <td key={col.id} className="px-3 py-2 text-center">
          <BoolCell
            value={customer.custom_fields?.[col.id] ?? false}
            onChange={(v) => onUpdate({ custom_fields: { ...customer.custom_fields, [col.id]: v } })}
          />
        </td>
      ))}
      <td className="px-3 py-2 min-w-[130px]">
        <input
          type="date"
          value={customer.submit_date ?? ""}
          onChange={(e) => onUpdate({ submit_date: e.target.value })}
          className="w-full bg-transparent outline-none text-sm cursor-pointer dark:text-[#e6e6e4] dark:color-scheme-dark"
        />
      </td>
      <td className="px-3 py-2 min-w-[130px]">
        <StatusCell value={customer.status} statuses={statuses} onChange={(v) => onUpdate({ status: v })} />
      </td>
      <td className="px-3 py-2 min-w-[140px]">
        <TextCell value={customer.memo} onChange={(v) => onUpdate({ memo: v })} placeholder="메모" />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMoveModal(true)}
            title="다른 달로 이동"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#c4c3bf] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
          >
            <ArrowRightLeft size={12} />
          </button>
          <button
            onClick={handleDeleteClick}
            title={confirmDelete ? "한 번 더 클릭하면 삭제됩니다" : "삭제"}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
              confirmDelete
                ? "bg-red-500 text-white font-semibold animate-pulse"
                : "text-[#c4c3bf] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            }`}
          >
            <Trash2 size={12} />
            {confirmDelete && "삭제?"}
          </button>
        </div>
        {showMoveModal && (
          <MoveModal
            currentMonthPageId={customer.monthPageId}
            onMove={(targetId) => onMove(targetId)}
            onClose={() => setShowMoveModal(false)}
          />
        )}
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
function formatWon(n: number): string {
  return `₩${Math.round(n).toLocaleString()}`;
}

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
    isRefreshing, syncNow,
  } = useWorkspaceStore();
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // ─── 장부 스타일 저장 추적 ────────────────────────────────────────
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const isDirty = dirtyIds.size > 0;

  const handleUpdate = useCallback((id: string, updates: Partial<Omit<Customer, "id" | "created_at">>) => {
    updateCustomer(id, updates);
    setDirtyIds((prev) => new Set(prev).add(id));
  }, [updateCustomer]);

  const handleSaveToDB = useCallback(async () => {
    if (dirtyIds.size === 0) return;
    setSaveStatus("saving");
    await syncNow();
    setDirtyIds(new Set());
    setSaveStatus("saved");
  }, [dirtyIds, syncNow]);

  // Cmd/Ctrl+S 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSaveToDB(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveToDB]);
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string> | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string> | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; dir: "asc" | "desc" } | null>(null);

  const sortedColumns = [...customColumns].sort((a, b) => a.order - b.order);

  // Insert a new custom checkbox column to the left or right of index atIdx
  const insertColumn = (side: "left" | "right", atIdx: number) => {
    const newId = uuidv4();
    const ids = sortedColumns.map((c) => c.id);
    const insertAt = side === "left" ? atIdx : atIdx + 1;
    ids.splice(insertAt, 0, newId);
    upsertCustomColumn({ id: newId, label: "새 열", type: "checkbox", order: 9999 });
    reorderCustomColumns(ids);
  };

  // Filter customers by month page when monthPageId is provided
  const monthScoped = monthPageId
    ? customers.filter((c) => c.monthPageId === monthPageId)
    : customers;

  // 담당자 필터 드롭다운에 쓰일, 현재(월 범위 내) 존재하는 담당자 목록 (가나다순)
  const distinctAssignees = Array.from(
    new Set(monthScoped.map((c) => c.assignee).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "ko"));

  let visibleCustomers = monthScoped;
  if (assigneeFilter !== null) {
    visibleCustomers = visibleCustomers.filter((c) => assigneeFilter.has(c.assignee));
  }
  if (statusFilter !== null) {
    visibleCustomers = visibleCustomers.filter((c) => statusFilter.has(c.status ?? ""));
  }

  // Generic sort by any column field
  if (sortConfig) {
    const { field, dir } = sortConfig;
    visibleCustomers = [...visibleCustomers].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (field.startsWith("custom_")) {
        const colId = field.slice(7);
        av = (a.custom_fields?.[colId] ? 1 : 0);
        bv = (b.custom_fields?.[colId] ? 1 : 0);
      } else {
        av = ((a as unknown) as Record<string, unknown>)[field] as string | number ?? "";
        bv = ((b as unknown) as Record<string, unknown>)[field] as string | number ?? "";
      }
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), "ko");
      return dir === "asc" ? cmp : -cmp;
    });
  }

  // Monthly / total revenue (전체금액 기준) — 필터링된 결과 기준으로 재계산
  const totalRevenue = visibleCustomers.reduce((sum, c) => sum + (c.total_amount ?? 0), 0);
  const settlementTotal = visibleCustomers.reduce((sum, c) => sum + (c.settlement_amount ?? 0), 0);
  const balanceTotal = visibleCustomers.reduce((sum, c) => sum + (c.balance ?? 0), 0);

  // 열 개수: 이름·담당자·Tags·알바(4) + 정산금액·전체금액·잔금(3) + 동적 체크박스 열 + 제출날짜·Status·메모·""(4)
  const totalColSpan = 11 + sortedColumns.length;

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
                매출 {formatWon(totalRevenue)}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSaveToDB}
          disabled={!isDirty || saveStatus === "saving" || isRefreshing}
          title={isDirty ? `${dirtyIds.size}건 미저장 · 클릭하여 저장 (⌘S)` : "저장됨"}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
            saveStatus === "saving" || isRefreshing
              ? "bg-blue-400 text-white cursor-wait"
              : isDirty
              ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
              : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 cursor-default border border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {saveStatus === "saving" || isRefreshing ? (
            <><RefreshCw size={13} className="animate-spin" /> 저장 중…</>
          ) : isDirty ? (
            <><Save size={13} /> 저장 ({dirtyIds.size})</>
          ) : (
            <><Check size={13} /> 저장됨</>
          )}
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
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
            {(
              [
                { label: "이름", field: "name" },
                { label: "담당자", field: "assignee" },
                { label: "Tags", field: "route" },
                { label: "알바", field: "alba" },
                { label: "정산금액", field: "settlement_amount" },
                { label: "전체금액", field: "total_amount" },
                { label: "잔금", field: "balance" },
              ] as { label: string; field: string }[]
            ).map(({ label, field }) => (
              <th
                key={field}
                className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap"
              >
                <ColumnHeader
                  label={label}
                  kind="fixed"
                  field={field}
                  sortField={sortConfig?.field ?? null}
                  sortDir={sortConfig?.dir ?? null}
                  onSort={(f, d) => setSortConfig(d ? { field: f, dir: d } : null)}
                  {...(field === "assignee"
                    ? { assignees: distinctAssignees, assigneeFilter, onAssigneeFilter: setAssigneeFilter }
                    : {})}
                />
              </th>
            ))}
            {sortedColumns.map((col, idx) => (
              <th
                key={col.id}
                className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap"
              >
                <ColumnHeader
                  label={col.label}
                  kind="custom"
                  field={`custom_${col.id}`}
                  sortField={sortConfig?.field ?? null}
                  sortDir={sortConfig?.dir ?? null}
                  onSort={(f, d) => setSortConfig(d ? { field: f, dir: d } : null)}
                  onInsertLeft={() => insertColumn("left", idx)}
                  onInsertRight={() => insertColumn("right", idx)}
                  onRename={(lbl) => upsertCustomColumn({ ...col, label: lbl })}
                  onDelete={() => deleteCustomColumn(col.id)}
                />
              </th>
            ))}
            {/* 제출날짜 */}
            <th className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap">
              <ColumnHeader
                label="제출날짜"
                kind="fixed"
                field="submit_date"
                sortField={sortConfig?.field ?? null}
                sortDir={sortConfig?.dir ?? null}
                onSort={(f, d) => setSortConfig(d ? { field: f, dir: d } : null)}
              />
            </th>
            {/* Status */}
            <th className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap">
              <ColumnHeader
                label="Status"
                kind="status"
                field="status"
                sortField={sortConfig?.field ?? null}
                sortDir={sortConfig?.dir ?? null}
                onSort={(f, d) => setSortConfig(d ? { field: f, dir: d } : null)}
                allStatuses={customerStatuses}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                onEditStatus={() => setShowStatusEditor(true)}
              />
            </th>
            {/* 메모 */}
            <th className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap">
              <ColumnHeader
                label="메모"
                kind="fixed"
                field="memo"
                sortField={sortConfig?.field ?? null}
                sortDir={sortConfig?.dir ?? null}
                onSort={(f, d) => setSortConfig(d ? { field: f, dir: d } : null)}
              />
            </th>
            {/* 열 추가 버튼 */}
            <th className="px-3 py-2 text-left text-xs font-semibold text-[#9b9a97] dark:text-[#6b6b6b] border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap">
              <button
                onClick={() => {
                  const newId = uuidv4();
                  upsertCustomColumn({ id: newId, label: "새 열", type: "checkbox", order: sortedColumns.length });
                }}
                title="새 체크박스 열 추가"
                className="flex items-center gap-0.5 text-[#c4c3bf] hover:text-[#9b9a97] transition-colors"
              >
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
              columns={sortedColumns}
              isDirty={dirtyIds.has(c.id)}
              onUpdate={(updates) => handleUpdate(c.id, updates)}
              onDelete={() => { deleteCustomer(c.id); setDirtyIds((p) => { const n = new Set(p); n.delete(c.id); return n; }); }}
              onMove={(targetMonthPageId) => handleUpdate(c.id, { monthPageId: targetMonthPageId })}
            />
          ))}
          {showAddForm ? (
            <AddCustomerRow
              statuses={customerStatuses}
              columns={sortedColumns}
              onSave={handleSave}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <AddTriggerRow onAdd={() => setShowAddForm(true)} colSpan={totalColSpan} />
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#e9e9e7] dark:border-[#3f3f3f] bg-[#f7f6f3] dark:bg-[#232323] font-semibold sticky bottom-0">
            <td colSpan={4} className="px-3 py-2 text-xs text-[#9b9a97] dark:text-[#6b6b6b]">
              합계
            </td>
            <td className="px-3 py-2 text-sm text-right text-[#37352f] dark:text-[#e6e6e4]">
              {formatWon(settlementTotal)}
            </td>
            <td className="px-3 py-2 text-sm text-right text-[#37352f] dark:text-[#e6e6e4]">
              {formatWon(totalRevenue)}
            </td>
            <td className="px-3 py-2 text-sm text-right text-[#37352f] dark:text-[#e6e6e4]">
              {formatWon(balanceTotal)}
            </td>
            <td colSpan={sortedColumns.length + 4}></td>
          </tr>
        </tfoot>
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
