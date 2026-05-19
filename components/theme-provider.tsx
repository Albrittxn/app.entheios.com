"use client";

// Theme provider — single source of truth = cookie (`entheios-theme`).
// localStorage is mirrored for the anti-flash script to read synchronously
// in <head>. The server reads the cookie in app/layout.tsx and stamps the
// correct `dark` class on <html> before any HTML is sent, so neither the
// initial load nor any soft navigation can flash the wrong theme.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
};

const ThemeContext = createContext<Ctx>({
  theme: "dark",
  setTheme: () => {},
  resolved: "dark",
});

export const COOKIE_KEY = "entheios-theme";
const STORAGE_KEY = "atlas-theme";

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function writeCookie(value: Theme) {
  // 1 year, root path, lax — internal app, no need for Secure/SameSite=None.
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function readCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]+)`));
  if (!m) return null;
  const v = decodeURIComponent(m[1]);
  if (v === "light" || v === "dark" || v === "system") return v;
  return null;
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    initialTheme === "system" ? "dark" : initialTheme,
  );

  // Hydrate from cookie/localStorage if anything drifted from the server-set
  // initial value (e.g. user changed theme in a different tab).
  useEffect(() => {
    const cookied = readCookie();
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? null;
    const next = cookied ?? stored ?? initialTheme;
    if (next !== theme) setThemeState(next);
    setResolved(resolveTheme(next));
    // backfill localStorage so the anti-flash script keeps working even if
    // only the cookie was set
    if (next !== stored) localStorage.setItem(STORAGE_KEY, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-resolve when system preference changes (only relevant for "system").
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(mql.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  // Belt-and-suspenders sync: any time `resolved` changes, mirror it onto
  // <html>. This protects against any path that might reset the class (e.g.
  // a layout re-render after navigation).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    writeCookie(t);
    const r = resolveTheme(t);
    setResolved(r);
    document.documentElement.classList.toggle("dark", r === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// Inline script injected into <head> as a safety net for the rare case where
// the server didn't know the user's preference (first-ever visit, or theme
// === "system"). Reads localStorage + system pref synchronously and toggles
// the class before paint.
export const ANTI_FLASH_SCRIPT = `
(function () {
  try {
    var m = document.cookie.match(/(?:^|; )${COOKIE_KEY}=([^;]+)/);
    var s = m ? decodeURIComponent(m[1]) : (localStorage.getItem("${STORAGE_KEY}") || "dark");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = s === "dark" || (s === "system" && prefersDark);
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch (e) {}
})();
`;
