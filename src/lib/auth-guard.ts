import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Student } from "@/lib/types";

export async function verifyTeacherSession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        unauthorizedResponse: NextResponse.json(
          { error: "Yêu cầu đăng nhập tài khoản giáo viên để thực hiện thao tác này." },
          { status: 401 }
        ),
      };
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

export async function verifyStudentOrTeacherSession(): Promise<{
  student: Student | null;
  teacherUser: { id: string; email?: string } | null;
  isAuthenticated: boolean;
}> {
  let student: Student | null = null;
  let teacherUser = null;

  // 1. Check student session cookie
  try {
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get("student_session")?.value;
    if (studentCookie) {
      student = JSON.parse(studentCookie);
    }
  } catch {
    student = null;
  }

  // 2. Check teacher auth session
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      teacherUser = { id: user.id, email: user.email };
    }
  } catch {
    teacherUser = null;
  }

  return {
    student,
    teacherUser,
    isAuthenticated: Boolean(student || teacherUser),
  };
}
