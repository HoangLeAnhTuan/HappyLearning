"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Download,
  RotateCcw,
  Play,
  Pause,
  CheckCircle2,
  Trash2,
  Award,
  Radio,
  Headphones,
  Layers,
  Info,
  Check,
  UploadCloud,
  FileAudio,
  FastForward,
  Rewind,
  Loader2,
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { Topic } from "@/lib/types";

const SPEAKER_DURATION = 120; // 2 minutes (120 seconds) for Speaker mode
const TIMER_R = 100;
const TIMER_CIRCUM = 2 * Math.PI * TIMER_R; // 628.31853

function timerColor(t: number, total = 120) {
  const ratio = total > 0 ? t / total : 1;
  if (ratio > 0.35) return "#4338ca"; // Royal Indigo
  if (ratio > 0.15) return "#d97706"; // Amber
  return "#dc2626"; // Crimson Red
}

function getSupportedMimeType(): string | undefined {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return undefined;
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/wav",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t));
}

// Accurate helper to get precise audio duration for uploaded files
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        if (isFinite(audio.duration) && audio.duration > 0) {
          resolve(audio.duration);
        } else {
          // Fallback: try reading with Web Audio API AudioContext
          const reader = new FileReader();
          reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) return resolve(0);
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) return resolve(0);
            const ctx = new AudioCtx();
            ctx.decodeAudioData(
              arrayBuffer,
              (decoded) => resolve(decoded.duration),
              () => resolve(0)
            );
          };
          reader.onerror = () => resolve(0);
          reader.readAsArrayBuffer(file);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      };
    } catch {
      resolve(0);
    }
  });
}

// ── Speaker Circular Timer (SVG) ──────────────────────────────────────────
function SpeakerCircularTimer({
  timeLeft,
  running,
  isRecording,
}: {
  timeLeft: number;
  running: boolean;
  isRecording: boolean;
}) {
  const isFull = timeLeft >= SPEAKER_DURATION;
  const progress = timeLeft / SPEAKER_DURATION;
  const offset = TIMER_CIRCUM * (1 - progress);
  const color = timerColor(timeLeft, SPEAKER_DURATION);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="relative flex items-center justify-center w-[220px] h-[220px] sm:w-[260px] sm:h-[260px]">
      <svg
        width={260}
        height={260}
        viewBox="0 0 260 260"
        className="w-full h-full transform -rotate-90"
      >
        <circle
          cx={130}
          cy={130}
          r={TIMER_R}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={14}
        />
        {isFull ? (
          <circle
            cx={130}
            cy={130}
            r={TIMER_R}
            fill="none"
            stroke={color}
            strokeWidth={14}
          />
        ) : (
          <circle
            cx={130}
            cy={130}
            r={TIMER_R}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${TIMER_CIRCUM} ${TIMER_CIRCUM}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.85s linear, stroke 0.3s ease" }}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none p-4">
        <div
          className="font-bold tracking-tight font-mono text-slate-900 text-4xl sm:text-5xl"
          style={{ lineHeight: 1.1, color }}
        >
          {`${mins}:${secs}`}
        </div>

        {isRecording ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 animate-pulse mt-2.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" /> Đang ghi âm micro
          </div>
        ) : !running && isFull ? (
          <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mt-2">
            2 Phút Luyện Nói
          </div>
        ) : running ? (
          <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full mt-2 animate-pulse">
            Đang đếm thời gian
          </div>
        ) : (
          <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mt-2">
            Đã tạm dừng
          </div>
        )}
      </div>
    </div>
  );
}

