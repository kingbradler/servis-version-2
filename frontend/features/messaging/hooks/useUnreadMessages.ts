"use client";

import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getUnreadMessageCount } from "@/features/messaging/api/messaging.api";

const POLL_MS = 30_000;

export function useUnreadMessages() {
  const { isAuthenticated, user } = useCurrentUser();
  const [count, setCount] = useState(0);

  const canUseMessaging =
    isAuthenticated &&
    (user?.role === "CLIENT" || user?.role === "SELLER");

  const refresh = useCallback(async () => {
    if (!canUseMessaging) {
      setCount(0);
      return;
    }
    try {
      const n = await getUnreadMessageCount();
      setCount(n);
    } catch {
      /* ignore poll errors */
    }
  }, [canUseMessaging]);

  useEffect(() => {
    void refresh();
    if (!canUseMessaging) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    const onChanged = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("servis:messages-unread", onChanged);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("servis:messages-unread", onChanged);
    };
  }, [canUseMessaging, refresh]);

  return { count, refresh };
}
