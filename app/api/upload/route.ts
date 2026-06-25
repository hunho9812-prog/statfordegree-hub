import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, getSupabaseUrl, getServerAnonKey } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    // 1. 로그인 확인
    const supabase = createServerClient(getSupabaseUrl(), getServerAnonKey(), {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    // 2. 파일 파싱
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "파일 크기는 50MB 이하여야 합니다" }, { status: 400 });
    }

    // 3. Supabase Storage 업로드
    const admin = createAdminClient();

    // 버킷이 없으면 자동 생성 (public 버킷)
    const { error: bucketCheckError } = await admin.storage.getBucket("uploads");
    if (bucketCheckError) {
      const { error: createError } = await admin.storage.createBucket("uploads", {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      if (createError && !createError.message.includes("already exists")) {
        return NextResponse.json({ error: `버킷 생성 실패: ${createError.message}` }, { status: 500 });
      }
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._\-가-힣]/g, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from("uploads")
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 4. 공개 URL 반환
    const { data: { publicUrl } } = admin.storage.from("uploads").getPublicUrl(path);

    return NextResponse.json({ url: publicUrl, name: file.name, type: file.type });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
