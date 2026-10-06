import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /teacher and /teacher/* routes (except /teacher/login)
  if (pathname.startsWith("/teacher") && pathname !== "/teacher/login") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/teacher/login";
      return NextResponse.redirect(url);
    }
  }

  // Check student session cookie
  const studentCookie = request.cookies.get("student_session")?.value;
  const hasStudentSession = Boolean(studentCookie);

  // Protect /topic/* routes: requires either teacher auth OR verified student session
  if (pathname.startsWith("/topic/")) {
    if (!user && !hasStudentSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/student/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect /admin to /teacher (or /teacher/login if not authenticated)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/teacher" : "/teacher/login";
    return NextResponse.redirect(url);
  }

  // If already authenticated and visiting /teacher/login, redirect to /teacher
  if (pathname === "/teacher/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/teacher";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
