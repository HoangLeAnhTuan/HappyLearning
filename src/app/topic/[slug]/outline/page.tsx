import { createClient } from "@/lib/supabase/server";
import { verifyStudentOrTeacherSession } from "@/lib/auth-guard";
import type { Topic } from "@/lib/types";
import seedData from "@/lib/seed-data.json";
import { notFound, redirect } from "next/navigation";
import { OutlineClient } from "@/components/OutlineClient";

async function getTopic(slug: string): Promise<Topic | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .eq("slug", slug)
      .single();
    if (!error && data) return data as Topic;
  } catch {
    // fall through
  }
  // Fallback to seed data
  if ((seedData as { slug: string }).slug === slug) {
    return {
      ...(seedData as Omit<Topic, "id" | "motivational_quotes" | "created_at" | "updated_at">),
      id: "seed-fallback",
      motivational_quotes: [
        "💪 Every word you speak makes you stronger!",
        "🌟 Mistakes are proof that you're learning!",
        "🚀 Small steps every day = big results!",
        "🎤 Speak with confidence – you've got this!",
        "🏆 Practice today, shine in the exam!",
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return null;
}

export default async function OutlinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Server-side Guard: Block unauthenticated users from viewing/practicing outline
  const { isAuthenticated } = await verifyStudentOrTeacherSession();
  if (!isAuthenticated) {
    redirect(`/student/login?redirect=${encodeURIComponent(`/topic/${slug}/outline`)}`);
  }

  const topic = await getTopic(slug);
  if (!topic) notFound();
  return <OutlineClient topic={topic} />;
}
