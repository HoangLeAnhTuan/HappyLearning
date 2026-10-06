import { createClient } from "@/lib/supabase/server";
import type { Topic } from "@/lib/types";
import seedData from "@/lib/seed-data.json";
import { notFound } from "next/navigation";
import { ShowTimeClient } from "@/components/ShowTimeClient";

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
  if ((seedData as { slug: string }).slug === slug) {
    return {
      ...(seedData as Omit<Topic, "id" | "motivational_quotes" | "created_at" | "updated_at">),
      id: "seed-fallback",
      motivational_quotes: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return null;
}

export default async function ShowTimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopic(slug);
  if (!topic) notFound();
  return <ShowTimeClient topic={topic} />;
}
