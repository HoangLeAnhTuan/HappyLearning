import { createClient } from "@/lib/supabase/server";
import { verifyStudentOrTeacherSession } from "@/lib/auth-guard";
import type { Topic } from "@/lib/types";
import seedData from "@/lib/seed-data.json";
import {
  BookOpen,
  Mic,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  GraduationCap,
  Lock,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { StudentAccessBar } from "@/components/StudentAccessBar";

async function getTopics(): Promise<Topic[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as Topic[];
    }
  } catch {
    // DB not ready yet — fall through to seed data
  }

  return [
    {
      ...seedData,
      id: "seed-fallback",
      motivational_quotes: [
        "Every word you speak makes you stronger",
        "Mistakes are proof that you are learning",
        "Small steps every day lead to big results",
        "Speak with confidence – you have got this",
        "Practice today, shine tomorrow",
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export default async function HomePage() {
  const [topics, auth] = await Promise.all([
    getTopics(),
    verifyStudentOrTeacherSession(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white py-4 px-6 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[960px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black font-heading text-sm shadow-sm">
              HL
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                HappyLearning Speaking Studio
              </div>
              <h1 className="text-base sm:text-lg font-bold font-heading tracking-tight text-white m-0">
                Luyện Nói Tiếng Anh 2 Phút
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 transition-all shadow-xs active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Cổng Giáo Viên
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[960px] mx-auto w-full px-4 py-8 space-y-8">
        {/* Student Access Code Bar */}
        <StudentAccessBar />

        {/* Practice Topics Section */}
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 m-0">
                  Chủ Đề Luyện Nói
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                {auth.isAuthenticated
                  ? "Chọn chủ đề bên dưới để xem dàn ý mẫu 7 bước, luyện phát âm và bấm giờ nói 2 phút"
                  : "Nhập mã học viên phía trên hoặc bấm vào chủ đề để mở khóa luyện tập"}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-sm font-bold bg-white text-slate-700 border border-slate-200 px-4 py-1.5 rounded-full shadow-2xs">
              {auth.isAuthenticated ? (
                <>
                  <Unlock className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Đã mở khóa ({topics.length} Chủ đề)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>{topics.length} Chủ đề (Yêu cầu mã)</span>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {topics.map((topic) => (
              <TopicCard
                key={topic.id || topic.slug}
                topic={topic}
                isUnlocked={auth.isAuthenticated}
              />
            ))}
          </div>

          {topics.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
              <p className="text-base font-bold text-slate-700">
                Chưa có chủ đề nào trong hệ thống.
              </p>
              <p className="text-sm text-slate-500">
                Vui lòng đăng nhập Cổng Giáo Viên để tạo bài học mới.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-slate-500 font-medium border-t border-slate-200 bg-white flex flex-col items-center gap-2 mt-auto">
        <div className="font-semibold text-slate-700">
          HappyLearning Speaking Studio • Teacher Tracey Le
        </div>
        <Link
          href="/teacher"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Đăng nhập Giáo Viên & Quản Lý Mã Học Viên
        </Link>
      </footer>
    </div>
  );
}

function TopicCard({
  topic,
  isUnlocked,
}: {
  topic: Topic;
  isUnlocked: boolean;
}) {
  const collocationCount = (topic.collocations || []).reduce(
    (sum, cat) => sum + (cat.items?.length || 0),
    0
  );

  const outlineHref = isUnlocked
    ? `/topic/${topic.slug}/outline`
    : `/student/login?redirect=${encodeURIComponent(`/topic/${topic.slug}/outline`)}`;

  const showtimeHref = isUnlocked
    ? `/topic/${topic.slug}/showtime`
    : `/student/login?redirect=${encodeURIComponent(`/topic/${topic.slug}/showtime`)}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> {topic.steps?.length || 0} Bước
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> {collocationCount} Collocations
          </span>
          {!isUnlocked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 ml-auto">
              <Lock className="w-3 h-3 text-slate-500" /> Cần Mã
            </span>
          )}
        </div>

        <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 leading-snug m-0">
          {topic.title}
        </h3>

        {topic.cue_card?.bullet_points && topic.cue_card.bullet_points.length > 0 && (
          <ul className="text-sm text-slate-600 space-y-1 pl-5 list-disc marker:text-indigo-400 font-medium mt-1">
            {topic.cue_card.bullet_points.slice(0, 3).map((bp) => (
              <li key={bp} className="line-clamp-1">
                {bp}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100">
        <Link
          href={outlineHref}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-bold py-3 rounded-2xl border border-slate-200 transition-all cursor-pointer active:scale-95"
        >
          {isUnlocked ? (
            <>
              <BookOpen className="w-4 h-4 text-indigo-700" /> Xem Dàn Ý
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-slate-500" /> Mở Dàn Ý
            </>
          )}
        </Link>
        <Link
          href={showtimeHref}
          className={`flex-1 inline-flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-2xl transition-all shadow-sm cursor-pointer active:scale-95 font-heading ${
            isUnlocked
              ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              : "bg-slate-800 hover:bg-slate-900"
          }`}
        >
          {isUnlocked ? (
            <>
              <Mic className="w-4 h-4" /> Show Time <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-300" /> Vào Show Time
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
