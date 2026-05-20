"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BottomNav, type BottomNavKey } from "./BottomNav";

export function AppShell({
  greeting,
  subtitle,
  back,
  active,
  sidebar,
  children,
}: {
  greeting?: string;
  subtitle?: string;
  /** Show a back arrow (defaults to false). When `true`, uses router.back(); pass a href to navigate explicitly. */
  back?: boolean | string;
  active?: BottomNavKey;
  /** Optional right rail (shown on lg+). Below lg it appears under the main content. */
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const widthClass = sidebar
    ? "max-w-md sm:max-w-2xl lg:max-w-6xl"
    : "max-w-md sm:max-w-2xl";

  return (
    <div className={`mx-auto ${widthClass} px-4 pt-5 pb-28 sm:pb-24`}>
      <header className="flex items-center gap-3">
        {back ? (
          typeof back === "string" ? (
            <Link href={back} aria-label="Back" className="icon-pill">
              <ArrowLeft className="h-4 w-4 text-ink/70" />
            </Link>
          ) : (
            <button
              onClick={() => router.back()}
              aria-label="Back"
              className="icon-pill"
            >
              <ArrowLeft className="h-4 w-4 text-ink/70" />
            </button>
          )
        ) : (
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-300 to-rose-300 flex items-center justify-center text-white font-bold text-base shadow-soft shrink-0">
              IB
            </div>
          </Link>
        )}
      </header>

      {(greeting || subtitle) && (
        <div className="mt-5 sm:mt-7">
          {greeting && (
            <h1 className="text-[1.75rem] sm:text-4xl font-bold tracking-tight leading-tight">
              {greeting}
            </h1>
          )}
          {subtitle && <p className="mt-2 text-sm sm:text-base text-ink/60">{subtitle}</p>}
        </div>
      )}

      {sidebar ? (
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>{children}</div>
          <aside className="lg:sticky lg:top-6 self-start">{sidebar}</aside>
        </div>
      ) : (
        <div className="mt-6 sm:mt-8">{children}</div>
      )}

      <BottomNav active={active} />
    </div>
  );
}
