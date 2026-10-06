import { createClient } from "@/lib/supabase/server";
import type { Topic, Student, PracticeSession } from "@/lib/types";
import seedData from "@/lib/seed-data.json";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Teacher Portal - HappyLearning",
  description: "Quản lý chủ đề và mã truy cập học sinh.",
};

async function getInitialData(): Promise<{
  topics: Topic[];
  students: Student[];
  logs: PracticeSession[];
  user: { email?: string; name?: string } | null;
}> {
  let topics: Topic[] = [];
  let students: Student[] = [];
  let logs: PracticeSession[] = [];
  let userInfo: { email?: string; name?: string } | null = null;

  try {
    const supabase = await createClient();

    // Get current authenticated teacher
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userInfo = {
        email: user.email,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.username ||
          user.email?.split("@")[0] ||
          "Teacher",
      };
    }

    // 1. Fetch Topics
    const { data: topicsData } = await supabase
      .from("topics")
      .select("*")
      .order("created_at", { ascending: false });

    if (topicsData && topicsData.length > 0) {
      topics = topicsData as Topic[];
    }

    // 2. Fetch Students
    const { data: studentsData } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (studentsData) {
      students = studentsData as Student[];
    }

    // 3. Fetch Practice Logs
    const { data: logsData } = await supabase
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
      .limit(50);

    if (logsData) {
      logs = logsData as unknown as PracticeSession[];
    }
  } catch {
    // Database or SSR init fallback
  }

  if (topics.length === 0) {
    topics = [
      {
        ...seedData,
        id: "seed-fallback",
        motivational_quotes: [
          "Every word you speak makes you stronger!",
          "Mistakes are proof that you are learning!",
          "Small steps every day = big results!",
          "Speak with confidence – you have got this!",
          "Practice today, shine in the exam!",
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  return { topics, students, logs, user: userInfo };
}

export default async function TeacherPage() {
  const { topics, students, logs, user } = await getInitialData();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white py-4 px-6 border-b border-slate-800">
        <div className="max-w-[1040px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
                HappyLearning Platform
              </div>
              <h1 className="text-lg sm:text-xl font-bold font-heading text-white tracking-tight leading-snug m-0">
                Teacher Management Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-700 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Trang Học Viên
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1040px] mx-auto w-full px-4 py-6">
        <TeacherDashboard
          initialTopics={topics}
          initialStudents={students}
          initialLogs={logs}
          userEmail={user?.email}
          userName={user?.name}
        />
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 font-medium border-t border-slate-200 bg-white mt-auto">
        HappyLearning Teacher Portal • Tracey Le
      </footer>
    </div>
  );
}
