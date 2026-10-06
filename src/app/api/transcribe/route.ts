import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB max

export async function POST(req: NextRequest) {
  // Instruction 6: Rate limit paid AI transcription APIs (max 15 requests per 10 minutes per IP)
  const rateLimit = checkRateLimit(req, {
    prefix: "ai_transcribe",
    limit: 15,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: `Bạn đã thực hiện quá nhiều lượt quét AI. Vui lòng đợi ${rateLimit.resetInSeconds} giây để tiếp tục.`,
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
    const collocationsJson = formData.get("collocations") as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Không tìm thấy file audio" }, { status: 400 });
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Dung lượng file audio vượt quá giới hạn cho phép (tối đa 25MB)" },
        { status: 400 }
      );
    }

    let targetCollocations: string[] = [];
    if (collocationsJson) {
      try {
        const parsed = JSON.parse(collocationsJson);
        if (Array.isArray(parsed)) {
          targetCollocations = parsed.slice(0, 100).map((s) => String(s).slice(0, 100));
        }
      } catch {
        // ignore
      }
    }

    let transcript = "";
    const detectedCollocations: string[] = [];

    const openaiKey = process.env.OPENAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try Groq Whisper (ultra fast and cost effective)
    if (groqKey) {
      try {
        const groqForm = new FormData();
        groqForm.append("file", audioFile);
        groqForm.append("model", "whisper-large-v3");
        groqForm.append("language", "en");

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: groqForm,
        });

        if (res.ok) {
          const data = await res.json();
          transcript = data.text || "";
        }
      } catch {
        // continue to next provider
      }
    }

    // 2. Try OpenAI Whisper if transcript is still empty
    if (!transcript && openaiKey) {
      try {
        const openaiForm = new FormData();
        openaiForm.append("file", audioFile);
        openaiForm.append("model", "whisper-1");
        openaiForm.append("language", "en");

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: openaiForm,
        });

        if (res.ok) {
          const data = await res.json();
          transcript = data.text || "";
        }
      } catch {
        // continue
      }
    }

    // 3. Try Gemini Multimodal Audio if transcript is still empty
    if (!transcript && geminiKey) {
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = audioFile.type || "audio/mp3";

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "Transcribe the spoken English in this audio recording accurately. Return ONLY the English transcription text, without any conversational preface or markdown fences.",
                    },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const gemData = await geminiRes.json();
          transcript =
            gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        }
      } catch {
        // continue
      }
    }

    // Match collocations in the transcript
    if (transcript && targetCollocations.length > 0) {
      const normedTranscript = normalize(transcript);
      for (const col of targetCollocations) {
        const normedCol = normalize(col);
        if (normedCol && normedTranscript.includes(normedCol)) {
          detectedCollocations.push(col);
        }
      }
    }

    return NextResponse.json({
      success: true,
      transcript,
      detectedCollocations,
      hasAiEngine: Boolean(openaiKey || groqKey || geminiKey),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
