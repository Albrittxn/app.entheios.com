"use client";

// localStorage-backed state hooks. Provides a `useState`-shaped API that
// persists to localStorage on every change and re-hydrates on mount. Used
// to share Leads / Groups / Scripts / Campaigns state across routes
// without a real database — when persistence moves to the server, only
// these hooks need to change.

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const KEY_PREFIX = "atlas/";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // Silently ignore — likely quota exceeded or private mode.
  }
}

/** Reads/writes the given key in localStorage. Returns the same shape as
 *  `useState`, but data persists across reloads and route changes. Other
 *  components mounting later (or on different routes) hydrate from the
 *  latest stored value automatically. */
export function useLocalState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  // SSR + first paint: render the initial value to avoid hydration mismatch.
  // The real value is read in an effect after mount.
  const [state, setState] = useState<T>(initial);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const stored = read<T | undefined>(key, undefined);
    if (stored !== undefined) setState(stored as T);
    hydratedRef.current = true;
  }, [key]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    write(key, state);
  }, [key, state]);

  return [state, setState];
}

// Cross-tab sync — listens for storage events so two open tabs stay in
// sync. Components opt in by subscribing to the same key.
export function useStorageSync(key: string, onChange: (value: unknown) => void) {
  useEffect(() => {
    function listener(e: StorageEvent) {
      if (e.key !== KEY_PREFIX + key) return;
      try {
        onChange(e.newValue ? JSON.parse(e.newValue) : null);
      } catch {
        // ignore malformed values
      }
    }
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [key, onChange]);
}
