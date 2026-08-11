"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Settings2, Check, X,
  Plus, Trash2, GripVertical, Pencil,
} from "lucide-react";
import { useWorkspaceStore, MENU_IDS } from "@/lib/store";
import { cn } from "@/lib/utils";

// ── 기본 카드 목록 ────────────────────────────────────────────────────────────

export interface DashCard {
  id: string;
  emoji: string;
  iconBg: string;
  title: string;
  href: string;
}

const DEFAULT_CARDS: DashCard[] = [
  { id: "accounting", emoji: "🧾", iconBg: "from-indigo-400 to-blue-600",   title: "회계",      href: "/accounting" },
  { id: "manual",     emoji: "📋", iconBg: "from-sky-500 to-blue-600",      title: "메뉴얼",    href: "/manual" },
  { id: "crm",        emoji: "👥", iconBg: "from-violet-400 to-purple-600", title: "고객관리",  href: "/crm" },
  { id: "keywords",   emoji: "🔑", iconBg: "from-teal-400 to-cyan-600",     title: "키워드 관리", href: "/statfordegree/keywords" },
];

// 추가할 수 있는 미리 정의된 링크 목록
const PRESET_LINKS: DashCard[] = [
  { id: "tasks",    emoji: "✅", iconBg: "from-amber-400 to-orange-500",  title: "업무 보드", href: "/tasks" },
  { id: "admin",    emoji: "⚙️", iconBg: "from-gray-400 to-slate-600",    title: "팀원관리",  href: "/admin" },
];

const GRADIENT_OPTIONS = [
  "from-indigo-400 to-blue-600",
  "from-blue-400 to-indigo-500",
  "from-cyan-400 to-sky-500",
  "from-green-400 to-emerald-500",
  "from-sky-500 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-red-500",
  "from-pink-400 to-fuchsia-500",
  "from-teal-400 to-cyan-600",
  "from-lime-400 to-green-600",
  "from-orange-400 to-amber-600",
];

const QUICK_EMOJIS = ["📊","🔄","👷","📒","📋","👥","✅","⚙️","🏠","📁","📝","🎯","💡","🔑","📅","💼","🗂️","📌","⭐","🔧","📈","💰","🏷️","🖼️"];

const STORAGE_KEY = "statfordegree_dash_cards_v2";

function loadCards(): DashCard[] {
  if (typeof window === "undefined") return DEFAULT_CARDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DashCard[];
  } catch { /* ignore */ }
  return DEFAULT_CARDS;
}

