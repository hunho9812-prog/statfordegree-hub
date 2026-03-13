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

    const normalizedEmail = email.toLowerCase().trim();
    const admin = createAdminClient();

    // 관리자 이메일은 별도 가입 불가
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 409 }
      );
    }

    // 이미 team_members에 있는지 확인 (이미 승인된 계정)
    const { data: existingMember } = await admin
      .from("team_members")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "이미 가입된 계정입니다. 로그인해 주세요." },
        { status: 409 }
      );
    }

    // signup_requests에 이미 있는지 확인
    const { data: existingRequest } = await admin
      .from("signup_requests")
      .select("id, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json(
          { error: "이미 가입 신청된 계정입니다. 관리자 승인을 기다려 주세요." },
          { status: 409 }
        );
      }
      if (existingRequest.status === "approved") {
        return NextResponse.json(
          { error: "이미 가입된 계정입니다. 로그인해 주세요." },
          { status: 409 }
        );
      }
      if (existingRequest.status === "rejected") {
        // 거절된 경우 재신청 허용: 기존 레코드 업데이트
        await admin
          .from("signup_requests")
          .update({ name: name.trim(), password, status: "pending", created_at: new Date().toISOString() })
          .eq("id", existingRequest.id);
        return NextResponse.json({ success: true });
      }
    }

    // 새 가입 신청 저장 (auth 계정 미생성)
    const { error: insertError } = await admin
      .from("signup_requests")
      .insert({
        email: normalizedEmail,
        name: name.trim(),
        password,           // 승인 시 auth 계정 생성에 사용, 이후 삭제
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
