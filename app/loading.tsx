// 라우트 전환 중 즉시 표시되는 로딩 UI.
// 이게 없으면 RSC 페이로드 + 라우트 청크가 도착할 때까지 이전 화면이 그대로 멈춰 있어서
// "클릭했는데 아무 반응이 없는" 구간이 생긴다. 서버 컴포넌트 트리의 Suspense 폴백이라
// JS 청크 다운로드를 기다리지 않고 바로 그려진다.
export default function Loading() {
  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-[#191919] px-8 py-7">
      <div className="max-w-3xl animate-pulse">
        <div className="h-7 w-48 rounded-md bg-[#f0efed] dark:bg-[#262626]" />
        <div className="mt-3 h-4 w-72 rounded bg-[#f4f3f1] dark:bg-[#232323]" />
        <div className="mt-8 space-y-3">
          <div className="h-10 rounded-lg bg-[#f4f3f1] dark:bg-[#232323]" />
          <div className="h-10 rounded-lg bg-[#f7f6f4] dark:bg-[#202020]" />
          <div className="h-10 rounded-lg bg-[#f7f6f4] dark:bg-[#202020]" />
        </div>
      </div>
    </div>
  );
}
