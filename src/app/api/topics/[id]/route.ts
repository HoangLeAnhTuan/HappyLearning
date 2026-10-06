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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/topics/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid topic ID format" }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("topics")
      .select("id, slug, title, cue_card, steps, collocations, motivational_quotes, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    return NextResponse.json({ topic: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/topics/[id] - Update Topic (Teacher Only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Instruction 2: Route-level authorization check
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid topic ID format" }, { status: 400 });
    }

    const supabase = getAdminClient();
    const body = await req.json();

    // Instruction 4: Anti-mass-assignment whitelist
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.title === "string" && body.title.trim()) {
      updatePayload.title = body.title.trim().slice(0, 200);
    }

    if (typeof body?.slug === "string" && body.slug.trim()) {
      const cleanSlug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 100);
      const { data: existing } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", cleanSlug)
        .neq("id", id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "A topic with this slug already exists. Please choose a unique slug." },
          { status: 400 }
        );
      }
      updatePayload.slug = cleanSlug;
    }

    if (body?.cue_card && typeof body.cue_card === "object") {
      updatePayload.cue_card = body.cue_card;
    }
    if (Array.isArray(body?.steps)) {
      updatePayload.steps = body.steps;
    }
    if (Array.isArray(body?.collocations)) {
      updatePayload.collocations = body.collocations;
    }
    if (Array.isArray(body?.motivational_quotes)) {
      updatePayload.motivational_quotes = body.motivational_quotes;
    }

    const { data, error } = await supabase
      .from("topics")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ topic: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/topics/[id] - Delete Topic (Teacher Only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Instruction 2: Route-level authorization check
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid topic ID format" }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { error } = await supabase.from("topics").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Topic deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
