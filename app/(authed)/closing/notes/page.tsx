import { NotesEditor } from "@/components/notes-editor";

export default function ClosingNotes() {
  return (
    <section>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Per-closer scratchpad — auto-saves as you type. Visible only to you.
        </p>
      </header>
      <NotesEditor hub="closing" />
    </section>
  );
}
