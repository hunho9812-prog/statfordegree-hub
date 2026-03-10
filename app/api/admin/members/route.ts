import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";

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

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile) {
    return NextResponse.json(
      { error: "팀원 정보를 찾을 수 없습니다." },
      { status: 403 }
    );
  }

  const isAdmin = callerProfile.role === "admin";

  if (isAdmin) {
    // 관리자: auth.users 전체 조회 (초대 대기 포함)
    const adminClient = createAdminClient();
    const { data: authData, error: authError } =
      await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (authError)
      return NextResponse.json({ error: authError.message }, { status: 500 });

    const { data: publicUsers } = await adminClient.from("users").select("*");
    const publicMap = new Map(
      (publicUsers ?? []).map((u: Record<string, string>) => [u.id, u])
    );

    const members = authData.users.map((au) => {
      const pub = publicMap.get(au.id) as Record<string, string> | undefined;
      return {
        id: au.id,
        name: (pub?.name ?? au.user_metadata?.name ?? "") as string,
        email: au.email ?? "",
        role: (pub?.role ?? au.user_metadata?.role ?? "member") as
          | "admin"
          | "member",
        status: (au.confirmed_at ? "active" : "pending") as
          | "active"
          | "pending",
        created_at: au.created_at,
      };
    });

    return NextResponse.json({ members });
  } else {
    // 일반 팀원: public.users 조회 (활성 멤버만)
    const { data: publicUsers, error } = await supabase
      .from("users")
      .select("*");
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const members = (publicUsers ?? []).map((u: Record<string, string>) => ({
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? "",
      role: (u.role ?? "member") as "admin" | "member",
      status: "active" as const,
      created_at: u.created_at,
    }));

    return NextResponse.json({ members });
  }
}
