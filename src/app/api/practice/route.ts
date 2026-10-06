import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyTeacherSession } from "@/lib/auth-guard";
import {
  getAdminClient,
  fetchCombinedPracticeLogs,
  deletePracticeLog,
} from "@/lib/practice-service";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/practice - Get all practice logs with Storage Audio URLs (Teacher Only)
export async function GET() {
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const sessions = await fetchCombinedPracticeLogs();
    return NextResponse.json({ sessions });
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

    // Verify identity from trusted cookie/session
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

    // Resolve topic_id: If invalid or non-UUID, try looking up from DB by slug or default
    let topic_id = body?.topic_id;
    if (!topic_id || typeof topic_id !== "string" || !UUID_REGEX.test(topic_id)) {
      const slug = typeof body?.slug === "string" ? body.slug : undefined;
      if (slug) {
        const { data: matchedTopic } = await supabase
          .from("topics")
          .select("id")
          .eq("slug", slug)
          .single();
        if (matchedTopic?.id) {
          topic_id = matchedTopic.id;
        }
      }

      if (!topic_id || !UUID_REGEX.test(topic_id)) {
        const { data: firstTopic } = await supabase.from("topics").select("id").limit(1).single();
        topic_id = firstTopic?.id || null;
      }
    }

    // Role mapping: Satisfies schema check constraint ('solo', 'pair') while retaining context
    const rawRole = typeof body?.role === "string" ? body.role.toLowerCase() : "speaker";
    const mappedRole =
      rawRole === "speaker" || rawRole === "solo"
        ? "solo"
        : rawRole === "listener" || rawRole === "pair"
        ? "pair"
        : "solo";

    const rawDuration = typeof body?.duration_seconds === "number" ? body.duration_seconds : 120;
    const duration_seconds = Math.max(1, Math.min(7200, Math.round(rawDuration)));

    const rawColloc =
      typeof body?.collocations_heard_count === "number"
        ? body.collocations_heard_count
        : 0;
    const collocations_heard_count = Math.max(0, Math.min(100, Math.round(rawColloc)));

    const audio_url =
      typeof body?.audio_url === "string" && body.audio_url.startsWith("http")
        ? body.audio_url.slice(0, 1000)
        : null;

    // Construct insert payload
    const insertPayload: Record<string, unknown> = {
      student_nickname: verifiedNickname,
      role: mappedRole,
      duration_seconds,
      collocations_heard_count,
      created_at: new Date().toISOString(),
    };

    if (topic_id && UUID_REGEX.test(topic_id)) {
      insertPayload.topic_id = topic_id;
    }
    if (verifiedStudentId) {
      insertPayload.student_id = verifiedStudentId;
    }
    if (verifiedClassName) {
      insertPayload.class_name = verifiedClassName;
    }
    if (audio_url) {
      insertPayload.audio_url = audio_url;
    }

    // Try insert (handles both schema with audio_url and schema without audio_url)
    let insertResult = await supabase
      .from("practice_sessions")
      .insert(insertPayload)
      .select()
      .single();

    // If audio_url column doesn't exist in remote table, insert without audio_url column
    if (insertResult.error && insertResult.error.code === "PGRST204") {
      delete insertPayload.audio_url;
      insertResult = await supabase
        .from("practice_sessions")
        .insert(insertPayload)
        .select()
        .single();
    }

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ session: insertResult.data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record practice session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/practice - Delete a practice session and its Storage Audio File (Teacher Only)
export async function DELETE(req: NextRequest) {
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const storagePath = searchParams.get("storage_path");
    const audioUrl = searchParams.get("audio_url");

    if (!id && !storagePath && !audioUrl) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp ID hoặc đường dẫn file cần xóa." },
        { status: 400 }
      );
    }

    const result = await deletePracticeLog(id || "", storagePath, audioUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Đã xóa bài luyện tập và file ghi âm thành công." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete practice session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
