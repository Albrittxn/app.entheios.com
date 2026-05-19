"use client";

import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "email" | "code" | "name";

const EASE = [0.22, 1, 0.36, 1] as const;
const stepTransition = { duration: 0.32, ease: EASE };

export function LoginFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't send code. Check your email and try again.");
        setPending(false);
        return;
      }
      setStep("code");
      setPending(false);
    } catch {
      setError("Network error. Try again in a moment.");
      setPending(false);
    }
  }

  async function submitCode(value: string) {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: value }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          j.error ?? "That code didn't match. Codes expire 10 minutes after they're sent.",
        );
        setCode("");
        setPending(false);
        return;
      }
      // Verify succeeded. If we don't have a name on file yet, ask for one
      // before sending the user to the dashboard.
      if (j.needsName) {
        setStep("name");
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again in a moment.");
      setPending(false);
    }
  }

  async function submitName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/set-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${first} ${last}` }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't save your name. Try again.");
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again in a moment.");
      setPending(false);
    }
  }

  // Auto-submit as soon as the 6th digit lands.
  function onCodeChange(next: string) {
    setCode(next);
    setError(null);
    if (next.length === 6) submitCode(next);
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setPending(false);
  }

  return (
    <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-cream/75 p-8 shadow-[0_30px_80px_-30px_rgba(10,10,10,0.35)] backdrop-blur">
      <header className="mb-7 flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo.png"
          alt="Entheios"
          width={64}
          height={64}
          priority
          className="h-12 w-auto select-none"
        />
        <div className="relative h-[68px] w-full">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={stepTransition}
              className="absolute inset-0 flex flex-col items-center gap-1.5"
            >
              {step === "email" && (
                <>
                  <div className="text-xl font-semibold tracking-tight text-ink">
                    Sign in to Entheios
                  </div>
                  <div className="text-sm text-mute">
                    Enter your email — we'll send a 6-digit code.
                  </div>
                </>
              )}
              {step === "code" && (
                <>
                  <div className="text-xl font-semibold tracking-tight text-ink">
                    Check your inbox
                  </div>
                  <div className="text-sm text-mute">
                    We sent a code to <span className="text-ink">{email}</span>.
                  </div>
                </>
              )}
              {step === "name" && (
                <>
                  <div className="text-xl font-semibold tracking-tight text-ink">
                    What's your name?
                  </div>
                  <div className="text-sm text-mute">
                    We'll show this in the top right and on the dashboard.
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </header>

      <div className="relative min-h-[150px]">
        <AnimatePresence initial={false} mode="wait">
          {step === "email" && (
            <motion.form
              key="email"
              onSubmit={submitEmail}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={stepTransition}
              className="flex flex-col"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-ink">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@entheios.com"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  className="border-line-strong bg-white/80 focus-visible:ring-ink"
                />
              </div>

              <Button
                type="submit"
                disabled={pending || !email.trim()}
                className="mt-4 w-full bg-gold text-ink hover:bg-gold-soft focus-visible:ring-gold"
              >
                {pending ? "Sending…" : "Send sign-in code"}
              </Button>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="mt-3 text-sm text-rose-700"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.form>
          )}

          {step === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={stepTransition}
              className="flex flex-col"
            >
              <CodeBoxes
                value={code}
                onChange={onCodeChange}
                disabled={pending}
                hasError={!!error}
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="mt-3 text-center text-sm text-rose-700"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-1 flex items-center justify-center gap-1 text-xs text-mute">
                {pending && <span>Signing in…</span>}
              </div>

              <button
                type="button"
                onClick={backToEmail}
                className="mt-2 text-center text-xs text-mute underline-offset-2 hover:underline"
              >
                Use a different email
              </button>
            </motion.div>
          )}

          {step === "name" && (
            <motion.form
              key="name"
              onSubmit={submitName}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={stepTransition}
              className="flex flex-col"
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-ink">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    required
                    autoFocus
                    maxLength={32}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={pending}
                    className="border-line-strong bg-white/80 focus-visible:ring-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-ink">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    required
                    maxLength={32}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={pending}
                    className="border-line-strong bg-white/80 focus-visible:ring-ink"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={pending || !firstName.trim() || !lastName.trim()}
                className="mt-4 w-full bg-gold text-ink hover:bg-gold-soft focus-visible:ring-gold"
              >
                {pending ? "Saving…" : "Continue"}
              </Button>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="mt-3 text-sm text-rose-700"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CodeBoxes({
  value,
  onChange,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  hasError: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = (value + "      ").slice(0, 6).split("");

  function setDigit(i: number, raw: string) {
    const sanitized = raw.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[i] = sanitized || " ";
    const joined = next.join("").trimEnd();
    onChange(joined);
    if (sanitized && i < 5) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[i].trim() && i > 0) {
        e.preventDefault();
        const next = digits.slice();
        next[i - 1] = " ";
        onChange(next.join("").trimEnd());
        refs.current[i - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          autoFocus={i === 0}
          value={digits[i].trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          initial={{ y: 8, scale: 0.96 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.3, delay: i * 0.045, ease: EASE }}
          className={cn(
            "h-12 w-10 rounded-lg border bg-white/85 text-center text-lg font-semibold tracking-tight text-ink shadow-sm transition-[border-color,box-shadow] duration-200 ease-out",
            "focus:outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40",
            "disabled:opacity-50",
            hasError
              ? "border-rose-400 focus-visible:border-rose-600 focus-visible:ring-rose-500/30"
              : "border-line-strong",
          )}
        />
      ))}
    </div>
  );
}
