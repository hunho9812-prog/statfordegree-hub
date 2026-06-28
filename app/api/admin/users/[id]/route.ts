import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/auth";

async function getCallerProfile(req: NextRequest) {
  const supabase = createServerClient(getSupabaseUrl(), getServerAnonKey(), {
    cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("team_members")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  // 관리자 이메일이면 프로필이 없어도 admin으로 처리
  if (!profile && user.email === ADMIN_EMAIL) {
    return { id: user.id, role: "admin" as const };
  }

  return profile;
}

// PATCH /api/admin/users/[id] — 역할 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getCallerProfile(req);
  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (id === caller.id) {
    return NextResponse.json({ error: "자신의 권한은 변경할 수 없습니다." }, { status: 400 });
  }

  // Build update object from allowed fields
  const update: Record<string, unknown> = {};
  if ("role" in body) {
    if (!["admin", "member"].includes(body.role)) {
      return NextResponse.json({ error: "잘못된 role 값" }, { status: 400 });
    }
    update.role = body.role;
  }
  if ("accounting_access" in body) {
    update.accounting_access = Boolean(body.accounting_access);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("team_members").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    // team_members에서 먼저 삭제
    await admin.from("team_members").delete().eq("id", id);
    // auth.users에서 삭제
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "삭제 실패" },
      { status: 500 }
    );
  }
}
