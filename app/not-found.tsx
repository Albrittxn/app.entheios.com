import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          That page doesn't exist (or you don't have access to it).
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
