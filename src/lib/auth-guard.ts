import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function verifyTeacherSession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, unauthorizedResponse: NextResponse.json(
        { error: "Yêu cầu đăng nhập tài khoản giáo viên để thực hiện thao tác này." },
        { status: 401 }
      ) };
    }

    return { user, unauthorizedResponse: null };
  } catch {
    return {
      user: null,
      unauthorizedResponse: NextResponse.json(
        { error: "Không thể xác thực phiên làm việc." },
        { status: 401 }
      ),
    };
  }
}
