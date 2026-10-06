"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PracticeSession } from "@/lib/types";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Download,
  Clock,
  User,
  GraduationCap,
  Sparkles,
  Layers,
} from "lucide-react";

interface AudioPlayerModalProps {
  log: PracticeSession | null;
  onClose: () => void;
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayerModal({ log, onClose }: AudioPlayerModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Decode audio duration reliably if webm metadata is missing
  useEffect(() => {
    if (!log?.audio_url) return;

    setCurrentTime(0);
    setIsPlaying(false);
    setAudioError(null);

    let cancelled = false;

    const fetchDuration = async () => {
      try {
        const res = await fetch(log.audio_url!);
        const arrayBuf = await res.arrayBuffer();
        if (cancelled) return;

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const decoded = await ctx.decodeAudioData(arrayBuf);
          if (!cancelled && decoded.duration > 0) {
            setDuration(decoded.duration);
          }
          ctx.close();
        }
      } catch {
        // Fallback to media element duration
      }
    };

    fetchDuration();

    return () => {
      cancelled = true;
    };
  }, [log?.audio_url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        setAudioError("Không thể phát audio: " + (err?.message || "Lỗi thiết bị"));
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(duration || audio.duration || 120, time));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const skipTime = (offset: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    handleSeek(audio.currentTime + offset);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      audioRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
      if (volume === 0) {
        setVolume(0.5);
        audioRef.current.volume = 0.5;
      }
    } else {
      setIsMuted(true);
      audioRef.current.muted = true;
    }
  };

  if (!log || !log.audio_url) return null;

  const currentDuration = duration || (audioRef.current?.duration || 0);
  const progressPercent = currentDuration > 0 ? (currentTime / currentDuration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={log.audio_url}
          preload="auto"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current && audioRef.current.duration > 0 && !duration) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onError={() => setAudioError("Không thể tải file ghi âm từ Supabase Storage")}
        />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate font-heading">
                {log.topics?.title || "Speaking Practice"}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <User className="w-3 h-3 text-indigo-500" />
                  {log.student_nickname || "Học viên"}
                </span>
                {log.class_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-600 bg-white/80 px-2 py-0.2 rounded-md border border-slate-200 font-medium">
                      <GraduationCap className="w-3 h-3 text-slate-400" />
                      {log.class_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 shrink-0"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body Player Area ────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Animated sound wave banner */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center gap-3 relative overflow-hidden shadow-inner">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

            {/* Sound Wave Bars */}
            <div className="flex items-center gap-1.5 h-10 z-10">
              {[40, 75, 55, 90, 60, 35, 80, 100, 70, 45, 85, 60, 95, 50, 65, 30].map(
                (h, idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      isPlaying
                        ? "bg-indigo-300 animate-pulse"
                        : "bg-white/30"
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(15, (h * (progressPercent / 100 + 0.3)) % 100)}%` : `${h * 0.4}%`,
                      animationDelay: `${idx * 75}ms`,
                    }}
                  />
                )
              )}
            </div>

            <div className="flex items-center justify-between w-full text-xs text-indigo-200/90 z-10 px-1 font-mono">
              <span className="font-bold text-white text-sm">
                {formatTime(currentTime)}
              </span>
              <div className="flex items-center gap-1.5 text-indigo-300">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <span className="text-indigo-200">
                {formatTime(currentDuration || 120)}
              </span>
            </div>
          </div>

          {audioError && (
            <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              {audioError}
            </div>
          )}

          {/* ── Scrubber Slider ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="relative flex items-center group">
              <input
                type="range"
                min={0}
                max={currentDuration || 120}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Control Buttons ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => skipTime(-10)}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95 flex flex-col items-center text-[10px] font-bold"
              title="Lùi 10 giây"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="mt-0.5">-10s</span>
            </button>

            {/* Rewind 5s */}
            <button
              type="button"
              onClick={() => skipTime(-5)}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95 flex flex-col items-center text-[10px] font-bold"
              title="Lùi 5 giây"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="mt-0.5">-5s</span>
            </button>

            {/* Main Big Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-14 h-14 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-300 transition-all cursor-pointer active:scale-90 hover:scale-105"
              title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-1" />
              )}
            </button>

            {/* Forward 5s */}
            <button
              type="button"
              onClick={() => skipTime(5)}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95 flex flex-col items-center text-[10px] font-bold"
              title="Tua tới 5 giây"
            >
              <RotateCw className="w-4 h-4" />
              <span className="mt-0.5">+5s</span>
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => skipTime(10)}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95 flex flex-col items-center text-[10px] font-bold"
              title="Tua tới 10 giây"
            >
              <RotateCw className="w-4 h-4" />
              <span className="mt-0.5">+10s</span>
            </button>
          </div>

          {/* ── Sub-Controls: Speed & Volume ───────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* Speed selection */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tốc độ phát
              </span>
              <div className="flex items-center gap-1.5">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleSpeedChange(rate)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      playbackRate === rate
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Âm lượng
                </span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  title={isMuted ? "Bật âm" : "Tắt âm"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-500" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <a
            href={log.audio_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải file ghi âm</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
