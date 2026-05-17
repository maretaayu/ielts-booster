"use client";

import { useMemo, useState } from "react";
import { DefinePopover } from "./DefinePopover";

const WORD_RE = /([A-Za-z][A-Za-z'-]+)|([^A-Za-z'-]+)/g;

interface Token {
  text: string;
  word: boolean;
}

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(text)) !== null) {
    if (m[1]) out.push({ text: m[1], word: true });
    else if (m[2]) out.push({ text: m[2], word: false });
  }
  return out;
}

/**
 * Renders a single paragraph where every word is clickable. Clicking
 * pops a DefinePopover anchored to the click position, with the sentence
 * the word lives in as context.
 */
export function TappableParagraph({
  text,
  passageId,
}: {
  text: string;
  passageId?: string;
}) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const [active, setActive] = useState<{
    word: string;
    context: string;
    anchor: { top: number; left: number };
  } | null>(null);

  function sentenceOf(idx: number): string {
    // Find the surrounding sentence by walking backward/forward until . ! ? or boundary.
    let start = 0;
    let end = tokens.length;
    for (let i = idx - 1; i >= 0; i--) {
      const t = tokens[i]!;
      if (!t.word && /[.!?]/.test(t.text)) {
        start = i + 1;
        break;
      }
    }
    for (let i = idx + 1; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (!t.word && /[.!?]/.test(t.text)) {
        end = i + 1;
        break;
      }
    }
    return tokens
      .slice(start, end)
      .map((t) => t.text)
      .join("")
      .trim();
  }

  return (
    <>
      <p className="text-[17px] leading-[1.85] text-ink/85">
        {tokens.map((t, i) =>
          t.word ? (
            <span
              key={i}
              onClick={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setActive({
                  word: t.text,
                  context: sentenceOf(i),
                  anchor: { top: rect.bottom, left: rect.left },
                });
              }}
              className="cursor-pointer rounded transition hover:bg-violet-100/70 hover:text-violet-900 px-0.5"
            >
              {t.text}
            </span>
          ) : (
            <span key={i}>{t.text}</span>
          ),
        )}
      </p>
      {active && (
        <DefinePopover
          word={active.word}
          context={active.context}
          passageId={passageId}
          anchor={active.anchor}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
