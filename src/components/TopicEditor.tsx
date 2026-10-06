"use client";

import { useState } from "react";
import type { Topic, Step, CollocationCategory } from "@/lib/types";
import { GapText } from "@/components/GapText";
import {
  Plus,
  Trash2,
  Eye,
  Code,
  Save,
  ArrowLeft,
  Wand2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface TopicEditorProps {
  initialTopic?: Topic | null;
  onSave: (topic: Partial<Topic>) => Promise<void>;
  onCancel: () => void;
}

const DEFAULT_MOTIVATION = [
  "Every word you speak makes you stronger",
  "Mistakes are proof that you are learning",
  "Small steps every day lead to big results",
  "Speak with confidence – you have got this",
  "Practice today, shine in the exam",
];

const DEFAULT_7_STEPS: Step[] = [
  {
    step: 1,
    title: "Introduction",
    coach_tip: "Start with a confident opening sentence.",
    templates: [
      "When it comes to [[my favorite topic]], it is the first one that comes to my mind.",
    ],
  },
  {
    step: 2,
    title: "When / Where",
    coach_tip: "Share background context to set the scene.",
    options: [
      {
        label: "Option 1: In the past",
        text: "{{As far as I remember}}, it happened [[a few years ago|when I was in high school]].",
      },
      {
        label: "Option 2: Recently",
        text: "{{As far as I remember}}, I started [[last year|a few months ago]].",
      },
    ],
    follow_up: "And it has been with me {{for quite a while now}}.",
  },
  {
    step: 3,
    title: "Key Details",
    coach_tip: "Give concrete facts or your immediate reaction.",
    options: [
      {
        label: "Positive aspect",
        text: "{{The good news is that}} it went really well, so I was truly thrilled.",
      },
      {
        label: "Challenge faced",
        text: "{{The only downside is that}} it took a lot of effort at first.",
      },
    ],
  },
  {
    step: 4,
    title: "In-depth Description",
    coach_tip: "Describe specific features or personal impact.",
    options: [
      {
        label: "Option 1: Features",
        text: "{{Talking about}} its qualities, {{what really blew me away was}} the amazing atmosphere.",
      },
      {
        label: "Option 2: Impact",
        text: "{{Talking about}} the experience, it had a truly positive impact on my mindset.",
      },
    ],
  },
  {
    step: 5,
    title: "Key Activities / Reasons",
    coach_tip: "Explain why this topic matters with linking phrases.",
    templates: [
      "{{To be honest}}, this has become an important part of my life.",
      "{{First and foremost}}, it helps me [[relax|stay motivated|achieve my goals]].",
      "{{On top of that}}, it {{comes in handy}} whenever I need a boost.",
    ],
  },
  {
    step: 6,
    title: "Personal Feelings",
    coach_tip: "Express emotional connection and reflection.",
    templates: [
      "{{Ultimately}}, the reason why it matters so much is because it brought me unforgettable memories.",
    ],
  },
  {
    step: 7,
    title: "Closing sentence",
    coach_tip: "Conclude with a memorable final statement.",
    templates: [
      "All in all, {{I can confidently say that}} it is {{hands down}} one of the best experiences I have ever had.",
    ],
  },
];

export function TopicEditor({ initialTopic, onSave, onCancel }: TopicEditorProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState(initialTopic?.title || "");
  const [slug, setSlug] = useState(initialTopic?.slug || "");
  const [prompt, setPrompt] = useState(
    initialTopic?.cue_card?.prompt || initialTopic?.title || ""
  );
  const [bulletPoints, setBulletPoints] = useState<string[]>(
    initialTopic?.cue_card?.bullet_points || [
      "When / Where it happened",
      "Who was involved",
      "What happened",
      "Why it was memorable",
    ]
  );
  const [motivationalQuotes, setMotivationalQuotes] = useState<string[]>(
    initialTopic?.motivational_quotes || DEFAULT_MOTIVATION
  );
  const [steps, setSteps] = useState<Step[]>(
    initialTopic?.steps && initialTopic.steps.length > 0
      ? initialTopic.steps
      : DEFAULT_7_STEPS
  );
  const [collocations, setCollocations] = useState<CollocationCategory[]>(
    initialTopic?.collocations || [
      {
        category: "Timing & Context",
        items: ["As far as I remember", "for quite a while now"],
      },
      {
        category: "Info & Reaction",
        items: ["The good news is that", "The only downside is that"],
      },
      {
        category: "Description",
        items: ["Talking about", "what really blew me away was"],
      },
      {
        category: "Functions & Reasons",
        items: ["To be honest", "First and foremost", "On top of that", "comes in handy"],
      },
      {
        category: "Closing & Impact",
        items: ["Ultimately", "I can confidently say that", "hands down"],
      },
    ]
  );

  // JSON mode text
  const [jsonText, setJsonText] = useState("");

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!initialTopic) {
      // Auto-generate slug for new topic
      const generatedSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
      setPrompt(newTitle);
    }
  };

  const autoExtractCollocations = () => {
    const extractedSet = new Set<string>();
    const extractFromText = (t: string) => {
      const matches = t.match(/\{\{(.+?)\}\}/g);
      if (matches) {
        matches.forEach((m) => extractedSet.add(m.slice(2, -2).trim()));
      }
    };

    steps.forEach((s) => {
      s.templates?.forEach(extractFromText);
      s.options?.forEach((o) => extractFromText(o.text));
      if (s.follow_up) extractFromText(s.follow_up);
    });

    const items = Array.from(extractedSet);
    if (items.length === 0) {
      alert("No {{collocation}} tags found in outline steps. Add {{word}} in your step text first.");
      return;
    }

    const updated = [...collocations];
    if (updated.length === 0) {
      updated.push({
        category: "High-Yield Collocations",
        items,
      });
    } else {
      const allExisting = new Set(updated.flatMap((c) => c.items));
      const newItems = items.filter((it) => !allExisting.has(it));
      if (newItems.length > 0) {
        updated[0].items = [...updated[0].items, ...newItems];
      }
    }
    setCollocations(updated);
    alert(`Extracted and synchronized ${items.length} collocations.`);
  };

  const switchToJson = () => {
    const currentData = {
      title,
      slug,
      cue_card: {
        prompt,
        bullet_points: bulletPoints.filter((b) => b.trim().length > 0),
      },
      motivational_quotes: motivationalQuotes.filter((q) => q.trim().length > 0),
      steps,
      collocations,
    };
    setJsonText(JSON.stringify(currentData, null, 2));
    setActiveTab("json");
  };

  const switchFromJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.slug) setSlug(parsed.slug);
      if (parsed.cue_card?.prompt) setPrompt(parsed.cue_card.prompt);
      if (parsed.cue_card?.bullet_points)
        setBulletPoints(parsed.cue_card.bullet_points);
      if (parsed.motivational_quotes)
        setMotivationalQuotes(parsed.motivational_quotes);
      if (parsed.steps) setSteps(parsed.steps);
      if (parsed.collocations) setCollocations(parsed.collocations);
      setError(null);
      setActiveTab("visual");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid JSON";
      setError(`JSON Parsing Error: ${msg}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === "json") {
      try {
        const parsed = JSON.parse(jsonText);
        setSaving(true);
        await onSave(parsed);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid JSON";
        setError(`JSON Error: ${msg}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        slug: slug.trim(),
        cue_card: {
          prompt: prompt.trim() || title.trim(),
          bullet_points: bulletPoints.filter((b) => b.trim().length > 0),
        },
        motivational_quotes: motivationalQuotes.filter((q) => q.trim().length > 0),
        steps,
        collocations,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Topics
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (activeTab === "visual" ? switchToJson() : switchFromJson())}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
          >
            {activeTab === "visual" ? (
              <>
                <Code className="w-4 h-4" /> JSON Mode
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" /> Visual Mode
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
          {initialTopic ? "Edit Speaking Topic" : "Create New Speaking Topic"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure outline steps, cue card bullet points, interactive gap choices, and collocations.
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeTab === "json" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <label className="block font-semibold text-xs text-slate-700 mb-2">
              Raw Topic JSON:
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-[520px] font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              spellCheck={false}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={switchFromJson}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Topic"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Basic Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <h3 className="text-sm font-bold text-slate-900 m-0">1. Topic Information</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Topic Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Describe an electronic device you use often"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  URL Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. describe-an-electronic-device-you-use-often"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Cue Card */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cue Card Prompt
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Describe an electronic device you use often"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cue Card Bullet Points:
                </label>
                <div className="space-y-2">
                  {bulletPoints.map((bp, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={bp}
                        onChange={(e) => {
                          const updated = [...bulletPoints];
                          updated[i] = e.target.value;
                          setBulletPoints(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setBulletPoints(bulletPoints.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 p-2 transition-colors"
                        title="Remove bullet point"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBulletPoints([...bulletPoints, ""])}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add bullet point
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Syntax Helper Guide */}
          <div className="rounded-2xl p-4 bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-indigo-900 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-indigo-600" /> Syntax Guide for Outline Sentences:
            </div>
            <div className="text-slate-600">
              • <b>Interactive Dropdown Pills:</b> Use{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-semibold">
                [[option1|option2|option3]]
              </code>{" "}
              to create clickable choices for students.
            </div>
            <div className="text-slate-600">
              • <b>Target Collocations:</b> Use{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-semibold">
                {"{{collocation phrase}}"}
              </code>{" "}
              to highlight key vocabulary in gold.
            </div>
          </div>

          {/* 2. Speaking Outline Steps */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <h3 className="text-sm font-bold text-slate-900 m-0">2. Scaffold Steps</h3>
              </div>
              <button
                type="button"
                onClick={() => setSteps(DEFAULT_7_STEPS)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Reset to Standard 7-Step Template
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, sIdx) => (
                <div
                  key={step.step}
                  className="rounded-xl p-4 border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                        Step {step.step}
                      </span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[sIdx].title = e.target.value;
                          setSteps(updated);
                        }}
                        className="font-bold text-xs sm:text-sm px-2.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-900"
                        placeholder="Step title"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...steps];
                          if (step.options) {
                            // Convert to template
                            updated[sIdx] = {
                              step: step.step,
                              title: step.title,
                              coach_tip: step.coach_tip,
                              templates: [step.options[0]?.text || ""],
                            };
                          } else {
                            // Convert to options
                            updated[sIdx] = {
                              step: step.step,
                              title: step.title,
                              coach_tip: step.coach_tip,
                              options: [
                                { label: "Option 1", text: step.templates?.[0] || "" },
                                { label: "Option 2", text: "" },
                              ],
                            };
                          }
                          setSteps(updated);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        Mode: {step.options ? "Multiple Branches" : "Single Sentence"}
                      </button>
                    </div>
                  </div>

                  {/* Coach Tip */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Teacher Coach Tip:
                    </label>
                    <input
                      type="text"
                      value={step.coach_tip}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[sIdx].coach_tip = e.target.value;
                        setSteps(updated);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                      placeholder="e.g. Start with a confident opening sentence."
                    />
                  </div>

                  {/* Step Text Fields */}
                  {step.options ? (
                    <div className="space-y-2 pt-1">
                      {step.options.map((opt, oIdx) => (
                        <div key={oIdx} className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[sIdx].options![oIdx].label = e.target.value;
                              setSteps(updated);
                            }}
                            className="text-xs font-semibold px-2 py-0.5 rounded border border-slate-200 mb-1 w-full max-w-[200px] text-slate-800"
                            placeholder="Option Label"
                          />
                          <textarea
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[sIdx].options![oIdx].text = e.target.value;
                              setSteps(updated);
                            }}
                            rows={2}
                            className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono text-slate-800 bg-slate-50/50"
                            placeholder="Option text with [[options]] and {{collocations}}"
                          />
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Follow-up Sentence (Optional):
                        </label>
                        <input
                          type="text"
                          value={step.follow_up || ""}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[sIdx].follow_up = e.target.value;
                            setSteps(updated);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-slate-800"
                          placeholder="e.g. And it has been with me {{for quite a while now}}."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {(step.templates || [""]).map((tmpl, tIdx) => (
                        <div key={tIdx} className="flex gap-2">
                          <textarea
                            value={tmpl}
                            onChange={(e) => {
                              const updated = [...steps];
                              const newTemplates = [...(updated[sIdx].templates || [""])];
                              newTemplates[tIdx] = e.target.value;
                              updated[sIdx].templates = newTemplates;
                              setSteps(updated);
                            }}
                            rows={2}
                            className="flex-1 text-xs p-2 rounded-lg border border-slate-200 font-mono text-slate-800 bg-white"
                            placeholder="Sentence with [[options]] and {{collocations}}"
                          />
                          {(step.templates?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...steps];
                                updated[sIdx].templates = updated[sIdx].templates?.filter(
                                  (_, idx) => idx !== tIdx
                                );
                                setSteps(updated);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...steps];
                          updated[sIdx].templates = [
                            ...(updated[sIdx].templates || [""]),
                            "",
                          ];
                          setSteps(updated);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add sentence
                      </button>
                    </div>
                  )}

                  {/* Live Mini Preview */}
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                      Student Preview:
                    </span>
                    <div className="text-xs text-slate-800 p-2.5 bg-white rounded-lg border border-slate-200">
                      {step.options ? (
                        <GapText text={step.options[0]?.text || ""} />
                      ) : (
                        <GapText text={step.templates?.[0] || ""} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Collocations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <h3 className="text-sm font-bold text-slate-900 m-0">3. Collocations Bank</h3>
              </div>
              <button
                type="button"
                onClick={autoExtractCollocations}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" /> Auto-Sync from Outline {"{{...}}"}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {collocations.map((cat, cIdx) => (
                <div
                  key={cIdx}
                  className="rounded-xl p-3.5 border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={cat.category}
                      onChange={(e) => {
                        const updated = [...collocations];
                        updated[cIdx].category = e.target.value;
                        setCollocations(updated);
                      }}
                      className="font-semibold text-xs px-2 py-1 border border-slate-200 rounded-lg flex-1 bg-white text-slate-800"
                      placeholder="Category Name"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCollocations(collocations.filter((_, idx) => idx !== cIdx))
                      }
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    value={cat.items.join(", ")}
                    onChange={(e) => {
                      const updated = [...collocations];
                      updated[cIdx].items = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      setCollocations(updated);
                    }}
                    rows={3}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 font-sans text-slate-800 bg-white"
                    placeholder="Comma-separated items: As far as I remember, for quite a while now, ..."
                  />
                  <div className="text-[11px] text-slate-400 font-medium">
                    {cat.items.length} items in this category
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setCollocations([
                  ...collocations,
                  { category: "New Category", items: [] },
                ])
              }
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add collocation category
            </button>
          </div>

          {/* 4. Motivational Quotes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <h3 className="text-sm font-bold text-slate-900 m-0">4. Motivational Quotes</h3>
            </div>
            <div className="space-y-2">
              {motivationalQuotes.map((q, qIdx) => (
                <div key={qIdx} className="flex gap-2">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const updated = [...motivationalQuotes];
                      updated[qIdx] = e.target.value;
                      setMotivationalQuotes(updated);
                    }}
                    className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMotivationalQuotes(
                        motivationalQuotes.filter((_, idx) => idx !== qIdx)
                      )
                    }
                    className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMotivationalQuotes([...motivationalQuotes, ""])}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add quote
              </button>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="flex justify-end gap-2.5 sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-md">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Topic"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
