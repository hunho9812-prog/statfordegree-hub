"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, Check, X, ExternalLink, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useKeywords } from "@/hooks/useKeywords";
import { type KeywordEntry } from "@/lib/db-keywords";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

const EMPTY_FORM = { keyword: "", is_exposed: true, link: "", check_date: "" };

type SortCol = "keyword" | "is_exposed" | "check_date";
type SortDir = "asc" | "desc";

export default function KeywordsPage() {
  const router = useRouter();
  const { entries, loading, reload, upsert, remove, reorder } = useKeywords();

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<KeywordEntry, "id" | "sort_order">>({
    keyword: "", is_exposed: true, link: "", check_date: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragIdx = useRef<number | null>(null);

  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir } | null>(null);

  const cycleSort = (col: SortCol) => {
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null;
    });
  };

  const sortedEntries = useMemo(() => {
    if (!sort) return entries;
    const copy = [...entries];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sort.col === "keyword") cmp = a.keyword.localeCompare(b.keyword, "ko");
      else if (sort.col === "is_exposed") cmp = Number(a.is_exposed) - Number(b.is_exposed);
      else cmp = a.check_date.localeCompare(b.check_date);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [entries, sort]);

  const sortIcon = (col: SortCol) => {
    if (!sort || sort.col !== col) return <ChevronsUpDown size={12} className="text-[#c8c7c4]" />;
    return sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAdd = async () => {
    if (!form.keyword.trim()) return;
    setSubmitting(true);
    const newEntry: KeywordEntry = {
      id: uuidv4(),
      keyword: form.keyword.trim(),
      is_exposed: form.is_exposed,
      link: form.link.trim(),
      check_date: form.check_date,
      sort_order: entries.length,
    };
    const result = await upsert(newEntry);
    setSubmitting(false);
    if (result.success) {
      setForm(EMPTY_FORM);
      showToast("success", "키워드가 추가됐습니다.");
    } else {
      showToast("error", result.error ?? "추가에 실패했습니다.");
    }
  };

  const startEdit = (entry: KeywordEntry) => {
    setEditId(entry.id);
    setEditForm({ keyword: entry.keyword, is_exposed: entry.is_exposed, link: entry.link, check_date: entry.check_date });
  };

  const cancelEdit = () => { setEditId(null); };

  const saveEdit = async (id: string, sort_order: number) => {
    if (!editForm.keyword.trim()) return;
    const result = await upsert({ id, sort_order, ...editForm, keyword: editForm.keyword.trim() });
    if (result.success) {
      setEditId(null);
      showToast("success", "수정됐습니다.");
    } else {
      showToast("error", result.error ?? "수정에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const result = await remove(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (result.success) showToast("success", "삭제됐습니다.");
    else showToast("error", result.error ?? "삭제에 실패했습니다.");
  };

  const onDragStart = (idx: number) => { dragIdx.current = idx; };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (sort) return;
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    const next = [...entries];
    const [item] = next.splice(from, 1);
    next.splice(idx, 0, item);
    dragIdx.current = idx;
    reorder(next.map((e, i) => ({ ...e, sort_order: i })));
  };
  const onDragEnd = () => { dragIdx.current = null; };

  const exposedBadge = (exposed: boolean) => exposed
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">상위노출 O</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">상위노출 X</span>;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919] min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold",
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        )}>
          {toast.type === "success" ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/statfordegree")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
              <ArrowLeft size={14} /> 스탯포디그리
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">키워드 관리</h1>
          </div>
          <button onClick={() => reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors">
            <RefreshCw size={14} /> 새로고침
          </button>
        </div>

        {/* Input section */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4] mb-4">키워드 입력</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* 키워드 */}
            <div>
              <label className="text-xs font-semibold text-[#9b9a97] block mb-1">키워드</label>
              <input
                value={form.keyword}
                onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="키워드 입력"
                className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            {/* 상위노출 여부 */}
            <div>
              <label className="text-xs font-semibold text-[#9b9a97] block mb-1">상위노출 여부</label>
              <select
                value={form.is_exposed ? "true" : "false"}
                onChange={(e) => setForm((p) => ({ ...p, is_exposed: e.target.value === "true" }))}
                className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors"
              >
                <option value="true">상위노출 O</option>
                <option value="false">상위노출 X</option>
              </select>
            </div>

            {/* 링크 */}
            <div>
              <label className="text-xs font-semibold text-[#9b9a97] block mb-1">링크 (선택)</label>
              <input
                value={form.link}
                onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors font-mono"
              />
            </div>

            {/* 확인 날짜 */}
            <div>
              <label className="text-xs font-semibold text-[#9b9a97] block mb-1">확인 날짜</label>
              <input
                type="date"
                value={form.check_date}
                onChange={(e) => setForm((p) => ({ ...p, check_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={submitting || !form.keyword.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            <Plus size={15} /> 추가
          </button>
        </div>

        {/* List section */}
        <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
          {/* List header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            <h2 className="text-sm font-bold text-[#37352f] dark:text-[#e6e6e4]">키워드 목록</h2>
            <span className="text-xs font-semibold text-[#9b9a97] bg-[#f7f6f3] dark:bg-[#2f2f2f] px-2 py-0.5 rounded-full">
              {entries.length}건
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-[#9b9a97]">불러오는 중…</div>
          ) : entries.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#9b9a97]">키워드가 없습니다. 위에서 추가해보세요.</div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[28px_1fr_120px_1fr_100px_80px] gap-2 px-4 py-2 border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#2a2a2a]">
                <div />
                <button onClick={() => cycleSort("keyword")}
                  className="flex items-center gap-1 text-xs font-semibold text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors">
                  키워드 {sortIcon("keyword")}
                </button>
                <button onClick={() => cycleSort("is_exposed")}
                  className="flex items-center gap-1 text-xs font-semibold text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors">
                  상위노출 여부 {sortIcon("is_exposed")}
                </button>
                <span className="text-xs font-semibold text-[#9b9a97]">링크</span>
                <button onClick={() => cycleSort("check_date")}
                  className="flex items-center gap-1 text-xs font-semibold text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors">
                  확인 날짜 {sortIcon("check_date")}
                </button>
                <span className="text-xs font-semibold text-[#9b9a97] text-right">삭제</span>
              </div>

              {sortedEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  draggable={!sort}
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    "group grid grid-cols-[28px_1fr_120px_1fr_100px_80px] gap-2 items-center px-4 py-2.5 border-b border-[#e9e9e7] dark:border-[#2f2f2f] last:border-0 transition-colors",
                    "hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]"
                  )}
                >
                  {editId === entry.id ? (
                    /* Edit row */
                    <>
                      <div className="text-[#9b9a97] cursor-grab"><GripVertical size={14} /></div>

                      <input
                        value={editForm.keyword}
                        onChange={(e) => setEditForm((p) => ({ ...p, keyword: e.target.value }))}
                        className="px-2 py-1 text-sm border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none w-full"
                        autoFocus
                      />

                      <select
                        value={editForm.is_exposed ? "true" : "false"}
                        onChange={(e) => setEditForm((p) => ({ ...p, is_exposed: e.target.value === "true" }))}
                        className="px-2 py-1 text-xs border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none"
                      >
                        <option value="true">상위노출 O</option>
                        <option value="false">상위노출 X</option>
                      </select>

                      <input
                        value={editForm.link}
                        onChange={(e) => setEditForm((p) => ({ ...p, link: e.target.value }))}
                        placeholder="https://..."
                        className="px-2 py-1 text-xs border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none font-mono w-full"
                      />

                      <input
                        type="date"
                        value={editForm.check_date}
                        onChange={(e) => setEditForm((p) => ({ ...p, check_date: e.target.value }))}
                        className="px-2 py-1 text-xs border border-blue-400 rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none"
                      />

                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => saveEdit(entry.id, entry.sort_order)}
                          className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                          <Check size={12} />
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* View row */
                    <>
                      <div className="text-[#9b9a97] opacity-0 group-hover:opacity-100 cursor-grab transition-opacity">
                        <GripVertical size={14} />
                      </div>

                      <span className="text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4] truncate">
                        {entry.keyword}
                      </span>

                      <div>{exposedBadge(entry.is_exposed)}</div>

                      <div className="truncate">
                        {entry.link ? (
                          <a href={entry.link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 truncate">
                            <span className="truncate">{entry.link}</span>
                            <ExternalLink size={10} className="flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-[#9b9a97]">—</span>
                        )}
                      </div>

                      <span className="text-xs text-[#9b9a97]">
                        {entry.check_date || "—"}
                      </span>

                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(entry)}
                          className="px-2 py-1 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-blue-500 hover:border-blue-400 transition-colors">
                          수정
                        </button>
                        <button onClick={() => setDeleteId(entry.id)}
                          className="px-2 py-1 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-[#9b9a97] hover:text-red-500 hover:border-red-400 transition-colors">
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-xl p-6 w-80 mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                <Trash2 size={16} />
              </div>
              <h2 className="font-bold text-[#37352f] dark:text-[#e6e6e4]">키워드 삭제</h2>
            </div>
            <p className="text-sm text-[#9b9a97] mb-5">
              <span className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                {entries.find((e) => e.id === deleteId)?.keyword}
              </span> 키워드를 삭제할까요?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#3f3f3f] text-sm text-[#9b9a97] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors">
                취소
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
