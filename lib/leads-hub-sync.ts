"use client";

import { useEffect, useRef } from "react";

const CHANNEL_NAME = "leads-hub-sync";
const STORAGE_KEY = "leads-hub:last-updated";

export function broadcastLeadsHubUpdate(): void {
  if (typeof window === "undefined") return;

  const stamp = String(Date.now());
  try {
    window.localStorage.setItem(STORAGE_KEY, stamp);
  } catch {
    // ignore storage failures
  }

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(stamp);
    channel.close();
  }
}

export function useLeadsHubSync(onUpdate: () => void): void {
  const handlerRef = useRef(onUpdate);
  handlerRef.current = onUpdate;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handle = () => handlerRef.current();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) handle();
    };

    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = handle;
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      if (channel) channel.close();
    };
  }, []);
}
