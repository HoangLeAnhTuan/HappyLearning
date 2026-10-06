"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Accent = "en-US" | "en-GB" | "en-AU";
export type Speed = 0.75 | 0.9 | 1.0 | 1.15;
export type ProfileId =
  | "us-female"
  | "us-male"
  | "uk-female"
  | "uk-male"
  | "au-female"
  | "au-male";

export interface VoiceProfile {
  id: ProfileId;
  label: string;
  accent: Accent;
  gender: "female" | "male";
  region: string;
  flag: string;
  systemVoiceName: string;
}

const PROFILE_DEFINITIONS: Array<{
  id: ProfileId;
  label: string;
  accent: Accent;
  gender: "female" | "male";
  region: string;
  flag: string;
  femaleKeywords: string[];
  maleKeywords: string[];
}> = [
  {
    id: "us-female",
    label: "American Female",
    accent: "en-US",
    gender: "female",
    region: "American (US)",
    flag: "🇺🇸",
    femaleKeywords: [
      "jenny",
      "aria",
      "samantha",
      "ava",
      "allison",
      "victoria",
      "zira",
      "google us english",
      "female",
      "us",
    ],
    maleKeywords: [],
  },
  {
    id: "us-male",
    label: "American Male",
    accent: "en-US",
    gender: "male",
    region: "American (US)",
    flag: "🇺🇸",
    femaleKeywords: [],
    maleKeywords: [
      "guy",
      "christopher",
      "david",
      "alex",
      "tom",
      "fred",
      "aaron",
      "male",
      "us",
    ],
  },
  {
    id: "uk-female",
    label: "British Female",
    accent: "en-GB",
    gender: "female",
    region: "British (UK)",
    flag: "🇬🇧",
    femaleKeywords: [
      "sonia",
      "libby",
      "maisie",
      "stephanie",
      "serena",
      "fiona",
      "hazel",
      "susan",
      "google uk english female",
      "female",
    ],
    maleKeywords: [],
  },
  {
    id: "uk-male",
    label: "British Male",
    accent: "en-GB",
    gender: "male",
    region: "British (UK)",
    flag: "🇬🇧",
    femaleKeywords: [],
    maleKeywords: [
      "ryan",
      "george",
      "oliver",
      "daniel",
      "arthur",
      "thomas",
      "google uk english male",
      "male",
    ],
  },
  {
    id: "au-female",
    label: "Australian Female",
    accent: "en-AU",
    gender: "female",
    region: "Australian (AU)",
    flag: "🇦🇺",
    femaleKeywords: [
      "natasha",
      "annette",
      "karen",
      "catherine",
      "matilda",
      "elsie",
      "freya",
      "joanne",
      "tina",
      "google australian english female",
      "female",
    ],
    maleKeywords: [],
  },
  {
    id: "au-male",
    label: "Australian Male",
    accent: "en-AU",
    gender: "male",
    region: "Australian (AU)",
    flag: "🇦🇺",
    femaleKeywords: [],
    maleKeywords: [
      "william",
      "darren",
      "lee",
      "gordon",
      "russell",
      "carlyle",
      "duncan",
      "ken",
      "neil",
      "tim",
      "google australian english male",
      "male",
    ],
  },
];

