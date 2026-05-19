import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import {
  ANTI_FLASH_SCRIPT,
  COOKIE_KEY,
  ThemeProvider,
  type Theme,
} from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Every page in the app uses the same browser-tab title. Per-page
  // `metadata.title` declarations have been removed from the route pages
  // so this default applies everywhere.
  title: "Entheios",
  description: "Entheios internal hub",
};

function asTheme(v: string | undefined): Theme {
  return v === "light" || v === "dark" || v === "system" ? v : "dark";
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialTheme = asTheme(cookieStore.get(COOKIE_KEY)?.value);
  // "system" can't be resolved server-side without the user's media query —
  // default it to dark on the server, then the anti-flash script + the
  // ThemeProvider effect correct it before paint / on hydration.
  const initialDark = initialTheme === "light" ? false : true;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${initialDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        {/* Reconciles the dark class from cookie/localStorage/system before paint.
            Critical when the cookie says "system" or is missing entirely. */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col text-ink isolate">
        <ThemeProvider initialTheme={initialTheme}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
