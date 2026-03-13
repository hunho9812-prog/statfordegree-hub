import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/auth";

export async function GET(req: NextRequest) {
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

    const { data: requests, error } = await admin
      .from("signup_requests")
      .select("id, email, name, created_at, status")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ requests: requests ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
