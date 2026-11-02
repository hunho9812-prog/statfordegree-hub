"use client";

// 월/연도 카드처럼 "클릭해야 비로소 무거운 청크를 받기 시작하는" 진입점에서,
// 마우스를 올린 시점에 미리 청크를 받아두기 위한 유틸.
//
// /p/[id] 라우트는 에디터(tiptap ~384KB)와 CRM 테이블 청크를 클릭 후에 내려받기
// 때문에 전환이 가장 느리다. 아래 import()는 PageEditorWrapper가 쓰는 것과 동일한
// 모듈 지정자라서 같은 청크를 가리키고, 모듈 캐시에 들어가면 클릭 시 네트워크
// 왕복 없이 즉시 렌더된다. 한 세션에 한 번만 받는다.

let warmed = false;

export function warmPageEditorChunks() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;

  const run = () => {
    void import("@/components/PageEditor");
    void import("@/components/CRMPage");
  };

  // 사용자가 지금 하는 조작(스크롤·입력)을 방해하지 않도록 유휴 시간에 받는다
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void })
      .requestIdleCallback(run, { timeout: 1000 });
  } else {
    setTimeout(run, 200);
  }
}
