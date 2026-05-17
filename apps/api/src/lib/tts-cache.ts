/**
 * Tiny in-memory LRU cache for TTS audio buffers.
 * Same (text, voiceId) → free replay; cap memory at MAX_ENTRIES.
 */
const MAX_ENTRIES = 200;
const cache = new Map<string, Buffer>();

export function ttsGet(key: string): Buffer | undefined {
  const v = cache.get(key);
  if (!v) return undefined;
  // Re-insert to mark recently-used.
  cache.delete(key);
  cache.set(key, v);
  return v;
}

export function ttsSet(key: string, value: Buffer): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
}

export function ttsSize(): number {
  return cache.size;
}
