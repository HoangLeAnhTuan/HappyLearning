"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

function StudentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/students/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: accessCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Mã truy cập không tồn tại hoặc chưa kích hoạt. Vui lòng thử lại!"
        );
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xác thực thất bại";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-7 sm:p-9 shadow-sm space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs">
          <KeyRound className="w-8 h-8" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 mb-2">
            Bắt buộc để vào luyện tập
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 tracking-tight m-0">
            Mã Truy Cập Học Viên
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            Nhập mã định danh học sinh cá nhân do cô Tracey cấp để mở khóa bài học và lưu bài nói.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-rose-600 mt-1.5 shrink-0" />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Mã Truy Cập Cá Nhân
          </label>
          <div className="relative">
            <input
              type="text"
              required
              autoFocus
              placeholder="VD: HL-K12-7K9A"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 text-lg font-mono text-center tracking-widest font-bold bg-slate-50 text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 placeholder:tracking-normal placeholder:text-base focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !accessCode.trim()}
          className="w-full h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-base font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-heading"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Kích Hoạt & Bắt Đầu Học</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center space-y-3">
        <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-slate-500 font-semibold">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Tự động lưu tiến độ
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" /> Báo cáo cho giáo viên
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Chưa có mã? Vui lòng liên hệ cô Tracey để nhận mã định danh lớp học.
        </p>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white py-4 px-6 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[960px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              HL
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">
                HappyLearning Studio
              </span>
              <span className="text-xs text-slate-400 ml-2 font-mono uppercase">
                Student Access
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Về Trang Chủ
          </Link>
        </div>
      </header>

      {/* ── Form Main ─────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-500 text-sm font-medium">
              Đang tải cổng đăng nhập...
            </div>
          }
        >
          <StudentLoginForm />
        </Suspense>
      </main>

      <footer className="text-center py-6 text-sm text-slate-500 font-medium border-t border-slate-200 bg-white">
        HappyLearning Speaking Studio • Teacher Tracey Le
      </footer>
    </div>
  );
}
