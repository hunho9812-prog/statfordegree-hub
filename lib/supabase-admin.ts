import { createClient } from "@supabase/supabase-js";

// 서버 전용: service_role 키로 RLS를 우회하는 어드민 클라이언트
// API Routes 에서만 사용 (클라이언트 번들에 절대 포함 금지)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase 어드민 자격증명이 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY를 환경변수에 추가해주세요.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
