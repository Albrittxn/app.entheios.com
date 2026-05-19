"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-rose-600">Error</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Something broke</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
