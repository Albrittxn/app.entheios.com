"use client";

// Site-wide toast / undo system.
//
// Any client component can call `useToast().show("Did X", { undo: () => ... })`
// after a destructive action. A toast appears in the bottom-right with an
// Undo button. Clicking Undo runs the callback and dismisses the toast;
// otherwise the toast auto-dismisses after `durationMs` (default 7s).
//
// Wrapped around the whole app in `app/layout.tsx`. If a component renders
// outside the provider for any reason, `useToast()` returns a no-op so
// nothing crashes.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";

const DEFAULT_DURATION_MS = 7_000;
const MAX_VISIBLE = 3;

export type ToastOpts = {
  undo?: () => void | Promise<void>;
  durationMs?: number;
};

type Toast = {
  id: string;
  message: string;
  undo?: () => void | Promise<void>;
  expiresAt: number;
};

type Ctx = {
  show: (message: string, opts?: ToastOpts) => string;
  dismiss: (id: string) => void;
};

const NOOP: Ctx = { show: () => "", dismiss: () => {} };

const ToastContext = createContext<Ctx>(NOOP);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, opts?: ToastOpts) => {
      const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const duration = opts?.durationMs ?? DEFAULT_DURATION_MS;
      const toast: Toast = {
        id,
        message,
        undo: opts?.undo,
        expiresAt: Date.now() + duration,
      };

      setToasts((prev) => {
        // If we'd exceed MAX_VISIBLE, drop the oldest.
        const next = [...prev, toast];
        if (next.length <= MAX_VISIBLE) return next;
        const dropped = next.slice(0, next.length - MAX_VISIBLE);
        for (const d of dropped) {
          const t = timersRef.current.get(d.id);
          if (t) {
            clearTimeout(t);
            timersRef.current.delete(d.id);
          }
        }
        return next.slice(-MAX_VISIBLE);
      });

      // Schedule auto-dismiss.
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  // Clean up every pending timer on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  async function handleUndo(toast: Toast) {
    dismiss(toast.id);
    try {
      await toast.undo?.();
    } catch (err) {
      // Surface failures via another toast — at least the user knows the
      // undo didn't take.
      const msg = err instanceof Error ? err.message : "Couldn't undo.";
      show(msg);
    }
  }

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex min-w-[260px] max-w-md items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              role="status"
            >
              <span className="flex-1 truncate">{t.message}</span>
              {t.undo && (
                <button
                  type="button"
                  onClick={() => handleUndo(t)}
                  className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
              >
                <span aria-hidden="true">×</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  return useContext(ToastContext);
}
