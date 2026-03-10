import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name?.trim()) {
      return NextResponse.json(
        { error: "이름, 이메일, 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 이미 존재하는 이메일인지 확인
    const { data: existing } = await admin
      .from("users")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "이미 가입 신청된 계정입니다. 관리자 승인을 기다려 주세요." },
          { status: 409 }
        );
      }
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "이미 가입된 계정입니다. 로그인해 주세요." },
          { status: 409 }
        );
      }
      if (existing.status === "rejected") {
        return NextResponse.json(
          { error: "가입이 거절된 계정입니다. 관리자에게 문의하세요." },
          { status: 409 }
        );
      }
    }

    // 관리자 클라이언트로 사용자 생성 (이메일 확인 불필요, 이메일 발송 없음)
    const { data, error } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already been registered") ||
        error.message.toLowerCase().includes("user already exists")
      ) {
        return NextResponse.json(
          { error: "이미 등록된 이메일입니다." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 트리거가 public.users를 자동 생성하지만, 명시적으로 상태 보장
    if (data.user) {
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      await admin.from("users").upsert(
        {
          id: data.user.id,
          email: email.toLowerCase(),
          name: name.trim(),
          role: isAdmin ? "admin" : "member",
          status: isAdmin ? "approved" : "pending",
        },
        { onConflict: "id" }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
