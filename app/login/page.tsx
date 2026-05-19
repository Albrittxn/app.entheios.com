import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginFlow } from "./login-flow";
import { FlowyBackdrop } from "@/components/flowy-backdrop";
import { PageFade } from "@/components/page-fade";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.email) redirect("/");

  return (
    <>
      {/* Lock the login page to the cream brand palette regardless of the
          user's saved dark/light preference for the dashboard. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 bg-cream"
      />
      <FlowyBackdrop />
      <main className="flex flex-1 items-center justify-center px-4 py-16 text-ink">
        <PageFade>
          <LoginFlow />
        </PageFade>
      </main>
    </>
  );
}
