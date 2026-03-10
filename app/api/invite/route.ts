import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase 미설정" }, { status: 500 });
  }

  // 1. 요청자가 admin인지 확인
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
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

  // 2. 초대 메일 발송 (service role 사용)
  const { email, name, role } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  const inviteRole: "admin" | "member" = role === "admin" ? "admin" : "member";

  try {
    const adminClient = createAdminClient();

    // Supabase auth에 초대 메일 발송
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name: name ?? "", role: inviteRole },
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    // public.users 에도 미리 등록 (초대 수락 전이라도 loadProfile에서 찾을 수 있도록)
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
