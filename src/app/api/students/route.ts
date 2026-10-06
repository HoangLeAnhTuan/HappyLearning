import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyTeacherSession } from "@/lib/auth-guard";
import type { Student } from "@/lib/types";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function generateRandomCode(length: number = 4): string {
  // Use easily readable uppercase characters (excluding easily confused 0, O, 1, I)
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeClassName(className: string): string {
  const clean = className
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove Vietnamese accents for code
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return clean.slice(0, 6) || "HL";
}

// GET /api/students - List all students (Teacher Only)
export async function GET(req: NextRequest) {
  // Instruction 2: Route-level authorization check
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const supabase = getAdminClient();
    const url = new URL(req.url);
    const classFilter = url.searchParams.get("class");

    let query = supabase
      .from("students")
      .select("id, name, class_name, access_code, created_at")
      .order("created_at", { ascending: false });

    if (classFilter) {
      query = query.eq("class_name", classFilter);
    }

    const { data: students, error } = await query;

    if (error) {
      return NextResponse.json({
        students: [],
        warning: error.message,
      });
    }

    // Fetch practice session counts per student
    const { data: sessions } = await supabase
      .from("practice_sessions")
      .select("student_id");

    const countMap: Record<string, number> = {};
    if (sessions) {
      sessions.forEach((s) => {
        if (s.student_id) {
          countMap[s.student_id] = (countMap[s.student_id] || 0) + 1;
        }
      });
    }

    const enrichedStudents: Student[] = (students || []).map((st) => ({
      ...st,
      practice_count: countMap[st.id] || 0,
    }));

    return NextResponse.json({ students: enrichedStudents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch students";
    return NextResponse.json({ error: message, students: [] }, { status: 500 });
  }
}

// POST /api/students - Create a student with unique access code (Teacher Only)
export async function POST(req: NextRequest) {
  // Instruction 2: Route-level authorization check
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const supabase = getAdminClient();
    const body = await req.json();

    // Instruction 4: Anti-mass-assignment whitelisting
    const rawName = typeof body?.name === "string" ? body.name : "";
    const rawClass = typeof body?.class_name === "string" ? body.class_name : "";

    const name = rawName.trim().slice(0, 100);
    const className = rawClass.trim().slice(0, 50);

    if (!name || !className) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Họ và tên và Lớp" },
        { status: 400 }
      );
    }

    const cleanClass = sanitizeClassName(className);

    // Generate collision-free access code on the server (client cannot override)
    let accessCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const randomPart = generateRandomCode(4);
      accessCode = `HL-${cleanClass}-${randomPart}`;

      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("access_code", accessCode)
        .single();

      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: "Không thể tạo mã duy nhất lúc này, vui lòng thử lại" },
        { status: 500 }
      );
    }

    // Strictly construct payload - no client injected fields
    const insertPayload = {
      name,
      class_name: className,
      access_code: accessCode,
      created_at: new Date().toISOString(),
    };

    const { data: student, error } = await supabase
      .from("students")
      .insert(insertPayload)
      .select("id, name, class_name, access_code, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        student: { ...student, practice_count: 0 },
        message: `Đã cấp mã ${student.access_code} thành công cho ${student.name}!`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
