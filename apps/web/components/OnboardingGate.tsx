"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, isOnboarded, markOnboarded, ONBOARDED_KEY } from "@/lib/api";

const ALLOW_PREFIXES = ["/onboarding", "/auth"];

/**
 * Sends first-time visitors to /onboarding. Runs once on every route change.
 *
 * Two recovery paths handle "flag drifted from server state":
 *   - flag missing but server has a profile → mark onboarded + restore plan id
 *   - flag set but server returns 404 for the profile → clear the stale flag,
 *     then redirect to /onboarding
 */
export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ALLOW_PREFIXES.some((p) => pathname?.startsWith(p))) return;

    let cancelled = false;
    const userId = localStorage.getItem("ielts.userId");

    (async () => {
      if (isOnboarded()) {
        // Sanity-check: if the local flag claims onboarded but the server has no
        // matching profile (data wiped, mismatched userId, etc.), wipe the flag
        // and force a redo. Otherwise the homepage shows an empty "Student" shell.
        if (!userId) return;
        try {
          await api.getProfile(userId);
          return; // genuinely onboarded
        } catch {
          if (cancelled) return;
          localStorage.removeItem(ONBOARDED_KEY);
          localStorage.removeItem("ielts.planId");
          router.replace("/onboarding");
          return;
        }
      }

      // Not flagged onboarded — try to recover from server if userId is still around.
      if (userId) {
        try {
          await api.getProfile(userId);
          const plans = await api.listStudyPlans(userId).catch(() => ({ plans: [] }));
          const planId = plans.plans?.[0]?.id ?? "";
          if (cancelled) return;
          markOnboarded(planId);
          router.refresh();
          return;
        } catch {
          // No server-side profile → fall through to redirect.
        }
      }
      if (cancelled) return;
      router.replace("/onboarding");
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  // Cross-tab sync: if user finishes onboarding in another tab, react.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === ONBOARDED_KEY && e.newValue === "1") router.refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  return null;
}
