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

const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15 MB limit (96kbps 2-min audio is only ~1.4MB)
const BUCKET_NAME = "practice-recordings";

export async function POST(req: NextRequest) {
  // Rate limiting: Max 20 uploads per 10 minutes per IP
  const rateLimit = checkRateLimit(req, {
    prefix: "audio_upload",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: `Quá nhiều lượt tải lên. Vui lòng thử lại sau ${rateLimit.resetInSeconds} giây.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetInSeconds) },
      }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const topicSlug = (formData.get("slug") as string | null) || "speaking";

    if (!audioFile) {
      return NextResponse.json({ error: "Không tìm thấy file ghi âm" }, { status: 400 });
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: "Dung lượng file vượt quá giới hạn 15MB" },
        { status: 400 }
      );
    }

    // Verify student identity from cookie session
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get("student_session")?.value;
    let studentId = "anonymous";
    let className = "public";

    if (studentCookie) {
      try {
        const parsed = JSON.parse(studentCookie);
        if (parsed.id) studentId = String(parsed.id).replace(/[^a-zA-Z0-9-_]/g, "");
        if (parsed.class_name) className = String(parsed.class_name).replace(/[^a-zA-Z0-9-_]/g, "");
      } catch {
        // ignore
      }
    }

    const supabase = getAdminClient();

    // Ensure bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
      if (!bucketExists) {
        await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_AUDIO_SIZE,
          allowedMimeTypes: [
            "audio/webm",
            "audio/mp4",
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/ogg",
            "audio/aac",
            "audio/x-m4a",
          ],
        });
      }
    } catch {
      // Continue if bucket creation cannot be verified via API
    }

    const fileExt = audioFile.name?.split(".").pop() || "webm";
    const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "webm";
    const cleanSlug = topicSlug.toLowerCase().replace(/[^a-z0-9-_]/g, "") || "speaking";
    const timestamp = Date.now();
    const filePath = `recordings/${className}/${studentId}/${cleanSlug}_${timestamp}.${cleanExt}`;

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: audioFile.type || "audio/webm",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Không thể lưu trữ vào Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      audio_url: publicUrlData.publicUrl,
      path: filePath,
      file_size_kb: Math.round(audioFile.size / 1024),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Tải lên thất bại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