// Helper to strictly resolve English voices per dialect and prevent non-English leak
function resolveVoiceForProfile(
  profile: (typeof PROFILE_DEFINITIONS)[number],
  allVoices: SpeechSynthesisVoice[]
): { voice: SpeechSynthesisVoice | null; displayName: string } {
  // 1. Filter strictly to English voices (NEVER allow non-English voices like Japanese, Chinese, etc.)
  const englishVoices = allVoices.filter((v) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    return lang.startsWith("en");
  });

  const normTarget = profile.accent.toLowerCase(); // "en-us", "en-gb", "en-au"

  // 2. Filter English voices belonging strictly to this regional dialect
  const regionalVoices = englishVoices.filter((v) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    const name = (v.name || "").toLowerCase();

    if (profile.accent === "en-GB") {
      return (
        lang.startsWith("en-gb") ||
        lang.startsWith("en-uk") ||
        name.includes("united kingdom") ||
        name.includes("uk english") ||
        name.includes("great britain") ||
        name.includes("british")
      );
    }

    if (profile.accent === "en-AU") {
      return (
        lang.startsWith("en-au") ||
        name.includes("australia") ||
        name.includes("australian")
      );
    }

    if (profile.accent === "en-US") {
      return (
        lang.startsWith("en-us") ||
        name.includes("united states") ||
        name.includes("us english") ||
        name.includes("american")
      );
    }

    return lang.startsWith(normTarget);
  });

  const keywords = profile.gender === "female" ? profile.femaleKeywords : profile.maleKeywords;

  // 3. Search within regional voices
  if (regionalVoices.length > 0) {
    // 3a. Look for Natural/Online voice with gender keyword
    for (const kw of keywords) {
      const found = regionalVoices.find((v) => {
        const n = v.name.toLowerCase();
        const isNatural =
          n.includes("natural") ||
          n.includes("online") ||
          n.includes("neural") ||
          n.includes("enhanced") ||
          n.includes("google");
        return isNatural && n.includes(kw);
      });
      if (found) return { voice: found, displayName: found.name };
    }

    // 3b. Look for any voice in region with gender keyword
    for (const kw of keywords) {
      const found = regionalVoices.find((v) => v.name.toLowerCase().includes(kw));
      if (found) return { voice: found, displayName: found.name };
    }

    // 3c. Look for any Natural voice in region
    const naturalInRegion = regionalVoices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes("natural") ||
        n.includes("online") ||
        n.includes("neural") ||
        n.includes("enhanced") ||
        n.includes("google")
      );
    });
    if (naturalInRegion) return { voice: naturalInRegion, displayName: naturalInRegion.name };

    // 3d. Fallback to first voice in region
    return { voice: regionalVoices[0], displayName: regionalVoices[0].name };
  }

  // 4. If no installed voice for this dialect is found:
  // Return null voice so the browser engine synthesizes `utterance.lang = profile.accent` natively
  // without overriding it with a mismatched US or other local voice.
  return {
    voice: null,
    displayName: `${profile.label} (${profile.accent})`,
  };
}

