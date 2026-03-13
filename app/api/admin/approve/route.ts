import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient(getSupabaseUrl(), getServerAnonKey(), {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const admin = createAdminClient();

    // 관리자 권한 확인
    const { data: callerProfile } = await admin
      .from("team_members")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === "admin" || user.email === ADMIN_EMAIL;
    if (!isAdmin) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

    const { requestId, action } = await req.json();
    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }

    // 신청 정보 조회
    const { data: request, error: reqError } = await admin
      .from("signup_requests")
      .select("id, email, name, password, status")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return NextResponse.json({ error: "신청 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: `이미 ${request.status === "approved" ? "승인된" : "거절된"} 신청입니다.` },
        { status: 409 }
      );
    }

    if (action === "reject") {
      await admin
        .from("signup_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      return NextResponse.json({ success: true, status: "rejected" });
    }

    // === 승인 처리 ===

    // 1. Supabase Auth 계정 생성
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: request.email,
      password: request.password,
      email_confirm: true,
      user_metadata: { name: request.name },
    });

    if (authError) {
      // 이미 auth 계정이 있는 경우 (재승인 시나리오)
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already been registered") ||
        authError.message.toLowerCase().includes("user already exists")
      ) {
        // 기존 auth 계정 찾기
        const { data: { users: existingUsers } } = await admin.auth.admin.listUsers();
        const existingAuthUser = existingUsers.find((u) => u.email === request.email);
        if (!existingAuthUser) {
          return NextResponse.json({ error: "계정 처리 중 오류가 발생했습니다." }, { status: 500 });
        }
        // team_members에 upsert
        await admin.from("team_members").upsert({
          id: existingAuthUser.id,
          email: request.email,
          name: request.name,
          role: "member",
          joined_at: new Date().toISOString(),
        }, { onConflict: "id" });
      } else {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
    } else if (authData.user) {
      // 2. team_members에 추가
      await admin.from("team_members").insert({
        id: authData.user.id,
        email: request.email,
        name: request.name,
        role: "member",
        joined_at: new Date().toISOString(),
      });
    }

    // 3. signup_requests 상태 업데이트 + 비밀번호 삭제
    await admin
      .from("signup_requests")
      .update({ status: "approved", password: "" })
      .eq("id", requestId);

    return NextResponse.json({ success: true, status: "approved" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
