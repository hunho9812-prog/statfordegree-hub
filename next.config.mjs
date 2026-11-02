/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 클라이언트 라우터 캐시 유효시간(초). 기본값은 dynamic 0 / static 300 이라
    // /p/[id], /manual/[id] 같은 동적 라우트는 뒤로가기·재방문마다 서버 왕복이 다시 발생함.
    // 30초 동안은 캐시된 RSC 페이로드를 재사용해서 같은 페이지를 다시 열 때 즉시 뜨게 함.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    // 동적 라우트도 링크에 마우스를 올리면 미리 프리페치 (클릭 시점 왕복 제거)
    dynamicOnHover: true,
  },
};

export default nextConfig;
