import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { HubUsersPanel } from "@/components/hub-users-panel";
import { InvestmentsEditor } from "@/components/investing/investments-editor";

export default async function InvestingAdmin() {
  const session = await getSession();
  if (!isAdminEmail(session?.email)) redirect("/investing/overview");

  return (
    <section className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Investing Admin</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage who has access to the Investing hub and control their invested
          amount + projected growth windows.
        </p>
      </header>

      <HubUsersPanel hub="investing" label="Investing" />

      <InvestmentsEditor />
    </section>
  );
}
