import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const name = searchParams.get("name") ?? "download";

  if (!url) {
    return NextResponse.json({ error: "url 파라미터가 필요합니다" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "파일을 가져올 수 없습니다" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const buffer = await res.arrayBuffer();

    // RFC 5987 인코딩으로 한글 파일명 지원
    const encoded = encodeURIComponent(name).replace(/'/g, "%27");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "다운로드 중 오류가 발생했습니다" }, { status: 500 });
  }
}
