"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function EditableTitle({
  value,
  isAdmin,
  onSave,
  className,
  inputClassName,
}: {
  value: string;
  isAdmin: boolean;
  onSave: (next: string) => unknown;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!isAdmin) {
    return <span className={className}>{value}</span>;
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5 group">
        <span className={className}>{value}</span>
        <button
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="opacity-0 group-hover:opacity-100 text-[#9b9a97] hover:text-blue-500 transition-opacity"
          title="이름 수정"
        >
          <Pencil size={14} />
        </button>
      </span>
    );
  }

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    setEditing(false);
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        className={cn(
          "bg-transparent border-b border-blue-400 outline-none px-0.5",
          inputClassName ?? className
        )}
      />
      <button onClick={commit} className="text-emerald-500 hover:text-emerald-600">
        <Check size={14} />
      </button>
      <button onClick={() => setEditing(false)} className="text-[#9b9a97] hover:text-red-500">
        <X size={14} />
      </button>
    </span>
  );
}
