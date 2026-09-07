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
    const exitId = window.setTimeout(() => setPhase("exit"), 2100);
    const doneId = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_KEY, "1");
      document.documentElement.classList.remove("servis-intro-lock");
      setPhase("off");
    }, 2800);

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
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#F7F5F1]",
        phase === "exit" &&
          "pointer-events-none animate-[intro-wipe_0.7s_cubic-bezier(0.76,0,0.24,1)_forwards]"
      )}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 animate-[intro-flash_0.7s_ease-out_both] bg-primary" />
        <div className="absolute -left-1/3 top-1/4 h-[28rem] w-[80%] animate-[intro-glow_1.2s_ease-out_both] bg-[radial-gradient(ellipse_at_center,rgba(232,66,8,0.45),transparent_62%)] blur-3xl" />
        <span className="absolute left-[-20%] top-[42%] h-2 w-[55%] animate-[intro-streak_0.85s_0.15s_cubic-bezier(0.2,0.8,0.2,1)_both] rounded-full bg-dk" />
        <span className="absolute left-[-10%] top-[48%] h-1.5 w-[40%] animate-[intro-streak_0.8s_0.22s_cubic-bezier(0.2,0.8,0.2,1)_both] rounded-full bg-dk/80" />
        <span className="absolute left-[5%] top-[53%] h-1 w-[28%] animate-[intro-streak_0.75s_0.28s_cubic-bezier(0.2,0.8,0.2,1)_both] rounded-full bg-primary" />
      </div>

      <div className="relative flex flex-col items-center gap-5">
        <div className="animate-[intro-slam_0.85s_cubic-bezier(0.16,1,0.3,1)_both] drop-shadow-[0_18px_40px_rgba(232,66,8,0.28)]">
          <ServisLogo
            variant="mark"
            tone="on-light"
            href={null}
            priority
            markClassName="h-32 w-auto sm:h-40"
          />
        </div>
        <p className="animate-[intro-word_0.7s_0.35s_cubic-bezier(0.16,1,0.3,1)_both] font-display text-4xl font-extrabold tracking-[-0.07em] text-dk sm:text-5xl">
          SERV<span className="text-primary">IS</span>
        </p>
        <p className="animate-[intro-word_0.65s_0.5s_cubic-bezier(0.16,1,0.3,1)_both] text-[11px] font-extrabold uppercase tracking-[0.32em] text-dk/55">
          Marketplace · Maroc
        </p>
      </div>
    </div>
  );
}
