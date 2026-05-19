// Hollow-circle spinner.
// Color follows light/dark mode: black ring in light, white ring in dark.

export function HubLoading() {
  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-24"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="h-16 w-16 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent" />
    </div>
  );
}
