import { Suspense } from "react";
import ManualBoard from "@/components/ManualBoard";

export default function ManualPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>}>
        <ManualBoard />
      </Suspense>
    </div>
  );
}
