import { getEffectiveUser } from "@/lib/effective-user";
import { getUserRecord } from "@/lib/permissions";
import { PreferencesForm } from "@/components/closing/preferences-form";

export const dynamic = "force-dynamic";

export default async function ClosingSettings() {
  const ctx = await getEffectiveUser();

  const record = ctx?.effectiveEmail ? await getUserRecord(ctx.effectiveEmail) : null;
  const initialName = record?.name ?? record?.email.split("@")[0] ?? "";
  const initialProfilePictureUrl = record?.profilePictureUrl ?? "";
  const initialTimezone = record?.timezone ?? "";

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your personal closer preferences and timezone display.
        </p>
      </header>

      <div className="max-w-2xl">
        <PreferencesForm
          initialName={initialName}
          initialProfilePictureUrl={initialProfilePictureUrl}
          initialTimezone={initialTimezone}
        />
      </div>
    </section>
  );
}
