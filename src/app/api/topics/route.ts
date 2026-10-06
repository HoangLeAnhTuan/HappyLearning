import { createClient } from "@supabase/supabase-js";
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

// GET /api/topics - List all topics
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("topics")
      .select("id, slug, title, cue_card, steps, collocations, motivational_quotes, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ topics: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch topics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/topics - Create a new topic (Teacher Only)
export async function POST(req: NextRequest) {
  // Instruction 2: Route-level authorization check
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const supabase = getAdminClient();
    const body = await req.json();

    // Instruction 4: Anti-mass-assignment whitelist & validation
    const rawTitle = typeof body?.title === "string" ? body.title : "";
    const rawSlug = typeof body?.slug === "string" ? body.slug : "";

    const title = rawTitle.trim().slice(0, 200);
    const slug = rawSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 100);

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Tiêu đề (title) và đường dẫn (slug) là bắt buộc." },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("topics")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Đường dẫn (slug) này đã tồn tại. Vui lòng chọn slug khác." },
        { status: 400 }
      );
    }

    const newTopic = {
      slug,
      title,
      cue_card: body.cue_card && typeof body.cue_card === "object" ? body.cue_card : { prompt: title, bullet_points: [] },
      steps: Array.isArray(body.steps) ? body.steps : [],
      collocations: Array.isArray(body.collocations) ? body.collocations : [],
      motivational_quotes: Array.isArray(body.motivational_quotes)
        ? body.motivational_quotes
        : [
            "Every word you speak makes you stronger!",
            "Mistakes are proof that you are learning!",
            "Small steps every day = big results!",
            "Speak with confidence – you have got this!",
            "Practice today, shine in the exam!",
          ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("topics")
      .insert(newTopic)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ topic: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
