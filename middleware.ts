import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase 미설정 시 통과
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 세션 갱신 + 사용자 확인 (getUser가 getSession보다 안전)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = pathname === "/login";
  const isAuthRoute = pathname.startsWith("/auth/"); // /auth/callback, /auth/signup 등
  const isApiRoute = pathname.startsWith("/api/");

  // 미로그인 + 공개 경로 아님 → /login 으로 리다이렉트
  if (!user && !isLoginPage && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 로그인 됨 + 로그인 페이지 → / 으로 리다이렉트
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // /accounting/* 접근 제어
  if (user && pathname.startsWith("/accounting")) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      // service role 클라이언트로 team_members 조회
      const adminSupabase = createServerClient(supabaseUrl, serviceRoleKey, {
        cookies: { getAll: () => [], setAll: () => {} },
      });

      const { data: profile } = await adminSupabase
        .from("team_members")
        .select("role, accounting_access")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = profile?.role === "admin" || user.email === process.env.ADMIN_EMAIL;
      const hasAccess = isAdmin || profile?.accounting_access === true;

      if (!hasAccess) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "?denied=accounting";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
