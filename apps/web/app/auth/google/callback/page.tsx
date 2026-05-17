"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * This page exists in case Google sends the user back to the WEB origin
 * by mistake. The real callback handler lives on the API at
 * /auth/google/callback. We just bounce the user back to /plan.
 */
export default function GoogleCallbackBouncer() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const planId = typeof window !== "undefined" ? localStorage.getItem("ielts.planId") : null;
    const target = planId ? `/plan/${planId}` : "/onboarding";
    const url = new URL(target, window.location.origin);
    const calendar = search.get("calendar");
    const msg = search.get("msg");
    if (calendar) url.searchParams.set("calendar", calendar);
    if (msg) url.searchParams.set("msg", msg);
    router.replace(url.pathname + url.search);
  }, [router, search]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center text-ink/60">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Finishing sign-in…
    </div>
  );
}
