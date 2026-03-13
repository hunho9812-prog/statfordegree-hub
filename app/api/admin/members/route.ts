import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/auth";

export async function GET(req: NextRequest) {
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

  // 세션 확인은 anon 클라이언트로
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  // DB 조회는 admin 클라이언트로 (RLS 우회)
  const admin = createAdminClient();

  const { data: callerProfile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // DB에 레코드가 없어도 관리자 이메일이면 admin으로 간주
  const isAdmin =
    callerProfile?.role === "admin" || user.email === ADMIN_EMAIL;

  if (!callerProfile && !isAdmin) {
    return NextResponse.json(
      { error: "팀원 정보를 찾을 수 없습니다." },
      { status: 403 }
    );
  }

  // 관리자: 전체 조회 / 일반 팀원: approved만 조회
  const query = admin.from("users").select("*").order("created_at");
  const { data: users, error } = isAdmin
    ? await query
    : await query.eq("status", "approved");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = (users ?? []).map((u: Record<string, string>) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    role: (u.role ?? "member") as "admin" | "member",
    status: (u.status ?? "pending") as "pending" | "approved" | "rejected",
    created_at: u.created_at,
  }));

  return NextResponse.json({ members });
}
