"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Compass,
  Home as HomeIcon,
  PenLine,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavKey = "home" | "learn" | "practice" | "plan" | "history" | "profile";

const ITEMS: Array<{
  key: BottomNavKey;
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}> = [
  {
    key: "home",
    href: "/",
    label: "Home",
    icon: <HomeIcon className="h-5 w-5" />,
    match: (p) => p === "/",
  },
  {
    key: "learn",
    href: "/getting-started",
    label: "Learn",
    icon: <Compass className="h-5 w-5" />,
    match: (p) => p.startsWith("/getting-started"),
  },
  {
    key: "practice",
    href: "/write",
    label: "Practice",
    icon: <PenLine className="h-5 w-5" />,
    match: (p) =>
      p.startsWith("/write") ||
      p.startsWith("/read") ||
      p.startsWith("/speak") ||
      p.startsWith("/vocab") ||
      p.startsWith("/review") ||
      p.startsWith("/mock"),
  },
  {
    key: "plan",
    href: "/plan",
    label: "Plan",
    icon: <CalendarDays className="h-5 w-5" />,
    match: (p) => p.startsWith("/plan"),
  },
  {
    key: "history",
    href: "/dashboard",
    label: "History",
    icon: <Clock className="h-5 w-5" />,
    match: (p) => p.startsWith("/dashboard") || p.startsWith("/result") || p.startsWith("/history"),
  },
  {
    key: "profile",
    href: "/profile",
    label: "Profile",
    icon: <UserIcon className="h-5 w-5" />,
    match: (p) => p.startsWith("/profile"),
  },
];

export function BottomNav({ active }: { active?: BottomNavKey }) {
  const pathname = usePathname() ?? "/";
  const computed = ITEMS.find((i) => i.match(pathname))?.key;
  const current = active ?? computed;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-sm sm:max-w-md mb-4 bg-ink rounded-full px-2 py-2 flex items-center justify-around shadow-pop">
        {ITEMS.map((it) => {
          const isActive = it.key === current;
          return (
            <Link
              key={it.key}
              href={it.href}
              aria-label={it.label}
              aria-current={isActive ? "page" : undefined}
              className="flex items-center justify-center"
            >
              <span
                className={cn(
                  "h-11 w-11 rounded-full flex items-center justify-center transition-all",
                  isActive ? "bg-violet-300 text-ink scale-105" : "text-white/70 hover:text-white",
                )}
              >
                {it.icon}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
