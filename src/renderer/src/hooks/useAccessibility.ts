import { useCallback, useEffect, useState } from "react";
import type { AccessibilityStatus } from "@shared/types";

export function useAccessibility() {
  const [status, setStatus] = useState<AccessibilityStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async () => {
    const next = await window.clippy.getAccessibilityStatus();
    setStatus(next);
    return next;
  }, []);

  const requestAccess = useCallback(async () => {
    setRequesting(true);
    try {
      const next = await window.clippy.requestAccessibility();
      setStatus(next);
      return next;
    } finally {
      setRequesting(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = window.clippy.onAccessibilityRequired(() => {
      void refresh();
    });
    const interval = setInterval(() => {
      void refresh();
    }, 2000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const needsAccess = Boolean(status?.supported && !status.granted);

  return { status, needsAccess, requesting, refresh, requestAccess };
}
