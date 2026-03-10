/**
 * 관리자 계정 생성 스크립트
 * 실행: node scripts/create-admin.mjs
 *
 * 필요 환경변수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "환경변수가 설정되지 않았습니다.\n" +
    "NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = "rlagusgh1214@naver.com";
const ADMIN_PASSWORD = "rlagusgh98@";

async function createAdmin() {
  console.log(`관리자 계정 생성 중: ${ADMIN_EMAIL}`);

  // 이미 존재하는지 확인
  const { data: existing } = await admin.auth.admin.listUsers();
  const alreadyExists = existing?.users?.find((u) => u.email === ADMIN_EMAIL);

  if (alreadyExists) {
    console.log("이미 계정이 존재합니다. 비밀번호를 업데이트합니다.");
    const { error } = await admin.auth.admin.updateUserById(alreadyExists.id, {
      password: ADMIN_PASSWORD,
    });
    if (error) {
      console.error("비밀번호 업데이트 실패:", error.message);
      process.exit(1);
    }
    console.log("비밀번호 업데이트 완료.");
    return;
  }

  // 신규 생성
  const { data, error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error("계정 생성 실패:", error.message);
    process.exit(1);
  }

  console.log(`관리자 계정 생성 완료 (id: ${data.user.id})`);
  console.log("DB 트리거가 자동으로 admin 역할을 부여합니다.");
}

createAdmin();
