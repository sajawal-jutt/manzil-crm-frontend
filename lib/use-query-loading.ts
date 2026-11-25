"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Loading state for data fetched for `key` (the tab, filters, page and sort, serialised). It turns on
 * the moment the key changes, so old rows never sit under new controls, but stays off while the same
 * key reloads in the background (after a star or an edit), so the list doesn't flash.
 */
export function useQueryLoading(key: string) {
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const latestKey = useRef(key);
  // A layout effect runs before the page's fetch effect, so a response is checked against the newest key.
  useLayoutEffect(() => {
    latestKey.current = key;
  }, [key]);

  /** False for a response to a query the user has already moved on from; drop it. */
  const isCurrent = useCallback((forKey: string) => forKey === latestKey.current, []);
  const markLoaded = useCallback((forKey: string) => {
    if (forKey === latestKey.current) setLoadedKey(forKey);
  }, []);

  return { isLoading: loadedKey !== key, isCurrent, markLoaded };
}
