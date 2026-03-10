import { createClient } from "@supabase/supabase-js";

// 서버 전용: service_role 키로 RLS를 우회하는 어드민 클라이언트
// API Routes 에서만 사용 (클라이언트 번들에 절대 포함 금지)

function getServerUrl(): string {
  // SUPABASE_URL (Vercel 권장) 또는 NEXT_PUBLIC_SUPABASE_URL 둘 다 지원
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Supabase URL이 설정되지 않았습니다. Vercel 환경변수에 SUPABASE_URL을 추가해주세요."
    );
  }
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Supabase Service Role Key가 설정되지 않았습니다. Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY를 추가해주세요."
    );
  }
  return key;
}

export function getServerAnonKey(): string {
  // SUPABASE_ANON_KEY (Vercel 권장) 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 둘 다 지원
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Supabase Anon Key가 설정되지 않았습니다. Vercel 환경변수에 SUPABASE_ANON_KEY를 추가해주세요."
    );
  }
  return key;
}

export function getSupabaseUrl(): string {
  return getServerUrl();
}

export function createAdminClient() {
  return createClient(getServerUrl(), getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
