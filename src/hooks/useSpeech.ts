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
      "maisie",
      "libby",
      "stephanie",
      "serena",
      "fiona",
      "hazel",
      "google uk english female",
      "female",
      "gb",
      "uk",
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
      "google uk english male",
      "male",
      "gb",
      "uk",
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
      "google australian english female",
      "female",
      "au",
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
      "google australian english male",
      "male",
      "au",
    ],
  },
];

// Helper to find the best matching voice for a given profile
function resolveVoiceForProfile(
  profile: (typeof PROFILE_DEFINITIONS)[number],
  allVoices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const normLang = profile.accent.replace("_", "-").toLowerCase();
  const regionalVoices = allVoices.filter((v) =>
    v.lang.replace("_", "-").toLowerCase().startsWith(normLang)
  );

  const pool = regionalVoices.length > 0 ? regionalVoices : allVoices;
  const keywords = profile.gender === "female" ? profile.femaleKeywords : profile.maleKeywords;

  // 1. Look for Natural/Online/Neural/Enhanced voice matching keywords
  for (const kw of keywords) {
    const found = pool.find((v) => {
      const n = v.name.toLowerCase();
      const isNatural =
        n.includes("natural") ||
        n.includes("online") ||
        n.includes("neural") ||
        n.includes("enhanced") ||
        n.includes("google");
      return isNatural && n.includes(kw);
    });
    if (found) return found;
  }

  // 2. Look for regular voice matching keywords
  for (const kw of keywords) {
    const found = pool.find((v) => v.name.toLowerCase().includes(kw));
    if (found) return found;
  }

  // 3. Look for any Natural voice in the region
  const naturalInRegion = pool.find((v) => {
    const n = v.name.toLowerCase();
    return (
      n.includes("natural") ||
      n.includes("online") ||
      n.includes("neural") ||
      n.includes("enhanced") ||
      n.includes("google")
    );
  });
  if (naturalInRegion) return naturalInRegion;

  // 4. Fallback to first voice in region or default
  return pool[0] || null;
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
        const voice = resolveVoiceForProfile(def, allVoices);
        return {
          id: def.id,
          label: def.label,
          accent: def.accent,
          gender: def.gender,
          region: def.region,
          flag: def.flag,
          systemVoiceName: voice?.name || def.label,
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

    return () => {
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
    const currentProfile = voiceProfiles.find((p) => p.id === selectedProfileId);
    if (!currentProfile) return null;
    return (
      voicesRef.current.find((v) => v.name === currentProfile.systemVoiceName) ||
      voicesRef.current.find((v) =>
        v.lang.replace("_", "-").toLowerCase().startsWith(currentProfile.accent.toLowerCase())
      ) ||
      null
    );
  }, [voiceProfiles, selectedProfileId]);

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
      const currentProfile = voiceProfiles.find((p) => p.id === selectedProfileId);
      const targetLang = currentProfile?.accent || "en-US";

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
        if (activeVoice) {
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
    [speed, selectedProfileId, voiceProfiles, getActiveVoice, clearHighlight]
  );

  // Test voice sample with male / female greeting
  const testVoice = useCallback(
    (profileId?: ProfileId) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const targetId = profileId || selectedProfileId;
      const profile = voiceProfiles.find((p) => p.id === targetId) || PROFILE_DEFINITIONS.find((p) => p.id === targetId);
      if (!profile) return;

      const voice =
        voicesRef.current.find((v) => v.name === ("systemVoiceName" in profile ? profile.systemVoiceName : "")) ||
        voicesRef.current.find((v) =>
          v.lang.replace("_", "-").toLowerCase().startsWith(profile.accent.toLowerCase())
        );

      const sampleText =
        profile.gender === "female"
          ? "Hello! I am your speaking partner. Let's practice speaking together!"
          : "Hello there! I'm ready to practice speaking with you today.";

      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.rate = speed;
      utterance.lang = profile.accent;
      if (voice) {
        utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    },
    [selectedProfileId, voiceProfiles, speed]
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