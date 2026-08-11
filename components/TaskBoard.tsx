"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import {
  Plus,
  X,
  MoreHorizontal,
  Trash2,
  Calendar,
  User,
  Tag,
  RefreshCw,
} from "lucide-react";
import {
  cn,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  formatDate,
} from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types";

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: "todo", label: "할 일", color: "text-slate-600", bg: "bg-slate-100" },
  { id: "in-progress", label: "진행 중", color: "text-blue-600", bg: "bg-blue-100" },
  { id: "done", label: "완료", color: "text-green-600", bg: "bg-green-100" },
];

interface NewTaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  tags: string;
}

const defaultForm: NewTaskForm = {
  title: "",
  description: "",
  priority: "medium",
  assignee: "",
  dueDate: "",
  tags: "",
};

export default function TaskBoard() {
  const { tasks, createTask, updateTask, deleteTask, loadFromSupabase, isRefreshing } = useWorkspaceStore();
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
  const [form, setForm] = useState<NewTaskForm>(defaultForm);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const handleSubmit = (status: TaskStatus) => {
    if (!form.title.trim()) return;
    createTask({
      title: form.title.trim(),
      description: form.description.trim(),
      status,
      priority: form.priority,
      assignee: form.assignee.trim(),
      dueDate: form.dueDate || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setForm(defaultForm);
    setAddingTo(null);
  };

  const handleMoveTask = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
    setOpenMenuId(null);
  };

  const handleDelete = (taskId: string) => {
    if (confirm("이 업무를 삭제할까요?")) {
      deleteTask(taskId);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#191919]">
      <div className="px-6 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f] dark:text-[#e6e6e4]">업무 보드</h1>
          <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mt-1">
            팀 업무를 칸반 보드로 관리하세요
          </p>
        </div>
        <button
          onClick={() => loadFromSupabase()}
          disabled={isRefreshing}
          title="새로고침"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      <div className="flex-1 overflow-x-auto px-6 py-5">
        <div className="flex gap-4 h-full min-w-[660px] max-w-[1200px]">
          {COLUMNS.map((col) => {
            const colTasks = getTasksByStatus(col.id);
            return (
              <div
                key={col.id}
                className="flex-1 min-w-[250px] flex flex-col gap-3"
              >
                {/* Column header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        col.bg,
                        col.color
                      )}
                    >
                      {col.label}
                    </span>
                    <span className="text-xs text-[#9b9a97]">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setAddingTo(col.id);
                      setForm(defaultForm);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.08)] text-[#9b9a97]"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isMenuOpen={openMenuId === task.id}
                      onMenuToggle={() =>
                        setOpenMenuId(openMenuId === task.id ? null : task.id)
                      }
                      onMenuClose={() => setOpenMenuId(null)}
                      onMove={handleMoveTask}
                      onDelete={handleDelete}
                      onEdit={() => {
                        setEditingTask(task);
                        setOpenMenuId(null);
                      }}
                      currentStatus={col.id}
                    />
                  ))}

                  {/* Add task form */}
                  {addingTo === col.id && (
                    <div className="bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl p-3 shadow-sm">
                      <input
                        autoFocus
                        type="text"
                        placeholder="업무 제목..."
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSubmit(col.id);
                          if (e.key === "Escape") setAddingTo(null);
                        }}
                        className="w-full text-sm text-[#37352f] dark:text-[#e6e6e4] bg-transparent outline-none placeholder-[#c4c3bf] dark:placeholder-[#4f4f4f] mb-2"
                      />
                      <input
                        type="text"
                        placeholder="설명 (선택)"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        className="w-full text-xs text-[#9b9a97] bg-transparent outline-none placeholder-[#c4c3bf] dark:placeholder-[#4f4f4f] mb-3"
                      />
                      <div className="flex gap-2 mb-3">
                        <select
                          value={form.priority}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              priority: e.target.value as TaskPriority,
                            })
                          }
                          className="flex-1 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-md px-2 py-1 outline-none bg-white dark:bg-[#2f2f2f] dark:text-[#e6e6e4]"
                        >
                          <option value="low">낮음</option>
                          <option value="medium">보통</option>
                          <option value="high">높음</option>
                        </select>
                        <input
                          type="text"
                          placeholder="담당자"
                          value={form.assignee}
                          onChange={(e) =>
                            setForm({ ...form, assignee: e.target.value })
                          }
                          className="flex-1 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] dark:bg-[#2f2f2f] dark:text-[#e6e6e4] rounded-md px-2 py-1 outline-none"
                        />
                      </div>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="date"
                          value={form.dueDate}
                          onChange={(e) =>
                            setForm({ ...form, dueDate: e.target.value })
                          }
                          className="flex-1 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-md px-2 py-1 outline-none bg-white dark:bg-[#2f2f2f] dark:text-[#e6e6e4]"
                        />
                        <input
                          type="text"
                          placeholder="태그 (쉼표 구분)"
                          value={form.tags}
                          onChange={(e) =>
                            setForm({ ...form, tags: e.target.value })
                          }
                          className="flex-1 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] dark:bg-[#2f2f2f] dark:text-[#e6e6e4] rounded-md px-2 py-1 outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmit(col.id)}
                          disabled={!form.title.trim()}
                          className="flex-1 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          추가
                        </button>
                        <button
                          onClick={() => setAddingTo(null)}
                          className="px-3 py-1.5 border border-[#e9e9e7] dark:border-[#3f3f3f] dark:text-[#e6e6e4] text-xs rounded-md hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

                  {colTasks.length === 0 && addingTo !== col.id && (
                    <button
                      onClick={() => {
                        setAddingTo(col.id);
                        setForm(defaultForm);
                      }}
                      className="w-full py-3 border-2 border-dashed border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl text-xs text-[#9b9a97] hover:border-[#c4c3bf] hover:text-[#37352f] dark:hover:text-[#e6e6e4] transition-colors"
                    >
                      + 업무 추가
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit task modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updates) => {
            updateTask(editingTask.id, updates);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  currentStatus: TaskStatus;
}

function TaskCard({
  task,
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
  onMove,
  onDelete,
  onEdit,
  currentStatus,
}: TaskCardProps) {
  const otherStatuses = COLUMNS.filter((c) => c.id !== currentStatus);

  return (
    <div className="bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-xl p-3 shadow-sm hover:shadow-md dark:shadow-none dark:hover:border-[#555] transition-all group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#37352f] dark:text-[#e6e6e4] leading-snug flex-1">
          {task.title}
        </p>
        <div className="relative flex-shrink-0">
          <button
            onClick={onMenuToggle}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] text-[#9b9a97] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={14} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-7 z-50 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg shadow-lg py-1 w-44">
              <button
                className="w-full px-3 py-1.5 text-xs text-left text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                onClick={onEdit}
              >
                수정
              </button>
              {otherStatuses.map((s) => (
                <button
                  key={s.id}
                  className="w-full px-3 py-1.5 text-xs text-left text-[#37352f] dark:text-[#e6e6e4] hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                  onClick={() => onMove(task.id, s.id)}
                >
                  {STATUS_LABELS[s.id]}(으)로 이동
                </button>
              ))}
              <div className="my-1 h-px bg-[#e9e9e7] dark:bg-[#3f3f3f]" />
              <button
                className="w-full px-3 py-1.5 text-xs text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 size={12} />
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-[#9b9a97] mt-1 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium",
            PRIORITY_COLORS[task.priority]
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-1.5 py-0.5 rounded-full bg-[#f0f0ef] text-[#9b9a97] flex items-center gap-0.5"
          >
            <Tag size={9} />
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2.5">
        {task.assignee && (
          <span className="flex items-center gap-1 text-xs text-[#9b9a97]">
            <User size={11} />
            {task.assignee}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-[#9b9a97]">
            <Calendar size={11} />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
}

function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    assignee: task.assignee,
    dueDate: task.dueDate
      ? new Date(task.dueDate).toISOString().split("T")[0]
      : "",
    tags: task.tags.join(", "),
    status: task.status,
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      assignee: form.assignee.trim(),
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: form.status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#252525] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
          <h2 className="text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]">업무 수정</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] text-[#9b9a97]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#9b9a97] mb-1">제목 *</label>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-style"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9b9a97] mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="input-style resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#9b9a97] mb-1">상태</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                className="input-style"
              >
                <option value="todo">할 일</option>
                <option value="in-progress">진행 중</option>
                <option value="done">완료</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9b9a97] mb-1">우선순위</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className="input-style"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#9b9a97] mb-1">담당자</label>
              <input
                type="text"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                className="input-style"
                placeholder="이름 입력"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9b9a97] mb-1">마감일</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="input-style"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9b9a97] mb-1">태그 (쉼표로 구분)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input-style"
              placeholder="태그1, 태그2, ..."
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={handleSave}
            disabled={!form.title.trim()}
            className="flex-1 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#e9e9e7] dark:border-[#3f3f3f] dark:text-[#e6e6e4] text-sm rounded-lg hover:bg-[rgba(55,53,47,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
