import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: max 5 login attempts per 15 minutes per IP
  const rateLimit = checkRateLimit(req, {
    prefix: "teacher_login",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: `Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau ${rateLimit.resetInSeconds} giây.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetInSeconds) },
      }
    );
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." },
        { status: 400 }
      );
    }

    const trimmedIdent = String(identifier).trim();
    const trimmedPass = String(password).trim();

    if (!trimmedIdent || !trimmedPass) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." },
        { status: 400 }
      );
    }

    // Support both username (e.g., 'admin', 'traceyle') and full email
    let email = trimmedIdent;
    if (!trimmedIdent.includes("@")) {
      email = `${trimmedIdent.toLowerCase()}@happylearning.vn`;
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component / Route handler
            }
          },
        },
      }
    );

    // Database-driven authentication directly with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: trimmedPass,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Tài khoản hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
