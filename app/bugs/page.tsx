import { Suspense } from "react";
import BugBoard from "@/components/BugBoard";

export default function BugsPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>}>
        <BugBoard />
      </Suspense>
    </div>
  );
}
