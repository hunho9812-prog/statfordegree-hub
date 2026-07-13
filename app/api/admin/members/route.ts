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
      .from("team_members")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === "admin" || user.email === ADMIN_EMAIL;

    if (!callerProfile && !isAdmin) {
      return NextResponse.json({ error: "팀원 정보를 찾을 수 없습니다." }, { status: 403 });
    }

    // 새 컬럼(manual_access, crm_access)이 아직 마이그레이션되지 않은 경우를 대비해
    // 먼저 전체 컬럼으로 시도하고, 실패하면 기존 컬럼만으로 폴백
    let members: Record<string, unknown>[] | null = null;
    let hasNewColumns = true;

    const fullResult = await admin
      .from("team_members")
      .select("id, name, email, role, joined_at, accounting_access, manual_access, crm_access")
      .order("joined_at");

    if (fullResult.error) {
      // 컬럼 없음 오류면 폴백
      hasNewColumns = false;
      const fallbackResult = await admin
        .from("team_members")
        .select("id, name, email, role, joined_at, accounting_access")
        .order("joined_at");
      if (fallbackResult.error) {
        return NextResponse.json({ error: fallbackResult.error.message }, { status: 500 });
      }
      members = (fallbackResult.data ?? []) as Record<string, unknown>[];
    } else {
      members = (fullResult.data ?? []) as Record<string, unknown>[];
    }

    const result = members.map((m) => ({
      id: m.id,
      name: (m.name as string) ?? "",
      email: (m.email as string) ?? "",
      role: ((m.role as string) ?? "member") as "admin" | "member",
      status: "approved" as const,
      created_at: m.joined_at,
      accounting_access: (m.accounting_access as boolean) ?? false,
      manual_access: hasNewColumns ? ((m.manual_access as boolean) ?? false) : false,
      crm_access: hasNewColumns ? ((m.crm_access as boolean) ?? false) : false,
    }));

    return NextResponse.json({ members: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
