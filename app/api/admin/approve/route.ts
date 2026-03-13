import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { userId, action } = await req.json();
  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";

  const { data: updated, error } = await supabase
    .from("users")
    .update({ status })
    .eq("id", userId)
    .select();

  if (error) {
    // status 컬럼이 없는 경우 (DB 마이그레이션 미실행)
    const msg = error.message.toLowerCase().includes("column")
      ? `DB 마이그레이션이 필요합니다: ${error.message}`
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 업데이트된 행이 없으면 ID가 잘못된 것
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "해당 사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, status });
}
