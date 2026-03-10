import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase 미설정" }, { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || callerProfile.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const admin = createAdminClient();

  // auth.users 전체 조회 (초대 대기 포함)
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // public.users 조회 (role, name 포함)
  const { data: publicUsers } = await admin.from("users").select("*");
  const publicMap = new Map((publicUsers ?? []).map((u: Record<string, string>) => [u.id, u]));

  const members = authData.users.map((au) => {
    const pub = publicMap.get(au.id) as Record<string, string> | undefined;
    return {
      id: au.id,
      name: (pub?.name ?? au.user_metadata?.name ?? "") as string,
      email: au.email ?? "",
      role: (pub?.role ?? au.user_metadata?.role ?? "member") as "admin" | "member",
      status: (au.confirmed_at ? "active" : "pending") as "active" | "pending",
      created_at: au.created_at,
    };
  });

  return NextResponse.json({ members });
}
