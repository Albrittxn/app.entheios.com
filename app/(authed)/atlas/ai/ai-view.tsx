"use client";

import { useLocalState } from "@/lib/local-store";
import { cn } from "@/lib/utils";

// Control surface for the self-adapting outreach engine — how ATLAS writes,
// tests, and optimizes SMS templates against live reply data. Settings
// persist locally; wire them to the real engine config when it exists.

type EngineStatus = "active" | "paused";
type Objective = "reply_rate" | "booking_rate";
type Exploration = "conservative" | "balanced" | "aggressive";

type AiSettings = {
  status: EngineStatus;
  objective: Objective;
  exploration: Exploration;
  autoGenerate: boolean;
  autoPause: boolean;
  model: string;
};

// Clean slate default — engine paused until the operator turns it on.
const DEFAULTS: AiSettings = {
  status: "paused",
  objective: "booking_rate",
  exploration: "balanced",
  autoGenerate: true,
  autoPause: true,
  model: "claude-opus-4-7",
};

const OBJECTIVES: { value: Objective; label: string }[] = [
  { value: "reply_rate", label: "Reply rate" },
  { value: "booking_rate", label: "Booking rate" },
];

const EXPLORATION: { value: Exploration; label: string }[] = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
];

const MODELS: { value: string; label: string }[] = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

export function AiView() {
  const [settings, setSettings] = useLocalState<AiSettings>(
    "atlas-ai-v1",
    DEFAULTS,
  );

  function patch(next: Partial<AiSettings>) {
    setSettings((prev) => ({ ...prev, ...next }));
  }

  const active = settings.status === "active";

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">AI</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage the self-adapting outreach engine — how ATLAS writes, tests,
          and optimizes SMS templates against live reply data.
        </p>
      </header>

      {/* Engine status */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  active ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600",
                )}
              />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Engine {active ? "active" : "paused"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {active
                ? "ATLAS is generating template variations and reallocating sends toward winners."
                : "The engine is idle. Turn it on to start generating and optimizing templates."}
            </p>
          </div>
          <div className="sm:justify-self-end">
            <Segmented
              ariaLabel="Engine status"
              value={settings.status}
              onChange={(v) => patch({ status: v as EngineStatus })}
              options={[
                { value: "paused", label: "Paused" },
                { value: "active", label: "Active" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <SettingCard
          title="Optimization objective"
          description="The metric the engine maximizes when scoring and ranking templates."
        >
          <Segmented
            ariaLabel="Optimization objective"
            value={settings.objective}
            onChange={(v) => patch({ objective: v as Objective })}
            options={OBJECTIVES}
          />
        </SettingCard>

        <SettingCard
          title="Exploration"
          description="How aggressively the engine tests new wording versus exploiting proven winners."
        >
          <Segmented
            ariaLabel="Exploration"
            value={settings.exploration}
            onChange={(v) => patch({ exploration: v as Exploration })}
            options={EXPLORATION}
          />
        </SettingCard>

        <SettingCard
          title="Auto-generate variations"
          description="Let the engine draft new spintax templates within the 160-character single-segment limit."
        >
          <Toggle
            label="Auto-generate variations"
            checked={settings.autoGenerate}
            onChange={(v) => patch({ autoGenerate: v })}
          />
        </SettingCard>

        <SettingCard
          title="Auto-pause underperformers"
          description="Automatically retire templates whose reply rate falls below the rolling cohort average."
        >
          <Toggle
            label="Auto-pause underperformers"
            checked={settings.autoPause}
            onChange={(v) => patch({ autoPause: v })}
          />
        </SettingCard>

        <SettingCard
          title="Model"
          description="The model that powers template generation and reply-data analysis."
        >
          <Segmented
            ariaLabel="Model"
            value={settings.model}
            onChange={(v) => patch({ model: v })}
            options={MODELS}
          />
        </SettingCard>
      </div>
    </section>
  );
}

function SettingCard({
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

function Segmented({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded px-3 py-1.5 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
              selected
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
        checked
          ? "bg-zinc-900 dark:bg-zinc-100"
          : "bg-zinc-200 dark:bg-zinc-800",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-950",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
