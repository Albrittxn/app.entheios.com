import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { HubUsersPanel } from "@/components/hub-users-panel";

export default async function AtlasAdmin() {
  const session = await getSession();
  if (!session?.email) redirect("/login");
  if (!isAdminEmail(session.email)) redirect("/");

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Atlas Admin</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage who can sign in to Atlas.
        </p>
      </header>
      <HubUsersPanel hub="atlas" label="Atlas" />
    </section>
  );
}
