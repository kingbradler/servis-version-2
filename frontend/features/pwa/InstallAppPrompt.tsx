"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISS_KEY = "servis-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return ios && safari;
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIosSafari()) {
      setShowIos(true);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setInstallEvent(null);
    setShowIos(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  };

  if (!installEvent && !showIos) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-cr2 bg-surface/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-border">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={40}
          height={40}
          className="mt-0.5 h-10 w-10 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-extrabold text-text-primary">
            Installer SERVIS
          </p>
          {installEvent ? (
            <p className="mt-0.5 text-caption text-text-secondary">
              Ajoutez l&apos;application sur votre écran d&apos;accueil.
            </p>
          ) : (
            <p className="mt-0.5 text-caption text-text-secondary">
              Sur iPhone : touchez Partager{" "}
              <Share className="inline h-3.5 w-3.5 align-text-bottom" /> puis
              « Sur l&apos;écran d&apos;accueil ».
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {installEvent && (
            <Button size="sm" className="rounded-xl" onClick={() => void install()}>
              <Download className="h-4 w-4" />
              Installer
            </Button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary hover:text-text-primary"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
