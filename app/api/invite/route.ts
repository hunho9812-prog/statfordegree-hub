import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";

// 초대 후 사용자가 이동할 Vercel 배포 URL
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://hunho9812-prog-statfordegree-hub-pj.vercel.app";

export async function POST(req: NextRequest) {
  let supabaseUrl: string;
  let supabaseAnonKey: string;
  try {
    supabaseUrl = getSupabaseUrl();
    supabaseAnonKey = getServerAnonKey();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase 미설정" },
      { status: 500 }
    );
  }

  // 1. 요청자가 admin인지 확인
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증되지 않은 요청" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || callerProfile.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  // 2. 요청 파라미터 파싱
  const { email, name, role } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  const inviteRole: "admin" | "member" = role === "admin" ? "admin" : "member";

  try {
    const adminClient = createAdminClient();

    // 3. 초대 메일 발송
    //    redirectTo → 반드시 Vercel 배포 URL로 설정해야 localhost 에러 방지
    //    Supabase Dashboard > Authentication > URL Configuration 에도 동일 URL 등록 필요
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { name: name ?? "", role: inviteRole },
        redirectTo: `${SITE_URL}/auth/callback`,
      });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    // 4. public.users 에도 미리 등록 (초대 수락 전에도 profile 조회 가능하도록)
    if (inviteData?.user) {
      await adminClient.from("users").upsert({
        id: inviteData.user.id,
        email: inviteData.user.email ?? email,
        name: name ?? "",
        role: inviteRole,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "초대 실패" },
      { status: 500 }
    );
  }
}