export function useSpeech() {
  const [selectedProfileId, setSelectedProfileId] = useState<ProfileId>("us-female");
  const [speed, setSpeed] = useState<Speed>(0.9);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [playing, setPlaying] = useState(false);
  const [activeElementIndex, setActiveElementIndex] = useState<number | null>(null);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const highlightedRef = useRef<HTMLElement | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Load browser voices & build 6 structured profiles
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const populateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (!allVoices || allVoices.length === 0) return;
      voicesRef.current = allVoices;

      const resolvedProfiles: VoiceProfile[] = PROFILE_DEFINITIONS.map((def) => {
        const { displayName } = resolveVoiceForProfile(def, allVoices);
        return {
          id: def.id,
          label: def.label,
          accent: def.accent,
          gender: def.gender,
          region: def.region,
          flag: def.flag,
          systemVoiceName: displayName,
        };
      });

      setVoiceProfiles(resolvedProfiles);

      // Restore saved profile
      const savedProfile = localStorage.getItem("selected_voice_profile") as ProfileId | null;
      if (savedProfile && resolvedProfiles.some((p) => p.id === savedProfile)) {
        setSelectedProfileId(savedProfile);
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    // Retry pollers to handle browser async voice loading
    const timer1 = setTimeout(populateVoices, 250);
    const timer2 = setTimeout(populateVoices, 1000);
    const timer3 = setTimeout(populateVoices, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const changeProfile = useCallback((profileId: ProfileId) => {
    setSelectedProfileId(profileId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_voice_profile", profileId);
    }
  }, []);

  const clearHighlight = useCallback(() => {
    if (highlightedRef.current) {
      highlightedRef.current.classList.remove("sp-on");
      highlightedRef.current = null;
    }
    setActiveElementIndex(null);
  }, []);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    clearHighlight();
    setPlaying(false);
  }, [clearHighlight]);

  // Clean text from artifacts before TTS
  const sanitizeTextForTTS = (rawText: string) => {
    return rawText
      .replace(/\[\[.+?\]\]/g, (m) => m.slice(2, -2).split("|")[0])
      .replace(/\{\{|\}\}/g, "")
      .replace(/[▾▼▲]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Get current active SpeechSynthesisVoice object
  const getActiveVoice = useCallback(() => {
    const currentDef = PROFILE_DEFINITIONS.find((p) => p.id === selectedProfileId);
    if (!currentDef) return null;
    const { voice } = resolveVoiceForProfile(currentDef, voicesRef.current);
    return voice;
  }, [selectedProfileId]);

  // Sequential speaker to prevent browser drop bugs
  const speak = useCallback(
    (items: Array<{ element: HTMLElement; text: string }>) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        alert("Read-aloud is not supported in this browser. Try Google Chrome, Microsoft Edge, or Apple Safari.");
        return;
      }

      window.speechSynthesis.cancel();
      clearHighlight();
      isCancelledRef.current = false;
      setPlaying(true);

      const activeVoice = getActiveVoice();
      const currentDef = PROFILE_DEFINITIONS.find((p) => p.id === selectedProfileId);
      const targetLang = currentDef?.accent || "en-US";
      const isFemale = currentDef?.gender === "female";

      let currentIndex = 0;

      const speakNext = () => {
        if (isCancelledRef.current || currentIndex >= items.length) {
          clearHighlight();
          setPlaying(false);
          return;
        }

        const currentItem = items[currentIndex];
        const cleanText = sanitizeTextForTTS(currentItem.text);

        if (!cleanText) {
          currentIndex++;
          speakNext();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = speed;
        utterance.lang = targetLang;
        utterance.pitch = isFemale ? 1.05 : 0.95;

        if (activeVoice && activeVoice.lang.toLowerCase().startsWith("en")) {
          utterance.voice = activeVoice;
        }

        utterance.onstart = () => {
          if (isCancelledRef.current) return;
          clearHighlight();
          currentItem.element.classList.add("sp-on");
          highlightedRef.current = currentItem.element;
          setActiveElementIndex(currentIndex);
          currentItem.element.scrollIntoView({ block: "nearest", behavior: "smooth" });
        };

        utterance.onend = () => {
          if (isCancelledRef.current) return;
          currentItem.element.classList.remove("sp-on");
          currentIndex++;
          speakNext();
        };

        utterance.onerror = (e) => {
          if (isCancelledRef.current) return;
          console.warn("TTS Utterance error:", e);
          currentItem.element.classList.remove("sp-on");
          currentIndex++;
          speakNext();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    },
    [speed, selectedProfileId, getActiveVoice, clearHighlight]
  );

  // Test voice sample with male / female greeting
  const testVoice = useCallback(
    (profileId?: ProfileId) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const targetId = profileId || selectedProfileId;
      const currentDef = PROFILE_DEFINITIONS.find((p) => p.id === targetId);
      if (!currentDef) return;

      const { voice } = resolveVoiceForProfile(currentDef, voicesRef.current);

      const sampleText =
        currentDef.gender === "female"
          ? `Hello! I am your ${currentDef.label} speaking coach. Let's practice speaking IELTS together!`
          : `Hello there! I am your ${currentDef.label} partner. Ready to speak English today?`;

      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.rate = speed;
      utterance.lang = currentDef.accent;
      utterance.pitch = currentDef.gender === "female" ? 1.05 : 0.95;

      if (voice && voice.lang.toLowerCase().startsWith("en")) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    },
    [selectedProfileId, speed]
  );

  const currentProfile = voiceProfiles.find((p) => p.id === selectedProfileId);

  return {
    selectedProfileId,
    setSelectedProfileId: changeProfile,
    voiceProfiles,
    currentProfile,
    speed,
    setSpeed,
    playing,
    activeElementIndex,
    speak,
    stop,
    testVoice,
  };
}
