import { NotesEditor } from "@/components/notes-editor";

export default function SalesNotes() {
  return (
    <section>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Private scratchpad — auto-saves as you type. Visible only to you.
        </p>
      </header>
      <NotesEditor hub="sales" />
    </section>
  );
}
