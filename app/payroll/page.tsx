"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";

export default function PayrollPage() {
  const router = useRouter();
  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="flex items-center gap-4 mb-12">
          <button
            onClick={() => router.push("/statfordegree")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#9b9a97] dark:text-[#6b6b6b] hover:bg-white dark:hover:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f2f2f] transition-colors"
          >
            <ArrowLeft size={14} />
            스탯포디그리
          </button>
          <h1 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4]">인건비</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-4xl shadow-lg">
            👷
          </div>
          <p className="text-lg font-semibold text-[#37352f] dark:text-[#e6e6e4]">인건비 관리</p>
          <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b]">준비 중입니다. 곧 업데이트될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}
