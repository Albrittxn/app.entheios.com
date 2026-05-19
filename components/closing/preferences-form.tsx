"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  { value: "", label: "Browser Default (Local Time)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];

type Props = {
  initialName: string;
  initialProfilePictureUrl: string;
  initialTimezone: string;
};

export function PreferencesForm({
  initialName,
  initialProfilePictureUrl,
  initialTimezone,
}: Props) {
  const router = useRouter();
  const { show } = useToast();

  const [name, setName] = useState(initialName);
  const [profilePictureUrl, setProfilePictureUrl] = useState(initialProfilePictureUrl);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== initialName ||
    profilePictureUrl !== initialProfilePictureUrl ||
    timezone !== initialTimezone;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, profilePictureUrl, timezone }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      show("Preferences saved!");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      show("Please upload an image file.");
      return;
    }

    try {
      const dataUrl = await compressAndResizeImage(file);
      setProfilePictureUrl(dataUrl);
      show("Photo loaded and optimized.");
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to process image.");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <header className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Closer Preferences
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Personalize your avatar and timezone display.
        </p>
      </header>

      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Avatar Preview */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Avatar Preview
            </label>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
              {profilePictureUrl.trim() ? (
                <img
                  src={profilePictureUrl}
                  alt={name || "Avatar"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-xl font-bold text-zinc-400 dark:text-zinc-600">
                  {(name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-col gap-1.5 w-full items-center">
              <label
                htmlFor="avatar-upload"
                className={cn(
                  "inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors",
                )}
              >
                Upload Photo
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              {profilePictureUrl && (
                <button
                  type="button"
                  onClick={() => setProfilePictureUrl("")}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Profile Picture URL (Optional)
              </label>
              <input
                type="url"
                value={profilePictureUrl.startsWith("data:") ? "" : profilePictureUrl}
                onChange={(e) => setProfilePictureUrl(e.target.value)}
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                placeholder={profilePictureUrl.startsWith("data:") ? "Image uploaded locally" : "https://example.com/avatar.jpg"}
              />
              {profilePictureUrl.startsWith("data:") && (
                <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Custom image uploaded and stored successfully.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Custom Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
          {dirty && !saving && (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-500">Unsaved changes</span>
          )}
          <button
            type="submit"
            disabled={!dirty || saving || !name.trim()}
            className={cn(
              "inline-flex h-9 items-center rounded-md px-4 text-xs font-semibold transition-colors",
              "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
              "disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600",
            )}
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

function compressAndResizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 128;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string); // fallback
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressed);
      };
      img.onerror = () => {
        reject(new Error("Failed to load image for resizing."));
      };
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
  });
}
