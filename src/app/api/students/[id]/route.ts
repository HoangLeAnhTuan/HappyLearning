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

// DELETE /api/students/[id] - Teacher Only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Instruction 2: Route-level authorization check
  const { unauthorizedResponse } = await verifyTeacherSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { id } = await params;

    // Validate ID format
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid student ID format" }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Học sinh đã được xóa thành công" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
