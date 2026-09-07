"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore — install still works via the manifest on some browsers */
    });
  }, []);

  return null;
}
