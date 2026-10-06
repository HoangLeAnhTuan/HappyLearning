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
  Volume2,
  CheckCircle2,
  Trash2,
  Sparkles,
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
  Clock,
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
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/wav",
  ];
  for (const t of types) {
    try {
      if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    } catch {
      // continue
    }
  }
  return undefined;
}

// Accurately decode audio duration for all formats (especially MediaRecorder .webm)
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        resolve(0);
        return;
      }
      const audioCtx = new AudioContextClass();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            audioCtx.close().catch(() => {});
            resolve(0);
            return;
          }
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          const duration = audioBuffer.duration;
          audioCtx.close().catch(() => {});
          resolve(duration && isFinite(duration) ? duration : 0);
        } catch {
          audioCtx.close().catch(() => {});
          resolve(0);
        }
      };
      reader.onerror = () => {
        audioCtx.close().catch(() => {});
        resolve(0);
      };
      reader.readAsArrayBuffer(file);
    } catch {
      resolve(0);
    }
  });
}

// ── Speaker Circular SVG Timer (Counts down 120s) ───────────────────────────
function SpeakerCircularTimer({
  timeLeft,
  running,
  isRecording,
}: {
  timeLeft: number;
  running: boolean;
  isRecording: boolean;
}) {
  const color = timerColor(timeLeft, SPEAKER_DURATION);
  const isFull = timeLeft === SPEAKER_DURATION;
  const progress = Math.max(0, Math.min(1, timeLeft / SPEAKER_DURATION));
  const offset = TIMER_CIRCUM * (1 - progress);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
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
          className="font-bold tracking-tight font-mono text-slate-900"
          style={{ fontSize: 52, lineHeight: 1.1, color }}
        >
          {`${mins}:${secs}`}
        </div>

        {isRecording ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 animate-pulse mt-2.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" /> Đang ghi âm micro
          </div>
        ) : !running && isFull ? (
          <div className="text-sm font-bold uppercase tracking-wider text-slate-500 mt-2">
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
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
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
              className="font-bold tracking-tight font-mono text-purple-700"
              style={{ fontSize: 44, lineHeight: 1.1 }}
            >
              {curMins}:{curSecs}
            </div>
            <div className="text-xs font-mono text-slate-500 font-bold mt-1">
              / {totMins}:{totSecs}
            </div>

            {isPlaying ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-bold text-purple-700 animate-pulse mt-2 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /> Đang phát bản ghi âm
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
            <UploadCloud className="w-10 h-10 text-slate-400" />
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
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base sm:text-lg text-slate-900 font-heading">
              Checklist 7 Bước Bài Nói
            </div>
            <p className="text-sm text-slate-600">
              Đánh dấu tích khi bạn hoàn thành từng phần trong bài phát biểu 2 phút
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-800">
          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          <span>{done} / {steps.length} bước ({pct}%)</span>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
        <div
          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 pt-1">
        {steps.map((step, i) => (
          <button
            key={step.step}
            type="button"
            onClick={() => toggle(i)}
            className={`flex items-start gap-3.5 text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              checked[i]
                ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                : "bg-slate-50/50 hover:bg-slate-100/70 border-slate-200 text-slate-900 hover:border-slate-300"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 transition-colors ${
                checked[i]
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-300 text-transparent"
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  BƯỚC {step.step}
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
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
}) {
  const allItems = useMemo(
    () => (topic.collocations || []).flatMap((c) => c.items || []),
    [topic.collocations]
  );
  const count = heardSet.size;
  const total = allItems.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base sm:text-lg text-slate-900 font-heading flex items-center gap-2">
              Collocation Spotter (Bắt Cụm Từ Bài Nói)
            </div>
            <p className="text-sm text-slate-600">
              Vừa nghe bản ghi âm vừa bấm chọn các cụm từ (Collocations) mà bạn mình đã phát âm chính xác
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {resetHeard && heardSet.size > 0 && (
            <button
              type="button"
              onClick={resetHeard}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-full px-3 py-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Đặt lại toàn bộ từ đã chọn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          )}

          <span className="inline-flex items-center gap-2 text-sm font-bold bg-purple-50 text-purple-800 border border-purple-200 rounded-full px-4 py-1.5 shadow-2xs">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Đã bắt được: {count} / {total} từ</span>
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(topic.collocations || []).map((cat) => (
          <div
            key={cat.category}
            className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3"
          >
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span>{cat.category}</span>
              <span className="text-xs text-slate-500 font-semibold font-mono">
                {(cat.items || []).filter((i) => heardSet.has(i.toLowerCase().trim())).length} /{" "}
                {(cat.items || []).length}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {(cat.items || []).map((item) => {
                const active = heardSet.has(item.toLowerCase().trim());
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={`text-xs sm:text-sm font-bold px-3 py-2 rounded-xl border transition-colors duration-150 cursor-pointer flex items-center gap-1.5 select-none ${
                      active
                        ? "bg-purple-700 text-white border-purple-700 shadow-2xs"
                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="w-4 h-4 flex items-center justify-center shrink-0">
                      {active ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                      )}
                    </span>
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

  // ── Speaker Mode State ───────────────────────────────────────────────────
  const [speakerTimeLeft, setSpeakerTimeLeft] = useState(SPEAKER_DURATION);
  const [speakerRunning, setSpeakerRunning] = useState(false);
  const [speakerRecordState, setSpeakerRecordState] = useState<"idle" | "recording" | "done">("idle");
  const [speakerRecordedSeconds, setSpeakerRecordedSeconds] = useState(0);
  const [speakerAudioUrl, setSpeakerAudioUrl] = useState<string | null>(null);
  const [speakerMimeType, setSpeakerMimeType] = useState<string>("audio/webm");
  const [speakerUploadStatus, setSpeakerUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [speakerRemoteAudioUrl, setSpeakerRemoteAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speakerRecIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakerTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Listener Mode State (Uploaded Audio File - Ephemeral memory only) ─────
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1.0);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const confettiFiredRef = useRef(false);

  // Confetti when ≥8 collocations
  useEffect(() => {
    if (heardSet.size >= 8 && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      import("canvas-confetti").then((mod) => {
        const confetti = mod.default;
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
      });
    }
  }, [heardSet.size]);

  // Web Audio Beep sound
  const beep = useCallback((freq = 880, duration = 0.15) => {
    try {
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new AudioContext());
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.2;
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  }, []);

  // Log session to DB (with optional 96kbps Supabase Storage Audio URL)
  const logSession = useCallback(
    async (spentDuration?: number, audioUrl?: string | null) => {
      if (sessionLogged) return;
      setSessionLogged(true);
      try {
        const finalDuration =
          spentDuration ??
          (role === "speaker"
            ? SPEAKER_DURATION - speakerTimeLeft
            : Math.round(audioDuration));

        await fetch("/api/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_id: topic.id,
            slug: topic.slug,
            student_id: studentInfo?.id || null,
            student_nickname: nickname || "Student",
            class_name: studentInfo?.class_name || null,
            role,
            duration_seconds: Math.max(1, finalDuration),
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

  // Upload 96kbps recording to Supabase Storage
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

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Không thể tải lên Supabase Storage");
        }

        const data = await res.json();
        if (data.audio_url) {
          setSpeakerRemoteAudioUrl(data.audio_url);
          setSpeakerUploadStatus("success");
          await logSession(durationSec, data.audio_url);
        } else {
          setSpeakerUploadStatus("error");
          await logSession(durationSec);
        }
      } catch (err: unknown) {
        console.error("Audio upload error:", err);
        setSpeakerUploadStatus("error");
        await logSession(durationSec);
      }
    },
    [speakerMimeType, topic.slug, logSession]
  );

  // ── Speaker Mode Logic ───────────────────────────────────────────────────
  const stopSpeakerRecording = useCallback(() => {
    if (speakerRecIntervalRef.current) {
      clearInterval(speakerRecIntervalRef.current);
      speakerRecIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const startSpeakerRecording = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alert("Microphone recording is not supported in this browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      audioStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 96000, // 96 kbps High-Quality voice encoding
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
        setSpeakerMimeType(mimeType);
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
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

      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Could not start microphone: ${errorMsg}. Please allow microphone permission.`);
      return false;
    }
  }, [speakerAudioUrl, uploadRecordedAudio, speakerTimeLeft]);

  const startSpeakerTimer = useCallback(() => {
    if (speakerRunning) return;
    setSpeakerRunning(true);
    setSessionLogged(false);

    speakerTimerIntervalRef.current = setInterval(() => {
      setSpeakerTimeLeft((prev) => {
        if (prev <= 1) {
          if (speakerTimerIntervalRef.current) {
            clearInterval(speakerTimerIntervalRef.current);
            speakerTimerIntervalRef.current = null;
          }
          setSpeakerRunning(false);
          const wasRecording = speakerRecordState === "recording";
          stopSpeakerRecording();
          beep(1046, 0.4);

          import("canvas-confetti").then((mod) => {
            const confetti = mod.default;
            confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
          });

          if (!wasRecording) {
            logSession(SPEAKER_DURATION);
          }
          return 0;
        }
        const next = prev - 1;
        if (next <= 10 && next > 0) {
          beep(880, 0.08);
        }
        return next;
      });
    }, 1000);
  }, [speakerRunning, speakerRecordState, beep, logSession, stopSpeakerRecording]);

  const pauseSpeakerTimer = useCallback(() => {
    if (speakerTimerIntervalRef.current) {
      clearInterval(speakerTimerIntervalRef.current);
      speakerTimerIntervalRef.current = null;
    }
    setSpeakerRunning(false);
  }, []);

  const handleSpeakerStartWithRecord = useCallback(async () => {
    if (speakerRecordState === "recording") {
      stopSpeakerRecording();
      pauseSpeakerTimer();
      return;
    }

    const micStarted = await startSpeakerRecording();
    if (micStarted) {
      if (speakerTimeLeft === 0) {
        setSpeakerTimeLeft(SPEAKER_DURATION);
      }
      startSpeakerTimer();
    }
  }, [
    speakerRecordState,
    stopSpeakerRecording,
    pauseSpeakerTimer,
    startSpeakerRecording,
    speakerTimeLeft,
    startSpeakerTimer,
  ]);

  const resetSpeakerState = useCallback(() => {
    if (speakerTimerIntervalRef.current) {
      clearInterval(speakerTimerIntervalRef.current);
      speakerTimerIntervalRef.current = null;
    }
    stopSpeakerRecording();
    setSpeakerRunning(false);
    setSpeakerTimeLeft(SPEAKER_DURATION);
    setSpeakerUploadStatus("idle");
    confettiFiredRef.current = false;
  }, [stopSpeakerRecording]);

  // ── Listener Mode Logic (Uploaded Audio Player) ─────────────────────────
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

    // Decode exact audio duration immediately for webm / mp3 / wav / m4a / ogg
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
    } else {
      audioPlayerRef.current.playbackRate = audioPlaybackRate;
      audioPlayerRef.current.play().catch(() => {});
    }
  };

  const seekAudio = (secs: number) => {
    if (!audioPlayerRef.current) return;
    const maxDur = audioDuration > 0 ? audioDuration : 120;
    const target = Math.max(0, Math.min(maxDur, secs));
    audioPlayerRef.current.currentTime = target;
    setAudioCurrentTime(target);
  };

  const skipAudio = (delta: number) => {
    if (!audioPlayerRef.current) return;
    const current = audioPlayerRef.current.currentTime ?? audioCurrentTime;
    const maxDur = audioDuration > 0 ? audioDuration : 120;
    const target = Math.max(0, Math.min(maxDur, current + delta));
    audioPlayerRef.current.currentTime = target;
    setAudioCurrentTime(target);
  };

  const changePlaybackRate = (rate: number) => {
    setAudioPlaybackRate(rate);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = rate;
    }
  };

  // Cleanup on unmount (revokes ephemeral object URLs)
  useEffect(() => {
    return () => {
      if (speakerTimerIntervalRef.current) clearInterval(speakerTimerIntervalRef.current);
      if (speakerRecIntervalRef.current) clearInterval(speakerRecIntervalRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (speakerAudioUrl) {
        URL.revokeObjectURL(speakerAudioUrl);
      }
      if (uploadedAudioUrl) {
        URL.revokeObjectURL(uploadedAudioUrl);
      }
    };
  }, [speakerAudioUrl, uploadedAudioUrl]);

  const swapRole = (newRole: "speaker" | "listener") => {
    if (role === newRole) return;
    resetSpeakerState();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setAudioPlaying(false);
    setRole(newRole);
  };

  const isSpeakerRecordingActive = speakerRecordState === "recording";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white py-4 px-6 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-[960px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse inline-block"></span>
            <span className="font-bold text-base text-white tracking-tight font-heading">
              Show Time Studio (2 Phút)
            </span>
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-semibold truncate max-w-[320px] bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-700">
            {topic.title}
          </div>
        </div>
      </header>

      <div className="max-w-[960px] mx-auto w-full px-4 py-7 space-y-6">
        {/* Navigation & Student Badge Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/topic/${topic.slug}/outline`}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Xem lại dàn ý
          </Link>

          {/* Active Student Pill */}
          <div className="inline-flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 shadow-2xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-slate-500">Học viên:</span>
            <span className="text-indigo-700">
              {studentInfo ? `${studentInfo.name} (Lớp ${studentInfo.class_name})` : nickname}
            </span>
          </div>
        </div>

        {/* ── Role Selector Tabs (Speaker vs Listener) ──────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chế Độ Thực Hành
              </div>
              <div className="text-base sm:text-xl font-bold text-slate-900 font-heading mt-0.5">
                {role === "speaker"
                  ? "🎤 Role Speaker (Người Nói 2 Phút)"
                  : "🎧 Role Listener (Tải File Ghi Âm & Đánh Giá)"}
              </div>
            </div>

            {/* Segmented Switcher */}
            <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => swapRole("speaker")}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
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
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  role === "listener"
                    ? "bg-purple-700 text-white shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Headphones className="w-4 h-4" /> Listener (Tải File Nghe)
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-700 bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
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
                  <b className="text-purple-700">chỉ chạy khi bạn bấm nghe</b>. Bấm &ldquo;Quét AI&rdquo; hoặc tự
                  tay chấm các cụm từ (Collocations).
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── MODE 1: SPEAKER MODE ────────────────────────────────────── */}
        {role === "speaker" && (
          <>
            {/* 2-Minute Practice Timer & Precision Controls */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center gap-6 shadow-sm">
              <SpeakerCircularTimer
                timeLeft={speakerTimeLeft}
                running={speakerRunning}
                isRecording={isSpeakerRecordingActive}
              />

              {/* Action Control Buttons */}
              <div className="flex gap-3 flex-wrap justify-center items-center">
                <button
                  type="button"
                  className={`h-12 px-7 rounded-2xl text-sm sm:text-base font-bold flex items-center gap-2.5 text-white shadow-sm transition-all cursor-pointer active:scale-95 font-heading ${
                    isSpeakerRecordingActive
                      ? "bg-rose-600 hover:bg-rose-700 animate-pulse"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                  onClick={handleSpeakerStartWithRecord}
                >
                  {isSpeakerRecordingActive ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      <span>
                        Dừng Ghi Âm ({Math.floor(speakerRecordedSeconds / 60)}:
                        {String(speakerRecordedSeconds % 60).padStart(2, "0")})
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span>Ghi Âm & Luyện Nói 2 Phút</span>
                    </>
                  )}
                </button>

                {speakerRunning ? (
                  <button
                    type="button"
                    className="h-12 px-5 rounded-2xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                    onClick={pauseSpeakerTimer}
                  >
                    <Pause className="w-4 h-4" /> Tạm dừng
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-12 px-5 rounded-2xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
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
                  className="h-12 px-5 rounded-2xl text-sm font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-2xs"
                  onClick={resetSpeakerState}
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" /> Làm lại
                </button>
              </div>
            </div>

            {/* Recorded Audio Player & Actions (Speaker Mode) */}
            {speakerAudioUrl && (
              <div className="bg-white rounded-3xl border border-emerald-300 p-6 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold text-base text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span>Bản Ghi Âm Luyện Nói Của Bạn (Chuẩn 96 kbps)</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {speakerUploadStatus === "uploading" && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        Đang lưu lên Supabase Storage...
                      </span>
                    )}
                    {speakerUploadStatus === "success" && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Đã đồng bộ lên hệ thống giáo viên
                      </span>
                    )}
                    {speakerUploadStatus === "error" && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                        <Info className="w-3 h-3 text-amber-600" />
                        Lưu trữ cục bộ trên máy
                      </span>
                    )}
                    <span className="text-sm font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Thời lượng: {Math.floor(speakerRecordedSeconds / 60)}:
                      {String(speakerRecordedSeconds % 60).padStart(2, "0")}
                    </span>
                  </div>
                </div>

                <audio src={speakerAudioUrl} controls className="w-full h-11 rounded-xl" />

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (speakerAudioUrl) URL.revokeObjectURL(speakerAudioUrl);
                      setSpeakerAudioUrl(null);
                      setSpeakerRemoteAudioUrl(null);
                      setSpeakerUploadStatus("idle");
                      setSpeakerRecordState("idle");
                      setSpeakerRecordedSeconds(0);
                    }}
                    className="text-sm font-bold text-slate-600 hover:text-rose-600 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa & Thu Lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!speakerAudioUrl) return;
                      const ext = speakerMimeType.includes("mp4")
                        ? "m4a"
                        : speakerMimeType.includes("ogg")
                        ? "ogg"
                        : speakerMimeType.includes("wav")
                        ? "wav"
                        : "webm";
                      const a = document.createElement("a");
                      a.href = speakerAudioUrl;
                      a.download = `${topic.slug || "speaking"}-recording.${ext}`;
                      a.click();
                    }}
                    className="text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Tải File Ghi Âm Về Máy
                  </button>
                </div>
              </div>
            )}

            {/* Checklist */}
            <SpeakerChecklist steps={topic.steps || []} />
          </>
        )}

        {/* ── MODE 2: LISTENER MODE (Upload & Playback Synced Timer) ──── */}
        {role === "listener" && (
          <>
            {/* Hidden native audio element for precise time sync */}
            {uploadedAudioUrl && (
              <audio
                ref={audioPlayerRef}
                src={uploadedAudioUrl}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (!isNaN(d) && isFinite(d) && d > 0) {
                    setAudioDuration(d);
                  }
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.playbackRate = audioPlaybackRate;
                  }
                }}
                onTimeUpdate={(e) => {
                  setAudioCurrentTime(e.currentTarget.currentTime);
                }}
                onPlay={() => {
                  setAudioPlaying(true);
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.playbackRate = audioPlaybackRate;
                  }
                }}
                onPause={() => setAudioPlaying(false)}
                onEnded={() => {
                  setAudioPlaying(false);
                  logSession(Math.round(audioDuration));
                }}
              />
            )}

            {/* Upload Box if no file is uploaded yet */}
            {!uploadedFile ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-purple-200 hover:border-purple-400 p-8 sm:p-12 text-center shadow-sm space-y-4 transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center mx-auto shadow-2xs">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 m-0">
                    Tải Lên Bản Ghi Âm Của Bạn Học
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Chọn file âm thanh (.mp3, .m4a, .wav, .webm) từ máy tính hoặc điện thoại để bắt đầu chấm điểm
                  </p>
                  <p className="text-xs text-slate-400">
                    (File chỉ lưu tạm thời trên bộ nhớ trình duyệt, tự động xóa khi tải lại trang)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 px-7 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm sm:text-base shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95 font-heading"
                >
                  <FileAudio className="w-5 h-5" /> Chọn File Bản Ghi Âm
                </button>
              </div>
            ) : (
              /* Uploaded Audio Info & Synchronized Playback Studio */
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                {/* File Header Details */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-base text-slate-900 line-clamp-1">
                        {uploadedFile.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 font-mono mt-0.5">
                        <span>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <span>
                          Thời lượng: {Math.floor(audioDuration / 60)}:
                          {String(Math.floor(audioDuration % 60)).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={removeUploadedFile}
                      className="text-xs font-bold text-slate-600 hover:text-rose-600 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Đổi file khác
                    </button>
                  </div>
                </div>

                {/* Circular Timer & Synchronized Controls */}
                <div className="flex flex-col items-center gap-6 py-2">
                  <ListenerAudioCircularTimer
                    currentTime={audioCurrentTime}
                    totalDuration={audioDuration}
                    isPlaying={audioPlaying}
                    hasAudio={true}
                  />

                  {/* Scrubber Slider */}
                  <div className="w-full max-w-md space-y-1.5">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 120}
                      step={0.1}
                      value={audioCurrentTime}
                      onChange={(e) => seekAudio(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
                    />
                    <div className="flex justify-between text-xs font-mono font-bold text-slate-500">
                      <span>
                        {String(Math.floor(audioCurrentTime / 60)).padStart(2, "0")}:
                        {String(Math.floor(audioCurrentTime % 60)).padStart(2, "0")}
                      </span>
                      <span>
                        {String(Math.floor(audioDuration / 60)).padStart(2, "0")}:
                        {String(Math.floor(audioDuration % 60)).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Playback Control Buttons */}
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => skipAudio(-5)}
                      className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Lùi 5 giây"
                    >
                      <Rewind className="w-4 h-4" /> -5s
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="h-13 px-8 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-base flex items-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-95 font-heading"
                    >
                      {audioPlaying ? (
                        <>
                          <Pause className="w-5 h-5 fill-white" /> Tạm Dừng
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-white" /> Nghe Bài Nói
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => skipAudio(5)}
                      className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Tua tới 5 giây"
                    >
                      +5s <FastForward className="w-4 h-4" />
                    </button>

                    {/* Speed options */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                      {[0.75, 1.0, 1.25].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => changePlaybackRate(rate)}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            audioPlaybackRate === rate
                              ? "bg-white text-purple-800 shadow-2xs font-black"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collocation Spotter HUD */}
            <ListenerCollocationHUD
              topic={topic}
              heardSet={heardSet}
              toggleItem={toggleItem}
              resetHeard={resetHeard}
            />
          </>
        )}
      </div>

      <footer className="text-center py-6 text-sm text-slate-500 font-medium border-t border-slate-200 bg-white mt-auto">
        HappyLearning Speaking Studio • Teacher Tracey Le
      </footer>
    </div>
  );
}
