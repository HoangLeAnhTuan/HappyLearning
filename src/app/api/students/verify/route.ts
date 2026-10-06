import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(req: NextRequest) {
  // Rate limiting: Max 10 verification attempts per 15 minutes per IP to prevent code brute-forcing
  const rateLimit = checkRateLimit(req, {
    prefix: "verify_access_code",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: `Quá nhiều lần thử mã truy cập. Vui lòng thử lại sau ${rateLimit.resetInSeconds} giây.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetInSeconds) },
      }
    );
  }

  try {
    const body = await req.json();
    const access_code = body?.access_code;

    if (!access_code || typeof access_code !== "string") {
      return NextResponse.json(
        { error: "Vui lòng nhập mã truy cập của bạn" },
        { status: 400 }
      );
    }

    const cleanCode = access_code.trim().toUpperCase();

    // Enforce reasonable format length (prevent payload bombs)
    if (cleanCode.length < 3 || cleanCode.length > 32) {
      return NextResponse.json(
        { error: "Độ dài mã truy cập không hợp lệ" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Query student by access_code (case insensitive match)
    const { data: student, error } = await supabase
      .from("students")
      .select("id, name, class_name, access_code")
      .ilike("access_code", cleanCode)
      .single();

    if (error || !student) {
      return NextResponse.json(
        {
          error:
            "Mã truy cập không hợp lệ hoặc chưa được kích hoạt. Vui lòng kiểm tra lại hoặc liên hệ cô Tracey!",
        },
        { status: 404 }
      );
    }

    // Set secure HTTP-only cookie for student persistence
    const cookieStore = await cookies();
    const sessionPayload = {
      id: student.id,
      name: student.name,
      class_name: student.class_name,
      access_code: student.access_code,
    };

    cookieStore.set("student_session", JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        class_name: student.class_name,
        access_code: student.access_code,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Xác thực mã thất bại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
