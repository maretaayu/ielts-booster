"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isOnboarded, ONBOARDED_KEY } from "@/lib/api";

const ALLOW_PREFIXES = ["/onboarding", "/auth"];

/**
 * Sends first-time visitors to /onboarding. Runs once on every route change.
 * If the user has completed onboarding, this is a no-op.
 */
export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ALLOW_PREFIXES.some((p) => pathname?.startsWith(p))) return;
    if (isOnboarded()) return;
    // Defer to next tick so the page can render its skeleton before redirect.
    const t = setTimeout(() => router.replace("/onboarding"), 0);
    return () => clearTimeout(t);
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