// ── Listener Audio Circular Timer (Runs ONLY when audio is playing) ────────
function ListenerAudioCircularTimer({
  currentTime,
  totalDuration,
  isPlaying,
  hasAudio,
}: {
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  hasAudio: boolean;
}) {
  const durationSafe = totalDuration > 0 ? totalDuration : 120;
  const progress = Math.max(0, Math.min(1, currentTime / durationSafe));
  const offset = TIMER_CIRCUM * (1 - progress);

  const curMins = String(Math.floor(currentTime / 60)).padStart(2, "0");
  const curSecs = String(Math.floor(currentTime % 60)).padStart(2, "0");

  const totMins = String(Math.floor(durationSafe / 60)).padStart(2, "0");
  const totSecs = String(Math.floor(durationSafe % 60)).padStart(2, "0");

  const strokeColor = "#7c3aed"; // Purple Accent for Listener

  return (
    <div className="relative flex items-center justify-center w-[220px] h-[220px] sm:w-[260px] sm:h-[260px]">
      <svg
        width={260}
        height={260}
        viewBox="0 0 260 260"
        className="w-full h-full transform -rotate-90"
      >
        <circle
          cx={130}
          cy={130}
          r={TIMER_R}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={14}
        />
        {hasAudio && progress > 0 && (
          <circle
            cx={130}
            cy={130}
            r={TIMER_R}
            fill="none"
            stroke={strokeColor}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${TIMER_CIRCUM} ${TIMER_CIRCUM}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.15s linear" }}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none p-4">
        {hasAudio ? (
          <>
            <div
              className="font-bold tracking-tight font-mono text-purple-700 text-3xl sm:text-4xl"
              style={{ lineHeight: 1.1 }}
            >
              {curMins}:{curSecs}
            </div>
            <div className="text-xs font-mono text-slate-500 font-bold mt-1">
              / {totMins}:{totSecs}
            </div>

            {isPlaying ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-bold text-purple-700 animate-pulse mt-2 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /> Đang phát audio
              </div>
            ) : currentTime > 0 ? (
              <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mt-2">
                Đã tạm dừng
              </div>
            ) : (
              <div className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full mt-2">
                Sẵn sàng phát âm
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400 p-2">
            <UploadCloud className="w-9 h-9 sm:w-10 sm:h-10 text-slate-400" />
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chưa tải file ghi âm
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Speaker 7-step Checklist with Progress Meter ───────────────────────────
function SpeakerChecklist({ steps }: { steps: Topic["steps"] }) {
  const [checked, setChecked] = useState<boolean[]>(() => Array(steps.length).fill(false));

  const toggle = (i: number) =>
    setChecked((prev) => {
      const n = [...prev];
      n[i] = !n[i];
      return n;
    });

  const done = checked.filter(Boolean).length;
  const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-lg text-slate-900 font-heading">
              Checklist 7 Bước Bài Nói
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Đánh dấu tích khi bạn hoàn thành từng phần trong bài phát biểu 2 phút
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs sm:text-sm font-bold text-indigo-800">
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
          <span>{done} / {steps.length} bước ({pct}%)</span>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2.5 sm:h-3 overflow-hidden p-0.5">
        <div
          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
        {steps.map((step, i) => (
          <button
            key={step.step}
            type="button"
            onClick={() => toggle(i)}
            className={`flex items-start gap-3 text-left p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
              checked[i]
                ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                : "bg-slate-50/50 hover:bg-slate-100/70 border-slate-200 text-slate-900 hover:border-slate-300"
            }`}
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 transition-colors ${
                checked[i]
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-300 text-transparent"
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  BƯỚC {step.step}
                </span>
                <span className="text-xs sm:text-base font-bold text-slate-900 truncate">
                  {step.title}
                </span>
              </div>
              {step.coach_tip && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {step.coach_tip}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Listener Live Collocation Spotter HUD ──────────────────────────────────
function ListenerCollocationHUD({
  topic,
  heardSet,
  toggleItem,
  resetHeard,
}: {
  topic: Topic;
  heardSet: Set<string>;
  toggleItem: (item: string) => void;
  resetHeard?: () => void;
  isListening?: boolean;
}) {
  const allItems = useMemo(
    () => (topic.collocations || []).flatMap((c) => c.items || []),
    [topic.collocations]
  );
  const count = heardSet.size;
  const total = allItems.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm space-y-4 sm:space-y-5">
      {/* HUD Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-lg text-slate-900 font-heading m-0">
              Live Collocation Spotter (Chấm Cụm Từ Bài Nói)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Khi nghe thấy bạn nói cụm từ nào, click chọn để tính điểm Lexical Resource.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {resetHeard && count > 0 && (
            <button
              type="button"
              onClick={resetHeard}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 transition-all cursor-pointer"
            >
              Đặt lại
            </button>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs sm:text-sm font-bold text-purple-800">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
            <span>
              {count} / {total} cụm từ ({total > 0 ? Math.round((count / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 sm:h-3 overflow-hidden p-0.5">
        <div
          className="bg-purple-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
        />
      </div>

      {/* Categories & Interactive Pills */}
      <div className="space-y-4 pt-1">
        {(topic.collocations || []).map((cat) => (
          <div key={cat.category} className="space-y-2">
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>{cat.category}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(cat.items || []).map((item) => {
                const isHeard = heardSet.has(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                      isHeard
                        ? "bg-purple-700 text-white border-purple-700 shadow-xs scale-102"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    {isHeard ? (
                      <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ShowTimeClient Component ──────────────────────────────────────────
export function ShowTimeClient({ topic }: { topic: Topic }) {
  const allItems = useMemo(
    () => (topic.collocations || []).flatMap((c) => c.items || []),
    [topic.collocations]
  );

  const {
    heardSet,
    toggle: toggleItem,
    reset: resetHeard,
  } = useSpeechRecognition(allItems);

  const [nickname, setNickname] = useState<string>("Học viên");
  const [studentInfo, setStudentInfo] = useState<{
    id: string;
    name: string;
    class_name: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/students/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.student) {
          setStudentInfo(data.student);
          setNickname(data.student.name);
        }
      })
      .catch(() => {});
  }, []);

  const [role, setRole] = useState<"speaker" | "listener">("speaker");
  const [sessionLogged, setSessionLogged] = useState(false);

  // ── Speaker Mode State ──────────────────────────────────────────────────
  const [speakerTimeLeft, setSpeakerTimeLeft] = useState(SPEAKER_DURATION);
  const [speakerRunning, setSpeakerRunning] = useState(false);
  const speakerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [speakerRecordState, setSpeakerRecordState] = useState<"idle" | "recording" | "done">("idle");
  const [speakerRecordedSeconds, setSpeakerRecordedSeconds] = useState(0);
  const [speakerAudioUrl, setSpeakerAudioUrl] = useState<string | null>(null);
  const [speakerRemoteAudioUrl, setSpeakerRemoteAudioUrl] = useState<string | null>(null);
  const [speakerUploadStatus, setSpeakerUploadStatus] = useState<"idle" | "uploading" | "done" | "failed">("idle");
  const [speakerMimeType, setSpeakerMimeType] = useState<string>("audio/webm");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const speakerRecIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Listener Mode State ─────────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confettiFiredRef = useRef(false);

  const logSession = useCallback(
    async (spokenDurationSec: number, audioUrl?: string) => {
      if (sessionLogged) return;
      setSessionLogged(true);

      try {
        await fetch("/api/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_id: topic.id === "seed-fallback" ? null : topic.id,
            topic_slug: topic.slug,
            student_id: studentInfo?.id || null,
            student_nickname: studentInfo ? studentInfo.name : nickname,
            class_name: studentInfo ? studentInfo.class_name : "Tự do",
            role,
            spoken_duration_seconds:
              role === "speaker"
                ? Math.max(1, SPEAKER_DURATION - speakerTimeLeft)
                : Math.max(1, spokenDurationSec || Math.round(audioDuration)),
            collocations_heard_count: heardSet.size,
            audio_url: audioUrl || speakerRemoteAudioUrl || null,
          }),
        });
      } catch {
        // ignore
      }
    },
    [
      sessionLogged,
      topic.id,
      topic.slug,
      nickname,
      role,
      speakerTimeLeft,
      audioDuration,
      heardSet.size,
      studentInfo,
      speakerRemoteAudioUrl,
    ]
  );

  // Upload recording to Supabase Storage
  const uploadRecordedAudio = useCallback(
    async (blob: Blob, durationSec: number) => {
      setSpeakerUploadStatus("uploading");
      try {
        const formData = new FormData();
        const ext = speakerMimeType.includes("mp4")
          ? "m4a"
          : speakerMimeType.includes("ogg")
          ? "ogg"
          : speakerMimeType.includes("wav")
          ? "wav"
          : "webm";
        formData.append("audio", blob, `${topic.slug || "speaking"}_96k.${ext}`);
        formData.append("slug", topic.slug || "speaking");

        const res = await fetch("/api/practice/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.url) {
          setSpeakerRemoteAudioUrl(data.url);
          setSpeakerUploadStatus("done");
          logSession(durationSec, data.url);
        } else {
          setSpeakerUploadStatus("failed");
          logSession(durationSec);
        }
      } catch {
        setSpeakerUploadStatus("failed");
        logSession(durationSec);
      }
    },
    [speakerMimeType, topic.slug, logSession]
  );

  // Start speaker recording & timer
  const handleSpeakerStartWithRecord = async () => {
    if (speakerRecordState === "recording") {
      stopSpeakerRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      if (mimeType) setSpeakerMimeType(mimeType);

      const recorder = new MediaRecorder(
        stream,
        mimeType
          ? {
              mimeType,
              audioBitsPerSecond: 96000,
            }
          : { audioBitsPerSecond: 96000 }
      );

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalType = mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        if (speakerAudioUrl) {
          URL.revokeObjectURL(speakerAudioUrl);
        }
        const url = URL.createObjectURL(blob);
        setSpeakerAudioUrl(url);
        setSpeakerRecordState("done");
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }

        // Auto upload 96kbps audio recording to Supabase Storage
        uploadRecordedAudio(blob, Math.max(1, SPEAKER_DURATION - speakerTimeLeft));
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setSpeakerRecordState("recording");
      setSpeakerRecordedSeconds(0);
      setSpeakerUploadStatus("idle");
      setSessionLogged(false);

      speakerRecIntervalRef.current = setInterval(() => {
        setSpeakerRecordedSeconds((s) => s + 1);
      }, 1000);

      // Reset timer if ended or at start
      if (speakerTimeLeft === 0 || speakerTimeLeft === SPEAKER_DURATION) {
        setSpeakerTimeLeft(SPEAKER_DURATION);
      }
      setSpeakerRunning(true);
    } catch {
      alert("Không thể truy cập Microphone. Vui lòng cho phép quyền Microphone trên trình duyệt để ghi âm!");
    }
  };

  const stopSpeakerRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (speakerRecIntervalRef.current) {
      clearInterval(speakerRecIntervalRef.current);
      speakerRecIntervalRef.current = null;
    }
    setSpeakerRunning(false);
  };

  const startSpeakerTimer = () => {
    if (speakerTimeLeft === 0) setSpeakerTimeLeft(SPEAKER_DURATION);
    setSpeakerRunning(true);
  };

  const pauseSpeakerTimer = () => {
    setSpeakerRunning(false);
  };

  const resetSpeakerAll = () => {
    setSpeakerRunning(false);
    setSpeakerTimeLeft(SPEAKER_DURATION);
    stopSpeakerRecording();
    setSpeakerRecordState("idle");
    setSpeakerRecordedSeconds(0);
    setSpeakerUploadStatus("idle");
    if (speakerAudioUrl) {
      URL.revokeObjectURL(speakerAudioUrl);
      setSpeakerAudioUrl(null);
    }
    setSpeakerRemoteAudioUrl(null);
    setSessionLogged(false);
  };

  // Speaker Timer tick
  useEffect(() => {
    if (speakerRunning) {
      speakerIntervalRef.current = setInterval(() => {
        setSpeakerTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(speakerIntervalRef.current!);
            setSpeakerRunning(false);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              stopSpeakerRecording();
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else if (speakerIntervalRef.current) {
      clearInterval(speakerIntervalRef.current);
    }

    return () => {
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    };
  }, [speakerRunning]);

  // Clean up speaker resources
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (speakerRecIntervalRef.current) {
        clearInterval(speakerRecIntervalRef.current);
      }
      if (speakerAudioUrl) {
        URL.revokeObjectURL(speakerAudioUrl);
      }
      if (uploadedAudioUrl) {
        URL.revokeObjectURL(uploadedAudioUrl);
      }
    };
  }, [speakerAudioUrl, uploadedAudioUrl]);

  // ── Listener File Handlers ──────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    const url = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedAudioUrl(url);
    setAudioCurrentTime(0);
    setAudioPlaying(false);
    resetHeard();
    confettiFiredRef.current = false;

    // Decode exact audio duration immediately
    const exactDuration = await getAudioDuration(file);
    if (exactDuration > 0) {
      setAudioDuration(exactDuration);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const removeUploadedFile = () => {
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setUploadedFile(null);
    setUploadedAudioUrl(null);
    setAudioDuration(0);
    setAudioCurrentTime(0);
    setAudioPlaying(false);
    resetHeard();
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (audioPlaying) {
      audioPlayerRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setAudioPlaying(true);
    }
  };

  const restartAudio = () => {
    if (!audioPlayerRef.current) return;
    audioPlayerRef.current.currentTime = 0;
    audioPlayerRef.current.play();
    setAudioPlaying(true);
  };

  const skipAudio = (seconds: number) => {
    if (!audioPlayerRef.current) return;
    audioPlayerRef.current.currentTime = Math.max(
      0,
      Math.min(audioDuration, audioPlayerRef.current.currentTime + seconds)
    );
  };

  const swapRole = (newRole: "speaker" | "listener") => {
    setRole(newRole);
    setSessionLogged(false);
  };

  const isSpeakerRecordingActive = speakerRecordState === "recording";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white py-3 sm:py-4 px-4 sm:px-6 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-[960px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-200 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shrink-0"></span>
            <span className="tracking-tight font-heading truncate">HappyLearning Showtime Studio</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-indigo-400">Tracey Le</span>
          </div>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────────────────────── */}
      <main className="max-w-[960px] mx-auto w-full px-3.5 sm:px-4 py-4 sm:py-7 flex flex-col gap-4 sm:gap-6">
        {/* Navigation & Student Badge Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 sm:gap-3">
          <Link
            href={`/topic/${topic.slug}/outline`}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-200 shadow-2xs hover:bg-slate-100 active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Xem lại dàn ý
          </Link>

          {/* Active Student Pill */}
          <div className="inline-flex items-center gap-2 bg-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 shadow-2xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
            <span className="text-slate-500 hidden xs:inline">Học viên:</span>
            <span className="text-indigo-700 truncate max-w-[200px] sm:max-w-none">
              {studentInfo ? `${studentInfo.name} (${studentInfo.class_name})` : nickname}
            </span>
          </div>
        </div>

        {/* ── Role Selector Tabs (Speaker vs Listener) ──────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chế Độ Thực Hành
              </div>
              <div className="text-sm sm:text-xl font-bold text-slate-900 font-heading mt-0.5">
                {role === "speaker"
                  ? "🎤 Role Speaker (Người Nói 2 Phút)"
                  : "🎧 Role Listener (Tải File Ghi Âm & Đánh Giá)"}
              </div>
            </div>

            {/* Segmented Switcher */}
            <div className="flex flex-col xs:flex-row p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full sm:w-auto gap-1">
              <button
                type="button"
                onClick={() => swapRole("speaker")}
                className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  role === "speaker"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Mic className="w-4 h-4" /> Speaker (Tôi Nói)
              </button>
              <button
                type="button"
                onClick={() => swapRole("listener")}
                className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  role === "listener"
                    ? "bg-purple-700 text-white shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Headphones className="w-4 h-4" /> Listener (Tải File Nghe)
              </button>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200 flex items-start gap-2.5 sm:gap-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {role === "speaker" ? (
                <>
                  <b className="text-slate-900">Nhiệm vụ Speaker:</b> Nhấn nút{" "}
                  <b className="text-indigo-700">&ldquo;Ghi Âm & Luyện Nói 2 Phút&rdquo;</b>, phát biểu theo dàn
                  ý 7 bước. Kết thúc 2 phút bạn có thể nghe lại và tải audio gửi cho bạn mình.
                </>
              ) : (
                <>
                  <b className="text-slate-900">Nhiệm vụ Listener:</b> Tải lên file ghi âm bài nói của bạn mình
                  (.mp3, .wav, .m4a, .webm). Đồng hồ sẽ tự động đếm theo thời lượng file và{" "}
                  <b className="text-purple-700">chỉ chạy khi bạn bấm nghe</b>. Bấm chọn các cụm từ (Collocations) bạn nghe thấy trong bài.
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── MODE 1: SPEAKER MODE ────────────────────────────────────── */}
        {role === "speaker" && (
          <>
            {/* 2-Minute Practice Timer & Precision Controls */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 shadow-sm">
              <SpeakerCircularTimer
                timeLeft={speakerTimeLeft}
                running={speakerRunning}
                isRecording={isSpeakerRecordingActive}
              />

              {/* Action Control Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto justify-center items-center">
                <button
                  type="button"
                  className={`w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-2xl text-xs sm:text-base font-bold flex items-center justify-center gap-2.5 text-white shadow-sm transition-all cursor-pointer active:scale-95 font-heading ${
                    isSpeakerRecordingActive
                      ? "bg-rose-600 hover:bg-rose-700 animate-pulse"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                  onClick={handleSpeakerStartWithRecord}
                >
                  {isSpeakerRecordingActive ? (
                    <>
                      <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>
                        Dừng Ghi Âm ({Math.floor(speakerRecordedSeconds / 60)}:
                        {String(speakerRecordedSeconds % 60).padStart(2, "0")})
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Ghi Âm & Luyện Nói 2 Phút</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2 w-full sm:w-auto">
                  {speakerRunning ? (
                    <button
                      type="button"
                      className="flex-1 sm:flex-initial h-11 sm:h-12 px-4 sm:px-5 rounded-2xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      onClick={pauseSpeakerTimer}
                    >
                      <Pause className="w-4 h-4" /> Tạm dừng
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex-1 sm:flex-initial h-11 sm:h-12 px-4 sm:px-5 rounded-2xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      onClick={startSpeakerTimer}
                      disabled={speakerTimeLeft === 0}
                    >
                      <Play className="w-4 h-4" />{" "}
                      {speakerTimeLeft < SPEAKER_DURATION && speakerTimeLeft > 0
                        ? "Tiếp tục"
                        : "Chỉ đếm giờ"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="flex-1 sm:flex-initial h-11 sm:h-12 px-4 sm:px-5 rounded-2xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    onClick={resetSpeakerAll}
                  >
                    <RotateCcw className="w-4 h-4" /> Đặt lại
                  </button>
                </div>
              </div>

              {/* Recorded Audio Feedback Bar */}
              {speakerAudioUrl && (
                <div className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-indigo-900 font-heading">
                        Bản Ghi Âm Của Bạn
                      </div>
                      <div className="text-xs text-indigo-700 font-medium">
                        {speakerUploadStatus === "uploading" ? (
                          <span className="flex items-center gap-1 text-amber-700">
                            <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu bản ghi âm...
                          </span>
                        ) : speakerUploadStatus === "done" ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã lưu vào bài nộp giáo viên
                          </span>
                        ) : (
                          "Sẵn sàng nghe lại hoặc tải xuống"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <audio
                      src={speakerAudioUrl}
                      controls
                      className="h-9 w-full sm:w-48 rounded-xl"
                    />
                    <a
                      href={speakerAudioUrl}
                      download={`speaking-${topic.slug}-2min.${speakerMimeType.includes("mp4") ? "m4a" : "webm"}`}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-2xs shrink-0"
                      title="Tải audio về máy"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Speaker 7-step Checklist */}
            <SpeakerChecklist steps={topic.steps} />
          </>
        )}

        {/* ── MODE 2: LISTENER MODE ───────────────────────────────────── */}
        {role === "listener" && (
          <>
            {/* Listener Audio Player Element (Hidden) */}
            {uploadedAudioUrl && (
              <audio
                ref={audioPlayerRef}
                src={uploadedAudioUrl}
                preload="metadata"
                onTimeUpdate={() => {
                  if (audioPlayerRef.current) {
                    setAudioCurrentTime(audioPlayerRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (audioPlayerRef.current && audioPlayerRef.current.duration > 0) {
                    setAudioDuration(audioPlayerRef.current.duration);
                  }
                }}
                onEnded={() => {
                  setAudioPlaying(false);
                  logSession(Math.round(audioDuration));
                }}
              />
            )}

            {/* Upload Box if no file is uploaded yet */}
            {!uploadedFile ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-purple-200 hover:border-purple-400 p-6 sm:p-12 text-center shadow-sm space-y-4 transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center mx-auto shadow-2xs">
                  <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base sm:text-xl font-bold font-heading text-slate-900 m-0">
                    Tải File Ghi Âm Của Bạn Mình
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Hỗ trợ định dạng âm thanh <b>MP3, WAV, M4A, WEBM, OGG</b>. Đồng hồ sẽ tự động đồng bộ theo độ dài file thực tế.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 sm:h-12 px-6 sm:px-7 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer active:scale-95 font-heading inline-flex items-center gap-2"
                >
                  <FileAudio className="w-4 h-4" /> Chọn File Từ Thiết Bị
                </button>
              </div>
            ) : (
              /* Synchronized Circular Audio Player HUD */
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 shadow-sm">
                <ListenerAudioCircularTimer
                  currentTime={audioCurrentTime}
                  totalDuration={audioDuration}
                  isPlaying={audioPlaying}
                  hasAudio={Boolean(uploadedAudioUrl)}
                />

                {/* Audio Controls */}
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => skipAudio(-5)}
                      className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      title="Lùi 5s"
                    >
                      <Rewind className="w-4 h-4" /> -5s
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="h-11 sm:h-13 px-6 sm:px-8 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 font-heading"
                    >
                      {audioPlaying ? (
                        <>
                          <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> Tạm Dừng
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> Nghe Bài Nói
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => skipAudio(5)}
                      className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      title="Tới 5s"
                    >
                      +5s <FastForward className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={restartAudio}
                      className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      title="Nghe lại từ đầu"
                    >
                      <RotateCcw className="w-4 h-4" /> Lại từ đầu
                    </button>
                  </div>

                  {/* Active File info bar */}
                  <div className="flex items-center justify-between w-full max-w-md bg-purple-50 border border-purple-200 rounded-2xl px-3.5 sm:px-4 py-2 text-xs font-bold text-purple-900 gap-2">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <FileAudio className="w-4 h-4 text-purple-700 shrink-0" />
                      <span className="truncate">{uploadedFile.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={removeUploadedFile}
                      className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Đổi file khác"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Listener Collocation Spotter HUD */}
            <ListenerCollocationHUD
              topic={topic}
              heardSet={heardSet}
              toggleItem={toggleItem}
              resetHeard={resetHeard}
            />
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs sm:text-sm text-slate-500 font-medium border-t border-slate-200 bg-white mt-auto">
        HappyLearning Showtime Studio • Teacher Tracey Le
      </footer>
    </div>
  );
}
