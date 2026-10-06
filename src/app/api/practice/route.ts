import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyTeacherSession } from "@/lib/auth-guard";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/practice - Get recent practice logs with Audio URL (Teacher Only)
export async function GET() {
  // Instruction 2: Route authorization check
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("practice_sessions")
      .select(`
        id,
        topic_id,
        student_id,
        student_nickname,
        class_name,
        role,
        duration_seconds,
        collocations_heard_count,
        audio_url,
        created_at,
        topics (
          title,
          slug
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/practice - Log a new practice session with Supabase Storage Audio URL
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await req.json();

    // Instruction 2: Verify identity from trusted cookie/session, never rely blindly on body.student_id
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get("student_session")?.value;
    
    let verifiedStudentId: string | null = null;
    let verifiedNickname = "Học viên";
    let verifiedClassName: string | null = null;

    if (studentCookie) {
      try {
        const parsed = JSON.parse(studentCookie);
        if (parsed.id && UUID_REGEX.test(parsed.id)) {
          verifiedStudentId = parsed.id;
        }
        if (typeof parsed.name === "string" && parsed.name.trim()) {
          verifiedNickname = parsed.name.trim().slice(0, 100);
        }
        if (typeof parsed.class_name === "string" && parsed.class_name.trim()) {
          verifiedClassName = parsed.class_name.trim().slice(0, 50);
        }
      } catch {
        // invalid cookie format
      }
    }

    // Instruction 4 & 5: Strict validation and range clamping
    const topic_id = body?.topic_id;
    if (!topic_id || typeof topic_id !== "string" || !UUID_REGEX.test(topic_id)) {
      return NextResponse.json(
        { message: "Practice session recorded locally (non-database topic)" },
        { status: 200 }
      );
    }

    const rawRole = typeof body?.role === "string" ? body.role : "speaker";
    const role = ["speaker", "listener", "solo", "pair"].includes(rawRole) ? rawRole : "speaker";

    const rawDuration = typeof body?.duration_seconds === "number" ? body.duration_seconds : 120;
    const duration_seconds = Math.max(1, Math.min(7200, Math.round(rawDuration))); // Clamped 1s to 2 hours

    const rawColloc = typeof body?.collocations_heard_count === "number" ? body.collocations_heard_count : 0;
    const collocations_heard_count = Math.max(0, Math.min(100, Math.round(rawColloc)));

    const audio_url = typeof body?.audio_url === "string" && body.audio_url.startsWith("http")
      ? body.audio_url.slice(0, 1000)
      : null;

    // Construct clean payload
    const insertPayload: Record<string, unknown> = {
      topic_id,
      student_nickname: verifiedNickname,
      role,
      duration_seconds,
      collocations_heard_count,
      created_at: new Date().toISOString(),
    };

    if (verifiedStudentId) {
      insertPayload.student_id = verifiedStudentId;
    }
    if (verifiedClassName) {
      insertPayload.class_name = verifiedClassName;
    }
    if (audio_url) {
      insertPayload.audio_url = audio_url;
    }

    const { data, error } = await supabase
      .from("practice_sessions")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record practice session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
