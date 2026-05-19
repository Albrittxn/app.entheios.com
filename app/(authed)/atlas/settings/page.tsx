import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.email) redirect("/login");

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Theme controls live in the Settings menu in the top-right corner — they apply to all of Entheios.
        </p>
      </header>

      <SettingRow
        title="Signed in as"
        description="The email tied to this session. Sign out from the top-right to switch accounts."
      >
        <code className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
          {session.email}
        </code>
      </SettingRow>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <div className="sm:justify-self-end">{children}</div>
      </div>
    </div>
  );
}
