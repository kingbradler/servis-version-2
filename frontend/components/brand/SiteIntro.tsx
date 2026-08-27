"use client";

import { useEffect, useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { cn } from "@/lib/utils";

const INTRO_KEY = "servis-intro-seen";

function shouldSkipIntro() {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return true;
  return sessionStorage.getItem(INTRO_KEY) === "1";
}

/**
 * Full-viewport brand intro on first visit of the session.
 * Respects prefers-reduced-motion and skips after first play.
 */
export function SiteIntro() {
  const [phase, setPhase] = useState<"off" | "play" | "exit">("off");

  useEffect(() => {
    if (shouldSkipIntro()) return;

    document.documentElement.classList.add("servis-intro-lock");

    const startId = window.setTimeout(() => setPhase("play"), 0);
    const exitId = window.setTimeout(() => setPhase("exit"), 1600);
    const doneId = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_KEY, "1");
      document.documentElement.classList.remove("servis-intro-lock");
      setPhase("off");
    }, 2200);

    return () => {
      window.clearTimeout(startId);
      window.clearTimeout(exitId);
      window.clearTimeout(doneId);
      document.documentElement.classList.remove("servis-intro-lock");
    };
  }, []);

  if (phase === "off") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-cr dark:bg-dk",
        phase === "exit" &&
          "pointer-events-none animate-[intro-fade-out_0.55s_ease_forwards]"
      )}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-1/3 h-64 w-[70%] -rotate-6 bg-[radial-gradient(ellipse_at_center,rgba(232,66,8,0.22),transparent_70%)] blur-2xl" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(120deg,transparent,rgba(14,14,14,0.04))] dark:bg-[linear-gradient(120deg,transparent,rgba(247,245,241,0.04))]" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <div className="animate-[intro-mark_1.1s_cubic-bezier(0.22,1,0.36,1)_both]">
          <ServisLogo
            variant="mark"
            href={null}
            priority
            markClassName="h-24 w-auto sm:h-28"
          />
        </div>
        <p className="animate-[intro-word_1s_0.25s_cubic-bezier(0.22,1,0.36,1)_both] text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
          SERV<span className="text-primary">IS</span>
        </p>
        <div className="flex gap-1.5 animate-[intro-lines_0.9s_0.45s_ease_both]">
          <span className="h-1 w-6 rounded-full bg-dk/80 dark:bg-cr/80" />
          <span className="h-1 w-10 rounded-full bg-dk/80 dark:bg-cr/80" />
          <span className="h-1 w-4 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
