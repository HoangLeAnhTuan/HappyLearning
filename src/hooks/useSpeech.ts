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
  isAvailable: boolean;
  sampleGreeting: string;
}

export interface UnsupportedVoiceState {
  isOpen: boolean;
  profile: VoiceProfile | null;
  availableProfiles: VoiceProfile[];
}

const PROFILE_DEFINITIONS: Array<{
  id: ProfileId;
  label: string;
  accent: Accent;
  gender: "female" | "male";
  region: string;
  flag: string;
  sampleGreeting: string;
  preferredKeywords: string[];
}> = [
  {
    id: "us-female",
    label: "Mỹ - Nữ (American Female)",
    accent: "en-US",
    gender: "female",
    region: "American (US)",
    flag: "🇺🇸",
    sampleGreeting: "Hi there! I am your American speaking coach. Let's practice IELTS Speaking together!",
    preferredKeywords: [
      "jenny",
      "zira",
      "aria",
      "samantha",
      "ava",
      "allison",
      "victoria",
      "michelle",
      "emma",
      "google us english",
    ],
  },
  {
    id: "us-male",
    label: "Mỹ - Nam (American Male)",
    accent: "en-US",
    gender: "male",
    region: "American (US)",
    flag: "🇺🇸",
    sampleGreeting: "Hello there! I'm your American speaking partner. Ready to speak English today?",
    preferredKeywords: [
      "guy",
      "david",
      "mark",
      "alex",
      "christopher",
      "eric",
      "roger",
      "tom",
      "fred",
      "aaron",
      "brian",
      "andrew",
      "steffan",
    ],
  },
  {
    id: "uk-female",
    label: "Anh - Nữ (British Female)",
    accent: "en-GB",
    gender: "female",
    region: "British (UK)",
    flag: "🇬🇧",
    sampleGreeting: "Hello! I am your British speaking coach. Let's practice speaking IELTS together!",
    preferredKeywords: [
      "sonia",
      "libby",
      "maisie",
      "stephanie",
      "serena",
      "fiona",
      "hazel",
      "susan",
      "google uk english female",
    ],
  },
  {
    id: "uk-male",
    label: "Anh - Nam (British Male)",
    accent: "en-GB",
    gender: "male",
    region: "British (UK)",
    flag: "🇬🇧",
    sampleGreeting: "Good day! I'm your British speaking partner. Let's get ready for your IELTS test.",
    preferredKeywords: [
      "ryan",
      "george",
      "oliver",
      "daniel",
      "arthur",
      "thomas",
      "google uk english male",
    ],
  },
  {
    id: "au-female",
    label: "Úc - Nữ (Australian Female)",
    accent: "en-AU",
    gender: "female",
    region: "Australian (AU)",
    flag: "🇦🇺",
    sampleGreeting: "G'day! I am your Australian speaking coach. Let's practice IELTS speaking together!",
    preferredKeywords: [
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
      "google australian english",
    ],
  },
  {
    id: "au-male",
    label: "Úc - Nam (Australian Male)",
    accent: "en-AU",
    gender: "male",
    region: "Australian (AU)",
    flag: "🇦🇺",
    sampleGreeting: "G'day mate! I'm your Australian speaking partner. Ready to ace your IELTS speaking test?",
    preferredKeywords: [
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
    ],
  },
];

// Helper to filter English voices strictly matching dialect & gender without guessing
function resolveVoiceForProfile(
  profile: (typeof PROFILE_DEFINITIONS)[number],
  allVoices: SpeechSynthesisVoice[]
): { voice: SpeechSynthesisVoice | null; displayName: string; isAvailable: boolean } {
  // 1. Strict English filter: Never ever permit Japanese, Chinese, Vietnamese etc.
  const englishVoices = allVoices.filter((v) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    return lang.startsWith("en");
  });

  if (englishVoices.length === 0) {
    return {
      voice: null,
      displayName: "Chưa hỗ trợ trên thiết bị này",
      isAvailable: false,
    };
  }

  // 2. Strict Regional Filter for requested dialect
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

    return false;
  });

  // 3. Search within matching regional voices
  if (regionalVoices.length > 0) {
    // 3a. Natural / Neural / Online with specific name keyword
    for (const kw of profile.preferredKeywords) {
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
      if (found) return { voice: found, displayName: found.name, isAvailable: true };
    }

    // 3b. Any voice in region with specific name keyword
    for (const kw of profile.preferredKeywords) {
      const found = regionalVoices.find((v) => v.name.toLowerCase().includes(kw));
      if (found) return { voice: found, displayName: found.name, isAvailable: true };
    }

    // 3c. Filter by gender keyword in voice name
    const genderVoice = regionalVoices.find((v) => {
      const n = v.name.toLowerCase();
      return profile.gender === "female"
        ? n.includes("female") || n.includes("woman") || n.includes("zira") || n.includes("jenny") || n.includes("sonia")
        : n.includes("male") || n.includes("man") || n.includes("david") || n.includes("guy") || n.includes("ryan") || n.includes("george");
    });
    if (genderVoice) return { voice: genderVoice, displayName: genderVoice.name, isAvailable: true };

    // 3d. Any natural voice in region
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
    if (naturalInRegion) return { voice: naturalInRegion, displayName: naturalInRegion.name, isAvailable: true };

    // 3e. First available regional voice
    return { voice: regionalVoices[0], displayName: regionalVoices[0].name, isAvailable: true };
  }

  // 4. If region is NOT installed in browser/OS, return unavailable (Do NOT guess / Do NOT play mismatched US voice)
  return {
    voice: null,
    displayName: "Chưa hỗ trợ trên thiết bị này",
    isAvailable: false,
  };
}

