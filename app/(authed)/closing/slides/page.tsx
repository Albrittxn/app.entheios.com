// Closing → Slides. The full Entheios sales deck embedded inline so closers
// can flip through it on a screen-share, or pop it out into a new tab.

export default function ClosingSlides() {
  return (
    <section>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Slide deck</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Hosted at slides.entheios.com. Use the present button in the toolbar for full-screen.
          </p>
        </div>
        <a
          href="https://slides.entheios.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Open in new tab ↗
        </a>
      </header>
      <iframe
        title="Entheios slide deck"
        src="https://slides.entheios.com"
        className="h-[75vh] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      />
    </section>
  );
}
