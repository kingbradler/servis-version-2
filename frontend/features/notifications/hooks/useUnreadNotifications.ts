"use client";

import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getUnreadNotificationCount } from "@/features/notifications/services/notifications.service";

const POLL_MS = 45_000;

export function useUnreadNotifications() {
  const { isAuthenticated } = useCurrentUser();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0);
      return;
    }
    try {
      const n = await getUnreadNotificationCount();
      setCount(n);
    } catch {
      /* ignore poll errors */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
    if (!isAuthenticated) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refresh]);

  return { count, refresh };
}