export function useSpeech() {
  const [selectedProfileId, setSelectedProfileId] = useState<ProfileId>("us-female");
  const [speed, setSpeed] = useState<Speed>(0.9);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [playing, setPlaying] = useState(false);
  const [activeElementIndex, setActiveElementIndex] = useState<number | null>(null);

  // Modal state when a voice is not supported
  const [unsupportedModal, setUnsupportedModal] = useState<UnsupportedVoiceState>({
    isOpen: false,
    profile: null,
    availableProfiles: [],
  });

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
        const { displayName, isAvailable } = resolveVoiceForProfile(def, allVoices);
        return {
          id: def.id,
          label: def.label,
          accent: def.accent,
          gender: def.gender,
          region: def.region,
          flag: def.flag,
          systemVoiceName: displayName,
          isAvailable,
          sampleGreeting: def.sampleGreeting,
        };
      });

      setVoiceProfiles(resolvedProfiles);

      // Restore saved profile or select first available
      const savedProfile = localStorage.getItem("selected_voice_profile") as ProfileId | null;
      if (savedProfile && resolvedProfiles.some((p) => p.id === savedProfile && p.isAvailable)) {
        setSelectedProfileId(savedProfile);
      } else {
        const firstAvailable = resolvedProfiles.find((p) => p.isAvailable);
        if (firstAvailable) {
          setSelectedProfileId(firstAvailable.id);
        }
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    const timer1 = setTimeout(populateVoices, 200);
    const timer2 = setTimeout(populateVoices, 800);
    const timer3 = setTimeout(populateVoices, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const openUnsupportedModal = useCallback(
    (profile: VoiceProfile) => {
      const available = voiceProfiles.filter((p) => p.isAvailable);
      setUnsupportedModal({
        isOpen: true,
        profile,
        availableProfiles: available,
      });
    },
    [voiceProfiles]
  );

  const closeUnsupportedModal = useCallback(() => {
    setUnsupportedModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const changeProfile = useCallback(
    (profileId: ProfileId) => {
      const targetProfile = voiceProfiles.find((p) => p.id === profileId);
      if (targetProfile && !targetProfile.isAvailable) {
        openUnsupportedModal(targetProfile);
        return;
      }

      setSelectedProfileId(profileId);
      if (typeof window !== "undefined") {
        localStorage.setItem("selected_voice_profile", profileId);
      }
    },
    [voiceProfiles, openUnsupportedModal]
  );

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

  // Get current active SpeechSynthesisVoice object & metadata
  const getActiveVoiceInfo = useCallback(() => {
    const currentDef = PROFILE_DEFINITIONS.find((p) => p.id === selectedProfileId);
    if (!currentDef) return { voice: null, def: PROFILE_DEFINITIONS[0], isAvailable: false };
    const { voice, isAvailable } = resolveVoiceForProfile(currentDef, voicesRef.current);
    return { voice, def: currentDef, isAvailable };
  }, [selectedProfileId]);

  // Sequential speaker to prevent browser drop bugs
  const speak = useCallback(
    (items: Array<{ element: HTMLElement; text: string }>) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        alert("Tính năng đọc phát âm không được hỗ trợ trên trình duyệt này. Vui lòng thử Google Chrome, Microsoft Edge hoặc Safari.");
        return;
      }

      const { voice: activeVoice, def: currentDef, isAvailable } = getActiveVoiceInfo();

      if (!isAvailable || !activeVoice) {
        const currentProfile = voiceProfiles.find((p) => p.id === selectedProfileId) || {
          id: currentDef.id,
          label: currentDef.label,
          accent: currentDef.accent,
          gender: currentDef.gender,
          region: currentDef.region,
          flag: currentDef.flag,
          systemVoiceName: "Chưa hỗ trợ",
          isAvailable: false,
          sampleGreeting: currentDef.sampleGreeting,
        };
        openUnsupportedModal(currentProfile);
        return;
      }

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.cancel();
      clearHighlight();
      isCancelledRef.current = false;
      setPlaying(true);

      const isFemale = currentDef.gender === "female";
      const pitch = isFemale ? 1.05 : 0.95;

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
        utterance.pitch = pitch;
        utterance.lang = activeVoice.lang;
        utterance.voice = activeVoice;

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
    [speed, selectedProfileId, voiceProfiles, getActiveVoiceInfo, clearHighlight, openUnsupportedModal]
  );

  // Test voice sample
  const testVoice = useCallback(
    (profileId?: ProfileId) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const targetId = profileId || selectedProfileId;
      const currentDef = PROFILE_DEFINITIONS.find((p) => p.id === targetId) || PROFILE_DEFINITIONS[0];
      const { voice, isAvailable } = resolveVoiceForProfile(currentDef, voicesRef.current);

      if (!isAvailable || !voice) {
        const targetProfile = voiceProfiles.find((p) => p.id === targetId) || {
          id: currentDef.id,
          label: currentDef.label,
          accent: currentDef.accent,
          gender: currentDef.gender,
          region: currentDef.region,
          flag: currentDef.flag,
          systemVoiceName: "Chưa hỗ trợ",
          isAvailable: false,
          sampleGreeting: currentDef.sampleGreeting,
        };
        openUnsupportedModal(targetProfile);
        return;
      }

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const isFemale = currentDef.gender === "female";
      const utterance = new SpeechSynthesisUtterance(currentDef.sampleGreeting);
      utterance.rate = speed;
      utterance.pitch = isFemale ? 1.05 : 0.95;
      utterance.lang = voice.lang;
      utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
    },
    [selectedProfileId, speed, voiceProfiles, openUnsupportedModal]
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
    unsupportedModal,
    closeUnsupportedModal,
    openUnsupportedModal,
  };
}
