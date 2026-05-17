/**
 * Wrap a Gemini call with:
 *  - Hard timeout (default 45s) so we never silently hang waiting for the model.
 *  - Single retry on 429 (rate-limit) or 503 (overloaded), honouring RetryInfo when present.
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts: { maxWaitMs?: number; timeoutMs?: number } = {},
): Promise<T> {
  const maxWaitMs = opts.maxWaitMs ?? 12_000;
  const timeoutMs = opts.timeoutMs ?? 90_000;

  const withTimeout = (p: Promise<T>): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Gemini call timed out after ${Math.round(timeoutMs / 1000)}s`),
            ),
          timeoutMs,
        ),
      ),
    ]);

  try {
    return await withTimeout(fn());
  } catch (err) {
    const msg = (err as Error).message ?? "";
    const m = msg.match(/\b(429|503)\b/);
    if (!m) throw err;
    const retryMatch = msg.match(/"retryDelay":\s*"(\d+)s"/);
    const waitMs = retryMatch ? Math.min(Number(retryMatch[1]) * 1000, maxWaitMs) : 2000;
    await new Promise((r) => setTimeout(r, waitMs));
    return withTimeout(fn());
  }
}
