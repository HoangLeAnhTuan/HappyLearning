import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get("student_session")?.value;

    if (!studentCookie) {
      return NextResponse.json({ student: null });
    }

    const student = JSON.parse(studentCookie);
    return NextResponse.json({ student });
  } catch {
    return NextResponse.json({ student: null });
  }
}
