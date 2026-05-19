import { readFile } from "node:fs/promises";
import path from "node:path";
import { ProseMarkdown } from "@/components/prose-markdown";
import { getEffectiveUser } from "@/lib/effective-user";
import { getUserRecord } from "@/lib/permissions";
import { PreferencesForm } from "@/components/closing/preferences-form";

export const dynamic = "force-dynamic";

export default async function ClosingSettings() {
  const [ctx, source] = await Promise.all([
    getEffectiveUser(),
    readFile(path.join(process.cwd(), "content", "set-up.md"), "utf8"),
  ]);

  const record = ctx?.effectiveEmail ? await getUserRecord(ctx.effectiveEmail) : null;
  const initialName = record?.name ?? record?.email.split("@")[0] ?? "";
  const initialProfilePictureUrl = record?.profilePictureUrl ?? "";
  const initialTimezone = record?.timezone ?? "";

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Personal Preferences and Closer Setup Checklist.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Side: Preferences Form */}
        <div className="lg:col-span-1">
          <PreferencesForm
            initialName={initialName}
            initialProfilePictureUrl={initialProfilePictureUrl}
            initialTimezone={initialTimezone}
          />
        </div>

        {/* Right Side: Setup Checklist */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/20">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Setup Checklist & Payment Contract
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <ProseMarkdown source={source} />
          </div>
        </div>
      </div>
    </section>
  );
}
