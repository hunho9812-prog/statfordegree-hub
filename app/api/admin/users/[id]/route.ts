import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

async function getCallerProfile(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return profile;
}

// PATCH /api/admin/users/[id] — 권한 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getCallerProfile(req);
  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
  const { role } = await req.json();
  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "잘못된 role 값" }, { status: 400 });
  }

  // 자기 자신 권한 변경 방지
  if (id === caller.id) {
    return NextResponse.json({ error: "자신의 권한은 변경할 수 없습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ role }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — 팀원 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getCallerProfile(req);
  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;

  if (id === caller.id) {
    return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    // auth.users에서 삭제하면 CASCADE로 public.users도 삭제됨
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "삭제 실패" },
      { status: 500 }
    );
  }
}
