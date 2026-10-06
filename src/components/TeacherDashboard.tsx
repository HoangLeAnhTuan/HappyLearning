"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Topic, Student, PracticeSession } from "@/lib/types";
import { TopicEditor } from "@/components/TopicEditor";
import { AudioPlayerModal } from "@/components/AudioPlayerModal";
import {
  BookOpen,
  Mic,
  Plus,
  Edit2,
  Trash2,
  Copy,
  LogOut,
  Users,
  Search,
  Layers,
  Clock,
  Sparkles,
  ExternalLink,
  KeyRound,
  Check,
  UserPlus,
  GraduationCap,
  Filter,
  FileAudio,
  Volume2,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";

function generateCopySlug(slug: string) {
  const rand = Math.random().toString(36).substring(2, 6);
  return `${slug}-copy-${rand}`;
}

interface TeacherDashboardProps {
  initialTopics: Topic[];
  initialStudents?: Student[];
  initialLogs?: PracticeSession[];
  userEmail?: string;
  userName?: string;
}

export function TeacherDashboard({
  initialTopics,
  initialStudents = [],
  initialLogs = [],
  userEmail,
  userName,
}: TeacherDashboardProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [practiceLogs, setPracticeLogs] = useState<PracticeSession[]>(initialLogs);
  const [activeTab, setActiveTab] = useState<"topics" | "students" | "logs">("topics");

  // Topic Editing State
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");

  // Student Form State
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentSuccess, setStudentSuccess] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Practice Logs State
  const [selectedAudioLog, setSelectedAudioLog] = useState<PracticeSession | null>(null);
  const [logPendingDelete, setLogPendingDelete] = useState<PracticeSession | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Fetch functions
  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      if (data.topics) setTopics(data.topics);
    } catch {
      // ignore
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (data.students) setStudents(data.students);
    } catch {
      // ignore
    }
  };

  const fetchLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const res = await fetch("/api/practice");
      const data = await res.json();
      if (data.sessions) setPracticeLogs(data.sessions);
    } catch {
      // ignore
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!logPendingDelete) return;

    const targetLog = logPendingDelete;
    setIsDeletingLog(true);
    try {
      const params = new URLSearchParams();
      if (targetLog.id) params.set("id", targetLog.id);
      if (targetLog.storage_path) params.set("storage_path", targetLog.storage_path);
      if (targetLog.audio_url) params.set("audio_url", targetLog.audio_url);

      const res = await fetch(`/api/practice?${params.toString()}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xóa lượt luyện tập");
      }
      setPracticeLogs((prev) => prev.filter((l) => l.id !== targetLog.id));
      setLogPendingDelete(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setIsDeletingLog(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const [tRes, sRes, lRes] = await Promise.all([
          fetch("/api/topics"),
          fetch("/api/students"),
          fetch("/api/practice"),
        ]);
        if (!active) return;
        const [tData, sData, lData] = await Promise.all([
          tRes.json(),
          sRes.json(),
          lRes.json(),
        ]);
        if (!active) return;
        if (tData.topics) setTopics(tData.topics);
        if (sData.students) setStudents(sData.students);
        if (lData.sessions) setPracticeLogs(lData.sessions);
      } catch {
        // ignore
      }
    };
    loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/teacher/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/teacher/login");
    router.refresh();
  };

  // ── Topic Handlers ──────────────────────────────────────────────────────────
  const handleSaveTopic = async (topicData: Partial<Topic>) => {
    if (editingTopic && editingTopic.id !== "seed-fallback") {
      const res = await fetch(`/api/topics/${editingTopic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật chủ đề");
    } else {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo chủ đề mới");
    }

    await fetchTopics();
    setEditingTopic(null);
    setIsCreatingTopic(false);
  };

  const handleDeleteTopic = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa chủ đề "${title}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/topics/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi khi xóa chủ đề");
        return;
      }
      setTopics(topics.filter((t) => t.id !== id));
    } catch {
      alert("Lỗi kết nối khi xóa chủ đề");
    }
  };

  const handleDuplicateTopic = async (topic: Topic) => {
    const duplicatedSlug = generateCopySlug(topic.slug);
    const duplicatedTitle = `${topic.title} (Bản sao)`;

    // Deep clone to ensure completely independent record
    const cloneData = JSON.parse(JSON.stringify(topic));
    delete cloneData.id;
    delete cloneData.created_at;
    delete cloneData.updated_at;

    cloneData.slug = duplicatedSlug;
    cloneData.title = duplicatedTitle;
    if (cloneData.cue_card) {
      cloneData.cue_card.prompt = duplicatedTitle;
    }

    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloneData),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi khi nhân bản chủ đề");
        return;
      }
      await fetchTopics();
    } catch {
      alert("Lỗi kết nối khi nhân bản chủ đề");
    }
  };

  // ── Student Handlers ────────────────────────────────────────────────────────
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    setStudentSuccess(null);
    setCreatingStudent(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName.trim(),
          class_name: studentClass.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo học viên");
      }

      setStudentSuccess(data.student);
      setStudentName("");
      await fetchStudents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi tạo học viên";
      setStudentError(msg);
    } finally {
      setCreatingStudent(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa học viên "${name}"?`)) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Lỗi khi xóa học viên");
        return;
      }
      setStudents(students.filter((s) => s.id !== id));
    } catch {
      alert("Lỗi khi xóa học viên");
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // ── Filtered Data ───────────────────────────────────────────────────────────
  const filteredTopics = topics.filter(
    (t) =>
      t.title.toLowerCase().includes(topicSearch.toLowerCase()) ||
      t.slug.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const distinctClasses = Array.from(new Set(students.map((s) => s.class_name).filter(Boolean)));

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.access_code.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.class_name.toLowerCase().includes(studentSearch.toLowerCase());

    const matchesClass =
      selectedClassFilter === "all" || s.class_name === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  // Render TopicEditor view
  if (isCreatingTopic || editingTopic) {
    return (
      <TopicEditor
        initialTopic={editingTopic}
        onSave={handleSaveTopic}
        onCancel={() => {
          setIsCreatingTopic(false);
          setEditingTopic(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Status Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 truncate max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate">Giáo viên: {userName || "Tracey Le"} {userEmail ? `(${userEmail})` : ""}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingTopic(null);
              setIsCreatingTopic(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Tạo Chủ Đề Mới
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Đăng xuất"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Đăng Xuất</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-4.5 flex items-center gap-3.5 sm:gap-4 shadow-xs">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-heading text-slate-900 leading-tight">
              {topics.length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Chủ Đề Luyện Nói
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-4.5 flex items-center gap-3.5 sm:gap-4 shadow-xs">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-heading text-slate-900 leading-tight">
              {students.length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Học Sinh Có Mã
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-4.5 flex items-center gap-3.5 sm:gap-4 shadow-xs">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-heading text-slate-900 leading-tight">
              {practiceLogs.length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Lượt Luyện Tập
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex gap-2 flex-wrap w-full">
          <button
            type="button"
            onClick={() => setActiveTab("topics")}
            className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "topics"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" /> <span className="truncate">Chủ Đề ({topics.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("students");
              fetchStudents();
            }}
            className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "students"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <KeyRound className="w-4 h-4 shrink-0" /> <span className="truncate">Học Sinh &amp; Mã ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("logs");
              fetchLogs();
            }}
            className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "logs"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" /> <span className="truncate">Nhật Ký ({practiceLogs.length})</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: Topics Management ───────────────────────────────────────── */}
      {activeTab === "topics" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm chủ đề theo tên hoặc slug..."
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          <div className="space-y-3">
            {filteredTopics.map((t) => {
              const collocationCount = (t.collocations || []).reduce(
                (sum, c) => sum + (c.items?.length || 0),
                0
              );
              const isSeed = t.id === "seed-fallback";

              return (
                <div
                  key={t.id || t.slug}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        /{t.slug}
                      </span>
                      {isSeed && (
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          Chủ đề mẫu
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug m-0">
                      {t.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>{t.steps?.length || 0} Bước hướng dẫn</span>
                      <span>•</span>
                      <span>{collocationCount} Cụm Collocations</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/topic/${t.slug}/outline`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
                      title="Xem Dàn Ý"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Dàn ý <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <Link
                      href={`/topic/${t.slug}/showtime`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
                      title="Xem Show Time"
                    >
                      <Mic className="w-3.5 h-3.5" /> Show Time <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicateTopic(t)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                      title="Nhân bản chủ đề (Deep Copy)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTopic(t)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                      title="Chỉnh sửa chủ đề"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Sửa
                    </button>
                    {!isSeed && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(t.id, t.title)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                        title="Xóa chủ đề"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTopics.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Không tìm thấy chủ đề nào. Nhấn &quot;Tạo Chủ Đề Mới&quot; để thêm bài học.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Student & Access Code Management ────────────────────────── */}
      {activeTab === "students" && (
        <div className="space-y-6">
          {/* Add Student Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Thêm Học Sinh &amp; Cấp Mã Truy Cập Tự Động
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hệ thống sẽ tự động tạo mã định danh theo chuẩn (VD: HL-K12-7K9A) cho học sinh đăng nhập.
                </p>
              </div>
            </div>

            {studentError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {studentError}
              </div>
            )}

            {studentSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Đã cấp mã thành công cho học sinh {studentSuccess.name} (Lớp {studentSuccess.class_name}):
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-950 tracking-wider">
                    {studentSuccess.access_code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(studentSuccess.access_code)}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs self-start sm:self-center"
                >
                  {copiedCode === studentSuccess.access_code ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Đã sao chép!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Sao chép mã
                    </>
                  )}
                </button>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Thùy Trúc"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base sm:text-sm bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lớp / Khóa học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Grade-9A hoặc Speaking-K12"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  list="classes-list"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base sm:text-sm bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <datalist id="classes-list">
                  {distinctClasses.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={creatingStudent}
                  className="w-full h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {creatingStudent ? "Đang tạo..." : "Tạo Mã"}
                </button>
              </div>
            </form>
          </div>

          {/* Student Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên, lớp hoặc mã truy cập..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            {distinctClasses.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  aria-label="Lọc theo lớp học"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả các lớp ({students.length})</option>
                  {distinctClasses.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c} ({students.filter((s) => s.class_name === c).length})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Student List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Học Sinh</th>
                  <th className="p-3.5">Lớp</th>
                  <th className="p-3.5">Mã Truy Cập</th>
                  <th className="p-3.5">Số Bài Đã Luyện</th>
                  <th className="p-3.5">Ngày Cấp</th>
                  <th className="p-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {st.name.charAt(0).toUpperCase()}
                        </div>
                        <div>{st.name}</div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-xs text-slate-700">
                        {st.class_name}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg px-2.5 py-1">
                        <span className="font-mono font-bold text-indigo-700 text-xs">
                          {st.access_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(st.access_code)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors cursor-pointer p-0.5"
                          title="Sao chép mã"
                        >
                          {copiedCode === st.access_code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                        {st.practice_count || 0} bài
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 text-xs">
                      {new Date(st.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(st.id, st.name)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer inline-flex items-center gap-1 text-xs"
                        title="Xóa học viên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-sm font-medium text-slate-500">
                Chưa có học sinh nào. Hãy nhập Họ tên &amp; Lớp ở biểu mẫu trên để cấp mã truy cập.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Practice Activity Logs ──────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-indigo-600" /> Nhật Ký &amp; Bản Ghi Âm Luyện Nói
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Nghe lại bài nói với trình phát thông minh (tua ±5s/±10s, chỉnh tốc độ, âm lượng) và quản lý lưu trữ.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={isRefreshingLogs}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                title="Làm mới danh sách"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? "animate-spin text-indigo-600" : ""}`} />
                <span>Làm mới</span>
              </button>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl">
                Tổng cộng: {practiceLogs.length} bài
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 whitespace-nowrap">Học Sinh</th>
                  <th className="p-3.5 whitespace-nowrap">Lớp</th>
                  <th className="p-3.5">Chủ Đề</th>
                  <th className="p-3.5 whitespace-nowrap">Hình Thức</th>
                  <th className="p-3.5 whitespace-nowrap">Collocations</th>
                  <th className="p-3.5 whitespace-nowrap">Bản Ghi Âm</th>
                  <th className="p-3.5 whitespace-nowrap">Thời Gian</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {practiceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                      {log.student_nickname || "Khách (Anonymous)"}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {log.class_name ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-xs text-slate-700">
                          {log.class_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium min-w-[180px] max-w-[280px]">
                      <span className="line-clamp-2" title={log.topics?.title || "Speaking Practice"}>
                        {log.topics?.title || "Speaking Practice"}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="capitalize px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-xs text-slate-700">
                        {log.role === "pair"
                          ? "Theo cặp"
                          : log.role === "listener"
                          ? "Người nghe"
                          : "Cá nhân (Speaker)"}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-indigo-600 whitespace-nowrap">
                      {log.collocations_heard_count} cụm từ
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {log.audio_url ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedAudioLog(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                            title="Mở trình phát nghe bài nói"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Nghe bài nói</span>
                          </button>
                          <a
                            href={log.audio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                            title="Tải audio về máy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Không có audio</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setLogPendingDelete(log)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer inline-flex items-center gap-1 text-xs"
                        title="Xóa bản ghi âm này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {practiceLogs.length === 0 && (
              <div className="p-8 text-center text-sm font-medium text-slate-500">
                Chưa có phiên luyện tập nào được ghi nhận. Khi học sinh luyện nói trên Show Time, dữ liệu sẽ tự động hiển thị tại đây.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── POPUP: Audio Player Modal ──────────────────────────────────────── */}
      {selectedAudioLog && (
        <AudioPlayerModal
          log={selectedAudioLog}
          onClose={() => setSelectedAudioLog(null)}
        />
      )}

      {/* ── POPUP: Custom Delete Confirmation Modal ───────────────────────── */}
      {logPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-lg font-heading">
                  Xác nhận xóa bản ghi âm?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Bản ghi âm và nhật ký luyện tập này sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu và Supabase Storage. Thao tác này không thể hoàn tác.
                </p>
              </div>

              {/* Log Details */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Học sinh:</span>
                  <span className="font-bold text-slate-800">
                    {logPendingDelete.student_nickname || "Học viên"}
                  </span>
                </div>
                {logPendingDelete.class_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Lớp:</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {logPendingDelete.class_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Chủ đề:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                    {logPendingDelete.topics?.title || "Speaking Practice"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Thời gian:</span>
                  <span className="text-slate-600">
                    {new Date(logPendingDelete.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingLog}
                onClick={() => setLogPendingDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingLog}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-60 active:scale-95"
              >
                {isDeletingLog ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
