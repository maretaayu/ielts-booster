"use client";

// Thin wrapper around the browser's Web Speech APIs.
// SpeechRecognition: Chrome / Edge / Safari (with prefix). Firefox has no support.
// SpeechSynthesis: broad support across modern browsers.

type Listener<T> = (e: T) => void;

interface SRConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event & { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(i: number): SpeechRecognitionResult;
  [i: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(i: number): SpeechRecognitionAlternative;
  [i: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

function getSRConstructor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return getSRConstructor() !== null;
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface SpeakOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

/** Speak a string with browser TTS. Cancels any prior utterance. Returns a stopper. */
export function speak(text: string, opts: SpeakOptions = {}): () => void {
  if (!speechSynthesisSupported()) {
    opts.onEnd?.();
    return () => {};
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.voice?.lang ?? "en-US";
  if (opts.voice) u.voice = opts.voice;
  u.rate = opts.rate ?? 0.95;
  u.pitch = opts.pitch ?? 1;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return () => speechSynthesis.cancel();
}

// ====== ElevenLabs natural TTS ======

export interface ElevenLabsVoice {
  id: string;
  name: string;
  accent: string;
  gender: string;
}

export interface ElevenLabsConfig {
  configured: boolean;
  voices: ElevenLabsVoice[];
  defaultVoiceId: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let elevenConfigCache: Promise<ElevenLabsConfig> | null = null;
export function getElevenLabsConfig(): Promise<ElevenLabsConfig> {
  if (!elevenConfigCache) {
    elevenConfigCache = fetch(`${API_URL}/tts/voices`)
      .then((r) => (r.ok ? r.json() : { configured: false, voices: [], defaultVoiceId: null }))
      .catch(() => ({ configured: false, voices: [], defaultVoiceId: null }));
  }
  return elevenConfigCache;
}

// Cache fetched audio per (text, voiceId) so same question doesn't re-fetch.
const audioCache = new Map<string, Promise<string>>();
function cacheKey(text: string, voiceId: string): string {
  return `${voiceId}::${text}`;
}

async function fetchElevenLabsBlob(text: string, voiceId: string): Promise<string> {
  const key = cacheKey(text, voiceId);
  const existing = audioCache.get(key);
  if (existing) return existing;
  const p = (async () => {
    const res = await fetch(`${API_URL}/tts/speak`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  })();
  audioCache.set(key, p);
  p.catch(() => audioCache.delete(key));
  return p;
}

export interface NaturalSpeakOptions {
  voiceId?: string;
  onEnd?: () => void;
  /** If ElevenLabs fails, fall back to browser TTS with this voice. */
  fallbackVoice?: SpeechSynthesisVoice;
}

/**
 * Speak with ElevenLabs natural TTS. Falls back to browser speechSynthesis on
 * any error (incl. ELEVENLABS_API_KEY not configured). Returns a stopper.
 */
export function speakNatural(text: string, opts: NaturalSpeakOptions = {}): () => void {
  let cancelled = false;
  let stopper: () => void = () => {
    cancelled = true;
  };

  (async () => {
    try {
      const cfg = await getElevenLabsConfig();
      if (!cfg.configured) throw new Error("not_configured");
      const voiceId = opts.voiceId ?? cfg.defaultVoiceId ?? cfg.voices[0]?.id;
      if (!voiceId) throw new Error("no_voice");
      const url = await fetchElevenLabsBlob(text, voiceId);
      if (cancelled) return;
      const audio = new Audio(url);
      audio.onended = () => opts.onEnd?.();
      audio.onerror = () => opts.onEnd?.();
      stopper = () => {
        audio.pause();
        audio.currentTime = 0;
      };
      try {
        await audio.play();
      } catch {
        // autoplay policy: caller must have user-gesture-initiated this. Mark end.
        opts.onEnd?.();
      }
    } catch {
      if (cancelled) return;
      stopper = speak(text, { voice: opts.fallbackVoice, onEnd: opts.onEnd });
    }
  })();

  return () => stopper();
}

/** Pick a reasonable English voice; prefer a "natural" or "Google" one if present. */
export function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  if (!speechSynthesisSupported()) return undefined;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  return (
    voices.find((v) => v.lang.startsWith("en") && /natural|google|samantha/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

export interface RecognitionHandle {
  start(): void;
  stop(): void;
  abort(): void;
  onResult(cb: Listener<{ transcript: string; isFinal: boolean }>): void;
  onEnd(cb: Listener<void>): void;
  onError(cb: Listener<{ error: string; message?: string }>): void;
}

export function createRecognition(lang = "en-US"): RecognitionHandle | null {
  const Ctor = getSRConstructor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;

  let onResult: Listener<{ transcript: string; isFinal: boolean }> | null = null;
  let onEnd: Listener<void> | null = null;
  let onError: Listener<{ error: string; message?: string }> | null = null;

  rec.onresult = (e: SpeechRecognitionEvent) => {
    let finalText = "";
    let interimText = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!;
      const t = r[0]!.transcript;
      if (r.isFinal) finalText += t;
      else interimText += t;
    }
    if (finalText) onResult?.({ transcript: finalText, isFinal: true });
    if (interimText) onResult?.({ transcript: interimText, isFinal: false });
  };
  rec.onerror = (e) => onError?.({ error: e.error, message: e.message });
  rec.onend = () => onEnd?.();

  return {
    start: () => rec.start(),
    stop: () => rec.stop(),
    abort: () => rec.abort(),
    onResult: (cb) => (onResult = cb),
    onEnd: (cb) => (onEnd = cb),
    onError: (cb) => (onError = cb),
  };
}
