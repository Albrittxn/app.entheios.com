// Atlas mark — Ryan's three-bar logo. We ship both the black and white
// variants and let CSS show the right one based on whether the `dark`
// class is set on <html>. The anti-flash script in app/layout.tsx applies
// the correct class before first paint, so no flicker on load.

import Image from "next/image";
import { cn } from "@/lib/utils";

export function AtlasLogo({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/atlas-mark-black.png"
        alt="Atlas"
        width={1500}
        height={1500}
        priority
        className={cn("h-5 w-auto select-none dark:hidden", className)}
      />
      <Image
        src="/atlas-mark-white.png"
        alt="Atlas"
        width={1500}
        height={1500}
        priority
        className={cn("hidden h-5 w-auto select-none dark:block", className)}
      />
    </>
  );
}
