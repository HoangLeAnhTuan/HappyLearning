"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: { length: number; [i: number]: { [j: number]: { transcript: string } } };
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

export function useSpeechRecognition(collocations: string[]) {
  const [heardSet, setHeardSet] = useState<Set<string>>(() => new Set());
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const collocNormed = useRef<{ raw: string; normed: string }[]>([]);
  const activeRef = useRef(false); // avoids stale closure in onend

  useEffect(() => {
    collocNormed.current = collocations.map((c) => ({ raw: c, normed: normalize(c) }));
  }, [collocations]);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. For auto-detection, please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: SpeechRecognitionResultEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const normedTranscript = normalize(transcript);
      const matched: string[] = [];
      for (const { raw, normed } of collocNormed.current) {
        if (normedTranscript.includes(normed)) matched.push(raw);
      }
      if (matched.length > 0) {
        setHeardSet((prev) => {
          const next = new Set(prev);
          matched.forEach((m) => next.add(m.toLowerCase().trim()));
          return next;
        });
      }
    };

    rec.onend = () => {
      if (recognitionRef.current === rec && activeRef.current) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };

    rec.onerror = () => { /* silently ignore */ };

    recognitionRef.current = rec;
    activeRef.current = true;
    try { rec.start(); } catch { /* ignore if already started */ }
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback((colItem: string) => {
    const key = colItem.toLowerCase().trim();
    setHeardSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const reset = useCallback(() => { setHeardSet(new Set()); }, []);

  useEffect(() => () => stop(), [stop]);

  return { heardSet, isListening, start, stop, toggle, reset };
}
