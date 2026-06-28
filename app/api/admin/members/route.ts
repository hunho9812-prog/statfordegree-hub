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

    // 호출자 권한 확인
    const { data: callerProfile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === "admin" || user.email === ADMIN_EMAIL;

    if (!callerProfile && !isAdmin) {
      return NextResponse.json({ error: "팀원 정보를 찾을 수 없습니다." }, { status: 403 });
    }

    const { data: members, error } = await admin
      .from("users")
      .select("*")
      .order("joined_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // joined_at → created_at 매핑 (프론트엔드 호환성)
    const result = (members ?? []).map((m: Record<string, unknown>) => ({
      id: m.id,
      name: (m.name as string) ?? "",
      email: (m.email as string) ?? "",
      role: ((m.role as string) ?? "member") as "admin" | "member",
      status: "approved" as const,
      created_at: m.joined_at,
      accounting_access: m.accounting_access ?? false,
    }));

    return NextResponse.json({ members: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
