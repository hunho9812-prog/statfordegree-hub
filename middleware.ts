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

  try {
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

    const isAccounting = pathname.startsWith("/accounting");
    const isManual = pathname.startsWith("/p/");
    const isCrm = pathname.startsWith("/crm");

    if (user && (isAccounting || isManual || isCrm)) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        // 접근권한 조회 자체가 실패해도 사이트 전체가 죽지 않도록 이 블록만 격리.
        // 실패 시 접근 제한을 강제하지 않고 통과시킨다 (fail-open).
        try {
          const adminSupabase = createServerClient(supabaseUrl, serviceRoleKey, {
            cookies: { getAll: () => [], setAll: () => {} },
          });

          // 새 컬럼이 아직 없을 수 있으므로 폴백 처리
          let profile: Record<string, unknown> | null = null;
          const fullFetch = await adminSupabase
            .from("team_members")
            .select("role, accounting_access, manual_access, crm_access")
            .eq("id", user.id)
            .maybeSingle();
          if (fullFetch.error) {
            const fallback = await adminSupabase
              .from("team_members")
              .select("role, accounting_access")
              .eq("id", user.id)
              .maybeSingle();
            profile = (fallback.data as Record<string, unknown>) ?? null;
          } else {
            profile = (fullFetch.data as Record<string, unknown>) ?? null;
          }

          const isAdmin = profile?.role === "admin" || user.email === process.env.ADMIN_EMAIL;

          if (isAccounting && !isAdmin && (profile?.accounting_access as boolean) !== true) {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            url.search = "?denied=accounting";
            return NextResponse.redirect(url);
          }
          if (isManual && !isAdmin && (profile?.manual_access as boolean) !== true) {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            url.search = "?denied=manual";
            return NextResponse.redirect(url);
          }
          if (isCrm && !isAdmin && (profile?.crm_access as boolean) !== true) {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            url.search = "?denied=crm";
            return NextResponse.redirect(url);
          }
        } catch (e) {
          console.error("[middleware] 접근권한 조회 실패, 요청을 통과시킴", e);
        }
      }
    }

    return response;
  } catch (e) {
    // 미들웨어에서 예상치 못한 예외가 발생해도 사이트 전체가 500으로 죽지 않도록 통과시킴
    console.error("[middleware] unexpected error, passing request through", e);
    return NextResponse.next({ request });
  }
}

export const config = {
  // api 라우트는 각자 핸들러에서 직접 인증하거나(관리자 API) 애초에 공개용(signup, download)이라
  // 미들웨어의 auth.getUser() 왕복(요청마다 Supabase Auth 서버 호출)에 의존하지 않음 — 제외해서
  // API 호출마다 불필요한 추가 네트워크 왕복이 생기지 않도록 함
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
