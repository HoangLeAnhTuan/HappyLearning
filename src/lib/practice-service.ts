import { createClient } from "@supabase/supabase-js";
import type { PracticeSession } from "@/lib/types";

const BUCKET_NAME = "practice-recordings";

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function fetchCombinedPracticeLogs(): Promise<PracticeSession[]> {
  try {
    const supabase = getAdminClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    // 1. Fetch DB sessions
    const { data: dbSessions } = await supabase
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
        created_at,
        topics (
          title,
          slug
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    // 2. Fetch all recordings from Storage bucket
    const storageFiles: Array<{
      className: string;
      studentId: string;
      fileName: string;
      filePath: string;
      audioUrl: string;
      createdAt: string;
    }> = [];

    try {
      const { data: classFolders } = await supabase.storage
        .from(BUCKET_NAME)
        .list("recordings");

      for (const cf of classFolders || []) {
        if (!cf.name || cf.name.startsWith(".")) continue;
        const { data: studentFolders } = await supabase.storage
          .from(BUCKET_NAME)
          .list(`recordings/${cf.name}`);

        for (const sf of studentFolders || []) {
          if (!sf.name || sf.name.startsWith(".")) continue;
          const { data: files } = await supabase.storage
            .from(BUCKET_NAME)
            .list(`recordings/${cf.name}/${sf.name}`);

          for (const f of files || []) {
            if (!f.name || f.name.startsWith(".")) continue;
            const filePath = `recordings/${cf.name}/${sf.name}/${f.name}`;
            const audioUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
            storageFiles.push({
              className: cf.name,
              studentId: sf.name,
              fileName: f.name,
              filePath,
              audioUrl,
              createdAt: f.created_at || f.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // Storage listing error fallback
    }

    // 3. Fetch students & topics to resolve student names and topic titles
    const { data: students } = await supabase.from("students").select("id, name, class_name");
    const studentMap = new Map((students || []).map((s) => [s.id, s]));

    const { data: topics } = await supabase.from("topics").select("id, title, slug");
    const topicMapBySlug = new Map((topics || []).map((t) => [t.slug, t]));
    const topicMapById = new Map((topics || []).map((t) => [t.id, t]));

    const combined: PracticeSession[] = [];
    const matchedStoragePaths = new Set<string>();

    // Process DB sessions
    for (const session of (dbSessions || []) as unknown as PracticeSession[]) {
      let matchedAudioUrl = session.audio_url || null;
      let storagePath: string | null = null;

      // Find matching storage file if audio_url not set
      if (!matchedAudioUrl && session.student_id) {
        const found = storageFiles.find(
          (sf) => sf.studentId === session.student_id
        );
        if (found) {
          matchedAudioUrl = found.audioUrl;
          storagePath = found.filePath;
          matchedStoragePaths.add(found.filePath);
        }
      }

      combined.push({
        ...session,
        audio_url: matchedAudioUrl,
        storage_path: storagePath,
      });
    }

    // Synthesize unlinked storage files into practice logs
    for (const sf of storageFiles) {
      if (matchedStoragePaths.has(sf.filePath)) continue;

      const student = studentMap.get(sf.studentId);
      const slugMatch = sf.fileName.split("_")[0];
      const topic = topicMapBySlug.get(slugMatch);

      combined.push({
        id: `storage_${Buffer.from(sf.filePath).toString("hex").slice(0, 32)}`,
        topic_id: topic?.id || "unknown",
        student_id: sf.studentId,
        student_nickname: student?.name || "Học viên",
        class_name: sf.className === "public" ? null : sf.className,
        role: "speaker",
        duration_seconds: 120,
        collocations_heard_count: 0,
        audio_url: sf.audioUrl,
        storage_path: sf.filePath,
        created_at: sf.createdAt,
        topics: {
          title: topic?.title || "Speaking Practice (Bản ghi âm)",
          slug: topic?.slug || slugMatch,
        },
      });
    }

    // Sort newest first
    combined.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return combined;
  } catch (err) {
    console.error("fetchCombinedPracticeLogs error:", err);
    return [];
  }
}

export async function deletePracticeLog(
  sessionId: string,
  storagePath?: string | null,
  audioUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient();
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // 1. Delete audio file from Supabase Storage if path is provided
    let fileToDelete = storagePath;

    if (!fileToDelete && audioUrl) {
      // Extract file path from audio URL
      const parts = audioUrl.split(`/${BUCKET_NAME}/`);
      if (parts.length > 1) {
        fileToDelete = parts[1];
      }
    }

    // If ID is a DB uuid, look up the record to find if there's an associated audio_url
    if (UUID_REGEX.test(sessionId) && !fileToDelete) {
      const { data: record } = await supabase
        .from("practice_sessions")
        .select("audio_url")
        .eq("id", sessionId)
        .single();
      if (record?.audio_url) {
        const parts = record.audio_url.split(`/${BUCKET_NAME}/`);
        if (parts.length > 1) {
          fileToDelete = parts[1];
        }
      }
    }

    if (fileToDelete) {
      try {
        await supabase.storage.from(BUCKET_NAME).remove([fileToDelete]);
      } catch (err) {
        console.warn("Storage deletion warning:", err);
      }
    }

    // 2. Delete database record if it's a real DB UUID
    if (UUID_REGEX.test(sessionId)) {
      const { error: dbError } = await supabase
        .from("practice_sessions")
        .delete()
        .eq("id", sessionId);

      if (dbError) {
        return { success: false, error: dbError.message };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Xóa thất bại";
    return { success: false, error: message };
  }
}
