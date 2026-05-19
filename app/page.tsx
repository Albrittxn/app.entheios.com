import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { userHubs } from "@/lib/hub-access";
import { HUBS, HUB_ORDER } from "@/lib/hubs";

// Root entry. Routes the user to their first accessible hub, or to /login.
export default async function RootPage() {
  const session = await getSession();
  if (!session?.email) redirect("/login");
  const hubs = await userHubs(session.email);
  if (!hubs.length) redirect("/login");
  // Pick the first hub in the canonical order that the user has access to.
  const first = HUB_ORDER.find((id) => hubs.includes(id))!;
  redirect(HUBS[first].defaultPath);
}
