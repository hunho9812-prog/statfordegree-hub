"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import type { Customer, ContactMethod, CustomerStatus } from "@/lib/types";
import { X, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";

const CONTACT_METHODS: ContactMethod[] = ["메일", "카톡", "크몽"];
const STATUSES: CustomerStatus[] = ["제출완료", "외주분석중", "프리랜서응대"];

const STATUS_COLORS: Record<CustomerStatus | "", string> = {
  "제출완료": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "외주분석중": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "프리랜서응대": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "": "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function formatKRW(v: number | null) {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("ko-KR") + "원";
}

function CheckCell({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${value ? "bg-emerald-500 text-white" : "bg-[#e9e9e7] dark:bg-[#3f3f3f] text-transparent"}`}>
      {value ? "✓" : ""}
    </span>
  );
}

const EMPTY_FORM: Omit<Customer, "id" | "created_at" | "updated_at"> = {
  name: "",
  assignee: "",
  contact_method: "",
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

type FilterState = {
  assignee: string;
  status: CustomerStatus | "";
};

export default function CRMPage() {
  const { customers, createCustomer, updateCustomer, deleteCustomer } = useWorkspaceStore();
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Customer, "id" | "created_at" | "updated_at">>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({ assignee: "", status: "" });

  const assignees = Array.from(new Set(customers.map((c) => c.assignee).filter(Boolean)));

  const filtered = customers.filter((c) => {
    if (filter.assignee && c.assignee !== filter.assignee) return false;
    if (filter.status && c.status !== filter.status) return false;
    return true;
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalMode("add");
  }

  function openEdit(c: Customer) {
    setForm({
      name: c.name,
      assignee: c.assignee,
      contact_method: c.contact_method,
      total_amount: c.total_amount,
      balance: c.balance,
      review_proposed: c.review_proposed,
      balance_received: c.balance_received,
      kmong_review: c.kmong_review,
      kakao_review: c.kakao_review,
      submit_date: c.submit_date,
      status: c.status,
      memo: c.memo,
    });
    setEditingId(c.id);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (modalMode === "add") {
      createCustomer(form);
    } else if (modalMode === "edit" && editingId) {
      updateCustomer(editingId, form);
    }
    closeModal();
  }

  function handleDelete(id: string) {
    deleteCustomer(id);
    setDeleteConfirm(null);
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#191919] overflow-hidden">
      {/* Page header */}
      <div className="px-8 pt-10 pb-6 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
        <div className="flex items-center justify-between max-w-full">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">👤</span>
              <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">고객관리양식</h1>
            </div>
            <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-1 ml-11">
              총 {customers.length}명의 고객 · 필터 적용 후 {filtered.length}명 표시
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] text-sm font-medium hover:bg-[#1f1f1f] dark:hover:bg-white transition-colors"
          >
            <Plus size={15} />
            고객 추가
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-4 ml-11 flex-wrap">
          <div className="relative">
            <select
              value={filter.assignee}
              onChange={(e) => setFilter((f) => ({ ...f, assignee: e.target.value }))}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] cursor-pointer"
            >
              <option value="">담당자 전체</option>
              {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9b9a97] pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filter.status}
              onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as CustomerStatus | "" }))}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] cursor-pointer"
            >
              <option value="">상태 전체</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9b9a97] pointer-events-none" />
          </div>
          {(filter.assignee || filter.status) && (
            <button
              onClick={() => setFilter({ assignee: "", status: "" })}
              className="text-xs text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] flex items-center gap-1"
            >
              <X size={12} /> 필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse min-w-[1200px]">
          <thead className="sticky top-0 z-10 bg-[#f7f6f3] dark:bg-[#252525]">
            <tr>
              {[
                "이름", "담당자", "연락방식", "전체금액", "잔금",
                "후기제안", "잔금수령", "크몽후기", "카톡후기",
                "제출날짜", "상태", "메모", ""
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-medium text-[#9b9a97] dark:text-[#6b6b6b] text-xs uppercase tracking-wide border-b border-[#e9e9e7] dark:border-[#2f2f2f] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-16 text-[#9b9a97] dark:text-[#6b6b6b]">
                  <div className="text-4xl mb-3">👤</div>
                  <div className="text-sm">고객 데이터가 없습니다. 고객을 추가해 주세요.</div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#f7f6f3] dark:hover:bg-[#252525] transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-[#37352f] dark:text-[#e6e6e4] whitespace-nowrap">{c.name}</td>
                  <td className="px-3 py-2.5 text-[#37352f] dark:text-[#e6e6e4] whitespace-nowrap">{c.assignee || "-"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {c.contact_method ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#f0f0ef] dark:bg-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4] text-xs">
                        {c.contact_method}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-[#37352f] dark:text-[#e6e6e4]">{formatKRW(c.total_amount)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-[#37352f] dark:text-[#e6e6e4]">{formatKRW(c.balance)}</td>
                  <td className="px-3 py-2.5 text-center"><CheckCell value={c.review_proposed} /></td>
                  <td className="px-3 py-2.5 text-center"><CheckCell value={c.balance_received} /></td>
                  <td className="px-3 py-2.5 text-center"><CheckCell value={c.kmong_review} /></td>
                  <td className="px-3 py-2.5 text-center"><CheckCell value={c.kakao_review} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[#37352f] dark:text-[#e6e6e4]">{c.submit_date || "-"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {c.status || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate text-[#9b9a97] dark:text-[#6b6b6b]" title={c.memo}>{c.memo || "-"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 rounded hover:bg-[#e9e9e7] dark:hover:bg-[#3f3f3f] text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors"
                        title="수정"
                      >
                        <Pencil size={13} />
                      </button>
                      {deleteConfirm === c.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-0.5 text-xs bg-[#e9e9e7] dark:bg-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4] rounded"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[#9b9a97] hover:text-red-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#252525] rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
              <h2 className="font-semibold text-[#37352f] dark:text-[#e6e6e4]">
                {modalMode === "add" ? "고객 추가" : "고객 수정"}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[#f0f0ef] dark:hover:bg-[#3f3f3f] text-[#9b9a97]">
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <Field label="이름 *">
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="고객 이름"
                  className="input-style"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="담당자">
                  <input
                    value={form.assignee}
                    onChange={(e) => updateField("assignee", e.target.value)}
                    placeholder="담당자명"
                    className="input-style"
                  />
                </Field>
                <Field label="연락방식">
                  <select
                    value={form.contact_method}
                    onChange={(e) => updateField("contact_method", e.target.value as ContactMethod)}
                    className="input-style"
                  >
                    <option value="">선택</option>
                    {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="알바 전체금액">
                  <input
                    type="number"
                    value={form.total_amount ?? ""}
                    onChange={(e) => updateField("total_amount", e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="input-style"
                  />
                </Field>
                <Field label="잔금">
                  <input
                    type="number"
                    value={form.balance ?? ""}
                    onChange={(e) => updateField("balance", e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="input-style"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="제출날짜">
                  <input
                    type="date"
                    value={form.submit_date}
                    onChange={(e) => updateField("submit_date", e.target.value)}
                    className="input-style"
                  />
                </Field>
                <Field label="상태">
                  <select
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value as CustomerStatus)}
                    className="input-style"
                  >
                    <option value="">선택</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              {/* Checkboxes */}
              <div>
                <label className="text-xs font-medium text-[#9b9a97] dark:text-[#6b6b6b] uppercase tracking-wide">체크 항목</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(
                    [
                      { key: "review_proposed", label: "후기제안 여부" },
                      { key: "balance_received", label: "잔금받음 여부" },
                      { key: "kmong_review", label: "크몽후기 여부" },
                      { key: "kakao_review", label: "카톡후기 여부" },
                    ] as const
                  ).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => updateField(key, e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-500"
                      />
                      <span className="text-sm text-[#37352f] dark:text-[#e6e6e4]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Field label="메모">
                <textarea
                  value={form.memo}
                  onChange={(e) => updateField("memo", e.target.value)}
                  placeholder="메모를 입력하세요"
                  rows={3}
                  className="input-style resize-none"
                />
              </Field>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e9e9e7] dark:border-[#3f3f3f]">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded-lg bg-[#f0f0ef] dark:bg-[#3f3f3f] text-[#37352f] dark:text-[#e6e6e4] hover:bg-[#e9e9e7] dark:hover:bg-[#4f4f4f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-[#37352f] dark:bg-[#e6e6e4] text-white dark:text-[#191919] hover:bg-[#1f1f1f] dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {modalMode === "add" ? "추가" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#9b9a97] dark:text-[#6b6b6b] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