function saveCards(cards: DashCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StatfordegreePage() {
  const router = useRouter();
  const { loadFromSupabase, isRefreshing } = useWorkspaceStore();

  const [cards, setCards] = useState<DashCard[]>(DEFAULT_CARDS);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // 편집 중 임시 이름
  const [editTitles, setEditTitles] = useState<Record<string, string>>({});

  // 드래그 순서 변경
  const dragIdxRef = useRef<number | null>(null);

  useEffect(() => {
    setCards(loadCards());
  }, []);

  const commit = (next: DashCard[]) => {
    setCards(next);
    saveCards(next);
  };

  const enterEdit = () => {
    const titles: Record<string, string> = {};
    cards.forEach((c) => { titles[c.id] = c.title; });
    setEditTitles(titles);
    setEditMode(true);
  };

  const exitEdit = (save: boolean) => {
    if (save) {
      const next = cards.map((c) => ({ ...c, title: (editTitles[c.id] ?? c.title).trim() || c.title }));
      commit(next);
    }
    setEditMode(false);
    setShowAddModal(false);
  };

  const deleteCard = (id: string) => {
    commit(cards.filter((c) => c.id !== id));
    const newTitles = { ...editTitles };
    delete newTitles[id];
    setEditTitles(newTitles);
  };

  const addCard = (card: DashCard) => {
    const next = [...cards, card];
    commit(next);
    setEditTitles((prev) => ({ ...prev, [card.id]: card.title }));
    setShowAddModal(false);
  };

  const updateEmoji = (id: string, emoji: string) => {
    commit(cards.map((c) => c.id === id ? { ...c, emoji } : c));
  };

  const updateGradient = (id: string, iconBg: string) => {
    commit(cards.map((c) => c.id === id ? { ...c, iconBg } : c));
  };

  // drag-and-drop reorder
  const onDragStart = (idx: number) => { dragIdxRef.current = idx; };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = dragIdxRef.current;
    if (from === null || from === idx) return;
    const next = [...cards];
    const [item] = next.splice(from, 1);
    next.splice(idx, 0, item);
    dragIdxRef.current = idx;
    commit(next);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      {/* Header — always at top */}
      <div className="px-8 pt-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
            >
              <ArrowLeft size={14} /> 홈
            </button>
            <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">스탯포디그리</h1>
          </div>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <>
                <button
                  onClick={() => loadFromSupabase()}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={enterEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
                >
                  <Settings2 size={14} /> 편집
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => exitEdit(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
                >
                  <X size={14} /> 취소
                </button>
                <button
                  onClick={() => exitEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Check size={14} /> 저장
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cards — centered */}
      <div className="flex flex-col items-center justify-center px-8 py-8">
        <div className="w-full max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {cards.map((card, idx) => (
            <DashCardItem
              key={card.id}
              card={card}
              editMode={editMode}
              titleValue={editTitles[card.id] ?? card.title}
              onTitleChange={(v) => setEditTitles((prev) => ({ ...prev, [card.id]: v }))}
              onDelete={() => deleteCard(card.id)}
              onEmojiChange={(emoji) => updateEmoji(card.id, emoji)}
              onGradientChange={(g) => updateGradient(card.id, g)}
              onNavigate={() => router.push(card.href)}
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
            />
          ))}

          {/* 카드 추가 버튼 */}
          {editMode && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d9d9d7] dark:border-[#3f3f3f] bg-transparent hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all min-h-[140px] text-[#9b9a97] dark:text-[#6b6b6b] hover:text-blue-500"
            >
              <Plus size={24} />
              <span className="text-sm font-medium">카드 추가</span>
            </button>
          )}
        </div>

        {editMode && (
          <p className="mt-4 text-xs text-[#9b9a97] text-center">
            카드를 드래그하여 순서를 변경하거나, 이모지·색상·이름을 수정할 수 있습니다.
          </p>
        )}
        </div>
      </div>

      {/* Add card modal */}
      {showAddModal && (
        <AddCardModal
          existingIds={cards.map((c) => c.id)}
          onAdd={addCard}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ── DashCardItem ──────────────────────────────────────────────────────────────

function DashCardItem({
  card, editMode, titleValue,
  onTitleChange, onDelete, onEmojiChange, onGradientChange,
  onNavigate, onDragStart, onDragOver,
}: {
  card: DashCard;
  editMode: boolean;
  titleValue: string;
  onTitleChange: (v: string) => void;
  onDelete: () => void;
  onEmojiChange: (emoji: string) => void;
  onGradientChange: (g: string) => void;
  onNavigate: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const [showEmojiPop, setShowEmojiPop] = useState(false);
  const [showGradPop, setShowGradPop] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const gradRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPop(false);
      if (gradRef.current && !gradRef.current.contains(e.target as Node)) setShowGradPop(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (editMode) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        className="relative group bg-white dark:bg-[#252525] rounded-2xl p-4 border-2 border-blue-300 dark:border-blue-700 shadow-sm flex flex-col items-center gap-2 text-center cursor-grab active:cursor-grabbing"
      >
        {/* 드래그 핸들 */}
        <div className="absolute top-2 left-2 text-[#9b9a97] opacity-50">
          <GripVertical size={14} />
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-500 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
        >
          <X size={11} />
        </button>

        {/* 아이콘 영역 — 이모지 + 색상 변경 */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative" ref={emojiRef}>
            <button
              onClick={() => { setShowEmojiPop((v) => !v); setShowGradPop(false); }}
              className={`w-[60px] h-[60px] rounded-[16px] bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-2xl shadow-md hover:scale-105 transition-transform`}
              title="이모지 변경"
            >
              {card.emoji}
            </button>
            {showEmojiPop && (
              <div className="absolute left-1/2 -translate-x-1/2 top-[68px] z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl p-2 w-52">
                <p className="text-[10px] text-[#9b9a97] mb-1.5 px-1 font-medium">이모지</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {QUICK_EMOJIS.map((em) => (
                    <button key={em} onClick={() => { onEmojiChange(em); setShowEmojiPop(false); }}
                      className="w-6 h-6 flex items-center justify-center text-base rounded hover:bg-[rgba(55,53,47,0.08)]">
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 색상 변경 */}
          <div className="relative" ref={gradRef}>
            <button
              onClick={() => { setShowGradPop((v) => !v); setShowEmojiPop(false); }}
              className="flex items-center gap-1 text-[10px] text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4] px-1.5 py-0.5 rounded border border-[#e9e9e7] dark:border-[#3f3f3f] hover:border-blue-400 transition-colors"
              title="색상 변경"
            >
              <Pencil size={9} /> 색상
            </button>
            {showGradPop && (
              <div className="absolute left-1/2 -translate-x-1/2 top-7 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl p-2 w-44">
                <p className="text-[10px] text-[#9b9a97] mb-1.5 px-1 font-medium">배경 색상</p>
                <div className="grid grid-cols-4 gap-1">
                  {GRADIENT_OPTIONS.map((g) => (
                    <button key={g} onClick={() => { onGradientChange(g); setShowGradPop(false); }}
                      className={cn(`w-8 h-8 rounded-lg bg-gradient-to-br ${g} hover:scale-110 transition-transform shadow-sm`,
                        card.iconBg === g && "ring-2 ring-blue-400 ring-offset-1"
                      )} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 이름 변경 input */}
        <input
          value={titleValue}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-center text-sm font-medium bg-transparent border-b border-blue-300 dark:border-blue-600 outline-none text-[#37352f] dark:text-[#e6e6e4] pb-0.5"
          placeholder="카드 이름"
        />

        <p className="text-[10px] text-[#9b9a97] truncate w-full text-center">{card.href}</p>
      </div>
    );
  }

  // 일반 모드
  return (
    <button
      onClick={onNavigate}
      className="group bg-white dark:bg-[#252525] rounded-2xl p-5 border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col items-center gap-3 text-center"
    >
      <div className={`w-[68px] h-[68px] rounded-[18px] bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-3xl shadow-md`}>
        {card.emoji}
      </div>
      <p className="font-medium text-sm text-[#37352f] dark:text-[#e6e6e4]">
        {card.title}
      </p>
    </button>
  );
}

// ── AddCardModal ──────────────────────────────────────────────────────────────

function AddCardModal({ existingIds, onAdd, onClose }: {
  existingIds: string[];
  onAdd: (card: DashCard) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const [customTitle, setCustomTitle] = useState("");
  const [customHref, setCustomHref] = useState("/");
  const [customEmoji, setCustomEmoji] = useState("📄");
  const [customGrad, setCustomGrad] = useState(GRADIENT_OPTIONS[0]);
  const [showEmojiPop, setShowEmojiPop] = useState(false);

  const availablePresets = PRESET_LINKS.filter((p) => !existingIds.includes(p.id));

  const handleAddCustom = () => {
    if (!customTitle.trim()) return;
    onAdd({
      id: `custom-${Date.now()}`,
      emoji: customEmoji,
      iconBg: customGrad,
      title: customTitle.trim(),
      href: customHref,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-2xl w-96 mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
          <h2 className="font-bold text-sm text-[#37352f] dark:text-[#e6e6e4]">카드 추가</h2>
          <button onClick={onClose} className="text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
          {(["preset", "custom"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"
              )}
            >
              {t === "preset" ? "기존 메뉴" : "직접 입력"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "preset" ? (
            availablePresets.length === 0 ? (
              <p className="text-sm text-[#9b9a97] text-center py-6">추가 가능한 기본 메뉴가 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {availablePresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onAdd(p)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e9e9e7] dark:border-[#3f3f3f] hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.iconBg} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
                      {p.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4]">{p.title}</p>
                      <p className="text-xs text-[#9b9a97]">{p.href}</p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3">
              {/* 이모지 + 색상 */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPop((v) => !v)}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${customGrad} flex items-center justify-center text-2xl shadow-md hover:scale-105 transition-transform`}
                  >
                    {customEmoji}
                  </button>
                  {showEmojiPop && (
                    <div className="absolute left-0 top-14 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl shadow-xl p-2 w-52">
                      <div className="grid grid-cols-8 gap-0.5 mb-2">
                        {QUICK_EMOJIS.map((em) => (
                          <button key={em} onClick={() => { setCustomEmoji(em); setShowEmojiPop(false); }}
                            className="w-6 h-6 flex items-center justify-center text-base rounded hover:bg-[rgba(55,53,47,0.08)]">
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#9b9a97] mb-1 font-medium">배경 색상</p>
                  <div className="grid grid-cols-6 gap-1">
                    {GRADIENT_OPTIONS.map((g) => (
                      <button key={g} onClick={() => setCustomGrad(g)}
                        className={cn(`w-6 h-6 rounded-md bg-gradient-to-br ${g} hover:scale-110 transition-transform shadow-sm`,
                          customGrad === g && "ring-2 ring-blue-400 ring-offset-1"
                        )} />
                    ))}
                  </div>
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label className="text-xs font-medium text-[#9b9a97] block mb-1">카드 이름</label>
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="예: 급여명세서"
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              {/* 링크 */}
              <div>
                <label className="text-xs font-medium text-[#9b9a97] block mb-1">링크 경로</label>
                <input
                  value={customHref}
                  onChange={(e) => setCustomHref(e.target.value)}
                  placeholder="예: /payroll 또는 /p/페이지ID"
                  className="w-full px-3 py-2 text-sm border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e6e6e4] outline-none focus:border-blue-400 transition-colors font-mono"
                />
              </div>

              <button
                onClick={handleAddCustom}
                disabled={!customTitle.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 transition-colors"
              >
                <Plus size={14} className="inline mr-1.5" />
                카드 추가
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
