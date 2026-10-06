"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Student } from "@/lib/types";
import {
  KeyRound,
  LogOut,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function StudentAccessBar() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check active student session
    fetch("/api/students/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.student) {
          setStudent(data.student);
        }
      })
      .catch(() => {});
  }, []);

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
        throw new Error(data.error || "Mã không hợp lệ hoặc chưa kích hoạt");
      }

      setStudent(data.student);
      setAccessCode("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xác thực thất bại";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/students/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setStudent(null);
    router.refresh();
  };

  if (student) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-300 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black font-heading text-xl shadow-sm">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Đã Kích Hoạt Mã Học Viên
                </span>
                <span className="text-xs sm:text-sm font-mono bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg font-bold">
                  {student.access_code}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-heading text-slate-900 mt-1">
                {student.name}{" "}
                <span className="text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 ml-1">
                  Lớp {student.class_name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4 text-slate-500" /> Đổi tài khoản
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0 font-heading">
                Nhập Mã Học Viên Để Mở Khóa Luyện Tập
              </h3>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 hidden sm:inline-block">
                Bắt buộc
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              Nhập mã định danh cá nhân do cô Tracey cấp (VD:{" "}
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                HL-K12-7K9A
              </span>
              ) để mở khóa dàn ý và ghi âm bài nói.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center gap-3 pt-1">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            required
            placeholder="Nhập mã truy cập (VD: HL-K12-7K9A)..."
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-base font-mono tracking-wider font-bold bg-slate-50 text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !accessCode.trim()}
          className="w-full sm:w-auto h-[48px] px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm sm:text-base font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 font-heading"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Kích Hoạt Mã</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
