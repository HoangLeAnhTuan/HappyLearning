"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Volume2,
  Square,
  Play,
  Compass,
  Gauge,
  Sparkles,
  Headphones,
  BookOpen,
  Mic,
  Layers,
  Lightbulb,
  Copy,
  CheckCheck,
  Bookmark,
  AlertTriangle,
  X,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { GapText } from "@/components/GapText";
import { useSpeech, Speed, ProfileId } from "@/hooks/useSpeech";
import { CustomSelect, SelectOption } from "@/components/CustomSelect";
import type { Topic } from "@/lib/types";

// ---- Outline client ------------------------------------------------------
export function OutlineClient({ topic }: { topic: Topic }) {
  const {
    speed,
    setSpeed,
    selectedProfileId,
    setSelectedProfileId,
    voiceProfiles,
    playing,
    speak,
    stop,
    testVoice,
    unsupportedModal,
    closeUnsupportedModal,
  } = useSpeech();

  const mainRef = useRef<HTMLDivElement>(null);

  // Track which option path user selected per step (for TTS & display)
  const [pathSelections, setPathSelections] = useState<Record<number, number>>({});
  const [globalPath, setGlobalPath] = useState<string>("0"); // Default to Path 1
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);

  // Rotating quotes
  const quotes = useMemo(
    () =>
      topic.motivational_quotes && topic.motivational_quotes.length > 0
        ? topic.motivational_quotes
        : [
            "Every word you speak makes you stronger",
            "Mistakes are proof that you are learning",
            "Small steps every day lead to big results",
            "Speak with confidence – you have got this",
            "Practice today, shine tomorrow",
          ],
    [topic.motivational_quotes]
  );
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Auto-rotate quotes every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((i) => (i + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  // Derive Path labels from steps if available (e.g. "Smartphone" / "Laptop")
  const path1Sample = useMemo(() => {
    for (const s of topic.steps) {
      if (s.options && s.options.length > 0 && s.options[0]?.label) {
        return s.options[0].label;
      }
    }
    return "Nhánh 1";
  }, [topic.steps]);

  const path2Sample = useMemo(() => {
    for (const s of topic.steps) {
      if (s.options && s.options.length > 1 && s.options[1]?.label) {
        return s.options[1].label;
      }
    }
    return "Nhánh 2";
  }, [topic.steps]);

  // Preset index for GapText (0 for Path 1, 1 for Path 2, undefined for Custom)
  const currentPresetIndex = globalPath === "0" ? 0 : globalPath === "1" ? 1 : undefined;

  // Switch all steps with options to path 0 or path 1
  const handleGlobalPathChange = (val: string) => {
    setGlobalPath(val);
    if (val === "0" || val === "1") {
      const idx = parseInt(val, 10);
      const newSelections: Record<number, number> = {};
      topic.steps.forEach((s) => {
        if (s.options && s.options.length > idx) {
          newSelections[s.step] = idx;
        } else if (s.options && s.options.length > 0) {
          newSelections[s.step] = 0;
        }
      });
      setPathSelections(newSelections);
    }
  };

  const handleStepOptionSelect = (stepNum: number, optIdx: number) => {
    setPathSelections((prev) => ({ ...prev, [stepNum]: optIdx }));
    setGlobalPath("custom");
  };

  const handlePillUserCycle = () => {
    setGlobalPath("custom");
  };

  // Build 6 Accent & Gender Voice options with clear availability indicators
  const voiceOptions: SelectOption<ProfileId>[] = useMemo(() => {
    if (voiceProfiles.length === 0) {
      return [
        {
          value: "us-female",
          label: "Mỹ - Nữ",
          subLabel: "Đang tải giọng...",
          flag: "🇺🇸",
        },
        {
          value: "us-male",
          label: "Mỹ - Nam",
          subLabel: "Đang tải giọng...",
          flag: "🇺🇸",
        },
        {
          value: "uk-female",
          label: "Anh - Nữ",
          subLabel: "Đang tải giọng...",
          flag: "🇬🇧",
        },
        {
          value: "uk-male",
          label: "Anh - Nam",
          subLabel: "Đang tải giọng...",
          flag: "🇬🇧",
        },
        {
          value: "au-female",
          label: "Úc - Nữ",
          subLabel: "Đang tải giọng...",
          flag: "🇦🇺",
        },
        {
          value: "au-male",
          label: "Úc - Nam",
          subLabel: "Đang tải giọng...",
          flag: "🇦🇺",
        },
      ];
    }

    return voiceProfiles.map((p) => ({
      value: p.id,
      label: p.label,
      subLabel: p.isAvailable ? p.systemVoiceName : "Chưa hỗ trợ trên trình duyệt này",
      flag: p.flag,
      badge: p.isAvailable ? undefined : "Chưa hỗ trợ",
      badgeColor: "amber",
      disabled: !p.isAvailable,
      onPreview: () => testVoice(p.id),
      previewLabel: p.isAvailable ? "Nghe" : "Thử",
    }));
  }, [voiceProfiles, testVoice]);

  // Speed Select options
  const speedOptions: SelectOption<Speed>[] = [
    {
      value: 0.75,
      label: "0.75x Chậm",
      subLabel: "Luyện phát âm rõ từng chữ",
    },
    {
      value: 0.9,
      label: "0.9x Chuẩn thi",
      subLabel: "Tốc độ chuẩn phòng thi IELTS",
    },
    {
      value: 1.0,
      label: "1.0x Tự nhiên",
      subLabel: "Tốc độ nói giao tiếp tự nhiên",
    },
    {
      value: 1.15,
      label: "1.15x Nhanh",
      subLabel: "Luyện độ trôi chảy nhanh",
    },
  ];

  // Model Answer Path options
  const pathOptions: SelectOption<string>[] = [
    {
      value: "0",
      label: `Path 1: ${path1Sample}`,
      subLabel: "Đồng bộ bài mẫu nhánh 1",
    },
    {
      value: "1",
      label: `Path 2: ${path2Sample}`,
      subLabel: "Đồng bộ bài mẫu nhánh 2",
    },
    {
      value: "custom",
      label: "Tự do ghép từ",
      subLabel: "Tùy biến từ điền khuyết",
    },
  ];

  // Gather all .ln elements inside a section to build TTS items
  const getLinesForSection = useCallback((sectionEl: HTMLElement) => {
    const lnEls = [...sectionEl.querySelectorAll<HTMLElement>(".ln")];
    return lnEls.map((el) => ({
      element: el,
      text: el.querySelector(".sent")?.textContent ?? "",
    }));
  }, []);

  const playAll = useCallback(() => {
    if (!mainRef.current) return;
    const allLn = [...mainRef.current.querySelectorAll<HTMLElement>(".ln")];
    speak(
      allLn.map((el) => ({
        element: el,
        text: el.querySelector(".sent")?.textContent ?? "",
      }))
    );
  }, [speak]);

  const playStep = useCallback(
    (sectionEl: HTMLElement) => {
      speak(getLinesForSection(sectionEl));
    },
    [speak, getLinesForSection]
  );

  const copyCategoryWords = (category: string, items: string[]) => {
    navigator.clipboard.writeText(items.join(", "));
    setCopiedCategory(category);
    setTimeout(() => setCopiedCategory(null), 2000);
  };

  const totalCollocations = useMemo(() => {
    return (topic.collocations || []).reduce((acc, cat) => acc + (cat.items?.length || 0), 0);
  }, [topic.collocations]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white py-3 sm:py-4 px-4 sm:px-6 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-[960px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-2.5">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shrink-0"></span>
              <span className="tracking-tight font-heading">HappyLearning Speaking Studio</span>
            </div>
            <span className="text-xs font-bold text-indigo-400 sm:hidden">Tracey Le</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            <div className="text-[11px] sm:text-xs md:text-sm bg-slate-800 border border-slate-700 text-slate-200 px-3 sm:px-4 py-1 rounded-full font-medium transition-all duration-300 flex items-center gap-1.5 sm:gap-2 max-w-full truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{quotes[quoteIdx]}</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-indigo-400 hidden sm:inline-block">
              Tracey Le
            </span>
          </div>
        </div>
      </header>

      {/* ── Topic Hero Card ─────────────────────────────────────────── */}
      <div className="max-w-[960px] mx-auto w-full px-3.5 sm:px-4 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-2.5 mb-3 sm:mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-200 shadow-2xs hover:bg-slate-100 active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden xs:inline">Danh sách</span> chủ đề
          </Link>

          <Link
            href={`/topic/${topic.slug}/showtime`}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl transition-all shadow-sm active:scale-95 font-heading shrink-0"
          >
            <Mic className="w-4 h-4" /> <span>Show Time (2 Phút) →</span>
          </Link>
        </div>

        {/* Hero Topic Title Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm mb-4 space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Dàn Ý Mẫu 7 Bước
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> {totalCollocations} Collocations
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> {topic.steps.length} Bước
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-heading text-slate-900 tracking-tight leading-snug sm:leading-tight m-0">
              {topic.title}
            </h1>
          </div>

          {/* Cue card prompt */}
          {topic.cue_card && (
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-2">
              <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> Đề Bài (Cue Card Prompt)
              </div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-900 m-0">
                {topic.cue_card.prompt}
              </p>
              {topic.cue_card.bullet_points && topic.cue_card.bullet_points.length > 0 && (
                <ul className="text-xs sm:text-sm md:text-base text-slate-700 space-y-1.5 pl-4 sm:pl-5 list-disc marker:text-indigo-500 font-medium pt-1">
                  {topic.cue_card.bullet_points.map((bp) => (
                    <li key={bp}>{bp}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Quick instructions */}
          <div className="rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm text-slate-700 bg-indigo-50/50 border border-indigo-200/80 flex items-start gap-2.5 sm:gap-3">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <b className="text-slate-900">Bí quyết luyện nói:</b> 1. Bấm các từ <b className="text-indigo-700 font-bold">▾ màu xanh</b> để chọn ý tưởng riêng. 2. Bấm <b className="text-indigo-700 font-bold">Nghe Toàn Bài</b> để nghe phát âm mẫu chuẩn bản xứ. 3. Luyện nói theo rồi bấm <b className="text-indigo-700 font-bold">Show Time</b> để vào ghi âm 2 phút!
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Responsive Audio Control Bar ─────────────────────────── */}
      <div className="sticky top-12 sm:top-14 z-30 bg-white/95 backdrop-blur-md border-y border-slate-200 py-2.5 sm:py-3 shadow-xs">
        <div className="max-w-[960px] mx-auto px-3.5 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Controls Group */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* 1. Accent & Gender Selector */}
            <div className="col-span-2 sm:col-span-1">
              <CustomSelect<ProfileId>
                value={selectedProfileId}
                onChange={setSelectedProfileId}
                options={voiceOptions}
                label="Giọng đọc & Quốc gia"
                icon={<Headphones className="w-4 h-4 text-indigo-600" />}
                buttonClassName="w-full sm:min-w-[170px]"
                menuClassName="w-[calc(100vw-32px)] sm:w-[280px]"
              />
            </div>

            {/* 2. Speed Selector */}
            <div className="col-span-1">
              <CustomSelect<Speed>
                value={speed}
                onChange={setSpeed}
                options={speedOptions}
                label="Tốc độ nói"
                icon={<Gauge className="w-4 h-4 text-amber-600" />}
                buttonClassName="w-full sm:min-w-[125px]"
                menuClassName="w-[calc(100vw-32px)] sm:w-[220px]"
              />
            </div>

            {/* 3. Model Answer Path Selector */}
            <div className="col-span-1">
              <CustomSelect<string>
                value={globalPath}
                onChange={handleGlobalPathChange}
                options={pathOptions}
                label="Nhánh bài mẫu"
                icon={<Compass className="w-4 h-4 text-teal-600" />}
                buttonClassName="w-full sm:min-w-[155px]"
                menuClassName="w-[calc(100vw-32px)] sm:w-[250px]"
              />
            </div>
          </div>

          {/* Action TTS Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={playAll}
              disabled={playing}
              className="flex-1 sm:flex-initial h-[46px] sm:h-[48px] text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 disabled:opacity-50 font-heading"
              type="button"
            >
              <Play className="w-4 h-4 fill-white shrink-0" />
              <span>{playing ? "Đang đọc mẫu..." : "Nghe Toàn Bài"}</span>
            </button>

            {playing && (
              <button
                onClick={stop}
                className="h-[46px] sm:h-[48px] text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer shadow-sm bg-rose-600 hover:bg-rose-700 text-white active:scale-95 animate-pulse shrink-0 font-heading"
                type="button"
              >
                <Square className="w-4 h-4 fill-white" /> Dừng
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Step Cards ─────────────────────────────────────────────────── */}
      <main
        ref={mainRef}
        className="max-w-[960px] mx-auto w-full px-3.5 sm:px-4 py-5 sm:py-7 flex flex-col gap-4 sm:gap-6"
      >
        {topic.steps.map((step) => {
          const hasOptions = step.options && step.options.length > 0;
          const selectedPath = pathSelections[step.step] ?? (globalPath === "1" ? 1 : 0);

          return (
            <section
              key={step.step}
              className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm transition-all hover:border-slate-300 space-y-3 sm:space-y-4"
              data-step={step.step}
            >
              {/* Step Header */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl px-2.5 sm:px-3.5 py-1 text-xs sm:text-sm font-bold font-mono shrink-0">
                    BƯỚC {step.step}
                  </span>
                  <h2 className="text-base sm:text-xl font-bold font-heading text-slate-900 m-0">
                    {step.title}
                  </h2>
                </div>

                <PlayStepBtn
                  onPlay={(btn) => {
                    const section = btn.closest("section") as HTMLElement;
                    if (section) playStep(section);
                  }}
                />
              </div>

              {/* Coach Tip */}
              {step.coach_tip && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-amber-950 font-medium flex items-start gap-2 sm:gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950">Coach Tip:</span> {step.coach_tip}
                  </div>
                </div>
              )}

              {/* Content with Options or Single Template */}
              {hasOptions ? (
                <div className="space-y-3">
                  {/* Step Option Tabs */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Lựa chọn ý tưởng:
                    </span>
                    {step.options?.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleStepOptionSelect(step.step, optIdx)}
                        className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                          selectedPath === optIdx
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        {opt.label || `Lựa chọn ${optIdx + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* Template for active option */}
                  {step.options?.[selectedPath] && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-5 border border-slate-200 space-y-2">
                      <div className="ln">
                        <div className="sent text-sm sm:text-base leading-relaxed">
                          <GapText
                            text={step.options[selectedPath].text || ""}
                            presetIndex={currentPresetIndex}
                            onUserCycle={handlePillUserCycle}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-5 border border-slate-200 space-y-2">
                  {(step.templates || []).map((t, i) => (
                    <div key={i} className="ln">
                      <div className="sent text-sm sm:text-base leading-relaxed">
                        <GapText
                          text={t}
                          presetIndex={currentPresetIndex}
                          onUserCycle={handlePillUserCycle}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* ── Collocation Bank ──────────────────────────────────────────── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold font-heading text-slate-900 m-0">
                  Collocation Bank (Cụm Từ Vựng Trọng Tâm)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Ghi nhớ và sử dụng để nâng cao tiêu chí Lexical Resource
                </p>
              </div>
            </div>

            <span className="text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              {totalCollocations} cụm từ
            </span>
          </div>

          <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {(topic.collocations || []).map((cat) => (
              <div
                key={cat.category}
                className="bg-slate-50 rounded-2xl p-3.5 sm:p-5 border border-slate-200 flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5 border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700 truncate">
                      {cat.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCategoryWords(cat.category, cat.items || [])}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Sao chép toàn bộ"
                    >
                      {copiedCategory === cat.category ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <ul className="list-none p-0 m-0 space-y-1.5 sm:space-y-2">
                    {(cat.items || []).map((item) => (
                      <li
                        key={item}
                        className="text-xs sm:text-sm md:text-base text-slate-900 font-semibold flex gap-2 items-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Next Step CTA ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center py-4 sm:py-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-bold px-5 py-3 sm:py-3.5 rounded-2xl border border-slate-200 text-sm sm:text-base shadow-2xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Danh Sách Chủ Đề
          </Link>
          <Link
            href={`/topic/${topic.slug}/showtime`}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base shadow-sm transition-all font-heading active:scale-95"
          >
            <Mic className="w-4 h-4" /> Vào Show Time (Luyện Nói 2 Phút) →
          </Link>
        </div>
      </main>

      {/* ── Unsupported Voice Pop-up Modal ──────────────────────────────── */}
      {unsupportedModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={closeUnsupportedModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 m-0">
                Giọng Đọc Chưa Được Hỗ Trợ
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Giọng{" "}
                <b className="text-slate-900">
                  {unsupportedModal.profile?.flag} {unsupportedModal.profile?.label}
                </b>{" "}
                hiện chưa được cài đặt sẵn trên trình duyệt hoặc thiết bị của bạn.
              </p>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Các giọng có thể sử dụng ngay:
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {unsupportedModal.availableProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfileId(p.id);
                        closeUnsupportedModal();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>{p.flag}</span>
                      <span>{p.label.split("(")[0].trim()}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 italic pt-1">
                💡 Mẹo: Mở trang web bằng <b>Microsoft Edge</b> (Windows) hoặc <b>Apple Safari</b> (Mac/iOS) để kích hoạt đầy đủ 6 giọng chuẩn AI siêu tự nhiên (Mỹ, Anh, Úc).
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {unsupportedModal.availableProfiles[0] && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfileId(unsupportedModal.availableProfiles[0].id);
                    closeUnsupportedModal();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer font-heading flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Chuyển sang {unsupportedModal.availableProfiles[0].label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={closeUnsupportedModal}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer active:scale-98"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-6 text-xs sm:text-sm text-slate-500 font-medium border-t border-slate-200 bg-white mt-auto">
        HappyLearning Speaking Studio • Teacher Tracey Le
      </footer>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function PlayStepBtn({
  onPlay,
}: {
  onPlay: (buttonEl: HTMLButtonElement) => void;
}) {
  return (
    <button
      onClick={(e) => onPlay(e.currentTarget)}
      className="text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
      type="button"
      title="Đọc phát âm mẫu cho phần này"
    >
      <Volume2 className="w-3.5 h-3.5" /> <span>Đọc mẫu</span>
    </button>
  );
}
