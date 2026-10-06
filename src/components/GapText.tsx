"use client";
import { Fragment, useState } from "react";

// Parses [[opt1|opt2|opt3]] into cycling gap pills and {{collocation}} into yellow marks.
// Returns React nodes and the plain text for TTS (with current selections).

interface ParsedSegment {
  type: "text" | "gap" | "collocation";
  raw: string;
  options?: string[]; // for "gap"
}

function parseSegments(raw: string): ParsedSegment[] {
  const tokens = raw.split(/(\[\[.+?\]\]|\{\{.+?\}\})/g);
  return tokens.map((tok) => {
    if (tok.startsWith("[[") && tok.endsWith("]]")) {
      const inner = tok.slice(2, -2);
      const options = inner.split("|").map((o) => o.replace(/\{\{|\}\}/g, ""));
      return { type: "gap", raw: tok, options };
    }
    if (tok.startsWith("{{") && tok.endsWith("}}")) {
      return { type: "collocation", raw: tok.slice(2, -2) };
    }
    return { type: "text", raw: tok };
  });
}

interface GapTextProps {
  text: string;
  presetIndex?: number;
  /** called whenever a gap choice changes so parent can rebuild TTS text */
  onChoiceChange?: (plainText: string) => void;
  /** called when user manually clicks a pill */
  onUserCycle?: () => void;
}

export function GapText({ text, presetIndex, onChoiceChange, onUserCycle }: GapTextProps) {
  const segments = parseSegments(text);
  const gapSegments = segments.filter((s) => s.type === "gap");
  const gapCount = gapSegments.length;

  const [userIndices, setUserIndices] = useState<number[] | null>(null);
  const [prevPreset, setPrevPreset] = useState<number | undefined>(presetIndex);

  // Sync state during render when presetIndex prop changes (Official React Pattern)
  if (prevPreset !== presetIndex) {
    setPrevPreset(presetIndex);
    setUserIndices(null);
  }

  const effectiveIndices =
    userIndices !== null
      ? userIndices
      : typeof presetIndex === "number"
      ? gapSegments.map((g) => Math.min(presetIndex, (g.options?.length || 1) - 1))
      : Array(gapCount).fill(0);

  const buildPlain = (idxArr: number[]) => {
    let gapIdx = 0;
    return segments
      .map((seg) => {
        if (seg.type === "gap") return seg.options![idxArr[gapIdx++]];
        if (seg.type === "collocation") return seg.raw;
        return seg.raw;
      })
      .join("");
  };

  const cycleGap = (gapIdx: number) => {
    const next = [...effectiveIndices];
    const maxLen = gapSegments[gapIdx]?.options?.length || 1;
    next[gapIdx] = (next[gapIdx] + 1) % maxLen;
    setUserIndices(next);
    onChoiceChange?.(buildPlain(next));
    onUserCycle?.();
  };

  let gapIdx = 0;
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <Fragment key={i}>{seg.raw}</Fragment>;
        }
        if (seg.type === "collocation") {
          return (
            <mark key={i} className="col">
              {seg.raw}
            </mark>
          );
        }
        // gap pill
        const myIdx = gapIdx++;
        const currentChoiceIdx = effectiveIndices[myIdx] ?? 0;
        const chosen = seg.options![currentChoiceIdx] || seg.options![0] || "";

        // chosen text may itself contain {{...}} collocations
        const chosenParsed = chosen.split(/(\{\{.+?\}\})/g).map((part, pi) => {
          if (part.startsWith("{{") && part.endsWith("}}")) {
            return (
              <mark key={pi} className="col">
                {part.slice(2, -2)}
              </mark>
            );
          }
          return <Fragment key={pi}>{part}</Fragment>;
        });

        return (
          <button
            key={i}
            className="gp"
            type="button"
            aria-label={`Cycle option (current: ${chosen.replace(/\{\{|\}\}/g, "")})`}
            onClick={() => cycleGap(myIdx)}
          >
            {chosenParsed}
          </button>
        );
      })}
    </>
  );
}

/** Returns the current plain-text rendering of a template string with initial gap choices. */
export function getPlainText(text: string, indices?: number[]): string {
  const segments = parseSegments(text);
  let gapIdx = 0;
  return segments
    .map((seg) => {
      if (seg.type === "gap") {
        const i = indices ? (indices[gapIdx] ?? 0) : 0;
        gapIdx++;
        return (seg.options![i] || "").replace(/\{\{|\}\}/g, "");
      }
      if (seg.type === "collocation") return seg.raw;
      return seg.raw;
    })
    .join("");
}