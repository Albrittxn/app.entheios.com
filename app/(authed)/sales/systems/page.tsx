// Sales → Systems tab. The operating manual: phone setup, contact loading,
// dialing rhythm, booking flow. Ported from the Cold Calling SOP v2 (Notion).

import Link from "next/link";

function Phase({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-l-2 border-zinc-900 pl-3 text-base font-semibold tracking-tight dark:border-zinc-100">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Card({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold tracking-tight">{heading}</div>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </div>
  );
}

function Callout({
  variant = "default",
  children,
}: {
  variant?: "default" | "warn";
  children: React.ReactNode;
}) {
  const v =
    variant === "warn"
      ? "border-amber-300/70 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30"
      : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/30";
  return (
    <div className={`rounded-md border px-4 py-3 text-sm leading-relaxed ${v}`}>
      {children}
    </div>
  );
}

export default function SalesSystems() {
  return (
    <section className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The operating manual — phone setup, contact loading, dialing rhythm, booking flow. Source: Cold Calling SOP v2.
        </p>
      </header>

      <Phase title="Position Overview">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          You're running outbound cold calls to real estate agents using the lead list we provide. The job is simple: dial, follow the script, book discovery calls onto the calendar via the booking link. Everything else — AI follow-up, nurturing, no-show recovery — is handled by the system.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="Your Tools">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Lead batches in the{" "}
                <Link href="/sales/leads" className="underline underline-offset-2">
                  Leads tab
                </Link>{" "}
                — each batch is ~100 leads, downloadable as CSV.
              </li>
              <li>
                The COMPASS script in the{" "}
                <Link href="/sales/script" className="underline underline-offset-2">
                  Script tab
                </Link>{" "}
                — opener, hook, booking, objection handling.
              </li>
              <li>
                Booking link —{" "}
                <a
                  href="https://calendar.entheios.com/quick"
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-2"
                >
                  calendar.entheios.com/quick
                </a>
                .
              </li>
              <li>
                Your private{" "}
                <Link href="/sales/notes" className="underline underline-offset-2">
                  Notes tab
                </Link>{" "}
                for callbacks, follow-ups, observations.
              </li>
            </ul>
          </Card>
          <Card heading="Daily Target">
            <p>
              500–800 dials/day. Roughly{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">1 booked call per 100–150 dials</span> is the expected rate once you're warm. Log every call outcome before moving to the next one.
            </p>
          </Card>
        </div>
      </Phase>

      <Phase title="Phone Number Setup">
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="Why Number Matters">
            <p>
              If you dial 500+ times a day from one number, carriers flag it as spam and pickup rate collapses. Rotating the outbound number within the day keeps every number under the ~100-dial-per-day threshold carriers use to flag spam.
            </p>
          </Card>
          <Card heading="Buying Numbers in GHL">
            <p>
              <em>Sub-Account Settings → Phone Numbers → Add Number.</em> Pick local area codes matching your territory — calling Phoenix? Buy a 602 or 480 number. $1–$2/month each.
            </p>
            <p>
              For 500–800 dials/day you need{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">5–8 numbers total</span>. Reuse the same set every day.
            </p>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="Rotation Rule">
            <Callout>
              <span className="font-semibold">Switch every 100 dials.</span> Each number handles up to 100/day safely.{" "}
              <em>Settings → Business Profile → Default Phone Number → next in rotation.</em> Work through all numbers, then restart the rotation tomorrow.
            </Callout>
          </Card>
          <Card heading="When to Replace a Number">
            <p>
              Numbers get reused indefinitely as long as the pickup rate holds. If a number starts showing a clear drop in pickup rate (after weeks of use), retire it and buy a $1 replacement. Don't keep burning a flagged number.
            </p>
          </Card>
        </div>
        <Card heading="Call Outcome Setup">
          <p>
            Set up dispositions so you can sort calls and track metrics.{" "}
            <em>Sub-Account Settings → Phone System → Voice → Custom Dispositions.</em> Configure these four:
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <Disposition dot="bg-zinc-400" name="No Answer" desc="Didn't pick up, rang out, or hit voicemail. Auto-enrolls in SMS follow-up." />
            <Disposition dot="bg-amber-500" name="Follow Up" desc="Picked up, soft objection or asked for a callback. Note the time in your notes." />
            <Disposition dot="bg-emerald-500" name="Requested Appointment" desc="Prospect agreed to book. Move to the booking flow and lock the slot live." />
            <Disposition dot="bg-rose-500" name="Not Interested / Wrong" desc="Hard no, DNC, wrong number, or disconnected. Removes them from the queue." />
          </div>
        </Card>
      </Phase>

      <Phase title="Loading Contacts">
        <Card heading="Batches">
          <p>
            Every batch in the{" "}
            <Link href="/sales/leads" className="underline underline-offset-2">
              Leads tab
            </Link>{" "}
            is ~100 leads. Each batch shows whether you've downloaded it and lets you mark it complete after dialing — that's the dialing checklist.
          </p>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="Pulling The Batch">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open the{" "}
                <Link href="/sales/leads" className="underline underline-offset-2">
                  Leads tab
                </Link>
                .
              </li>
              <li>
                Find the next undialed batch and click <em>Download CSV</em>. The file saves with the batch name (e.g.{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">2026-04-16_batch_12.csv</code>).
              </li>
              <li>
                The batch is auto-marked <em>Downloaded</em> for you.
              </li>
            </ol>
          </Card>
          <Card heading="Importing into GHL">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Go to <em>Contacts → Import</em> → upload the <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">.csv</code>.
              </li>
              <li>
                Columns map automatically — First Name, Last Name, Phone, Email, plus brokerage, city, etc. Just check the mapping.
              </li>
              <li>Skip duplicates if prompted.</li>
            </ol>
          </Card>
        </div>
        <Callout variant="warn">
          <span className="font-semibold">The critical step:</span> on the import screen, before confirming, find the{" "}
          <em>Add Tag</em> field and select <code className="rounded bg-amber-100 px-1 dark:bg-amber-950">cold calling</code>. This is the trigger — it auto-enrolls every imported contact into the Cold Calling Workflow, which drops them straight into <em>Manual Actions → Call</em>. If you forget the tag, nothing happens after upload.
        </Callout>
      </Phase>

      <Phase title="Making the Dials">
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="Opening the Queue">
            <p>
              Go to the <em>Conversations</em> tab in the left sidebar. At the top, click <em>Manual Actions</em>. You'll see your 100 contacts lined up. Click <em>Call</em> in the top right — the GHL dialer opens and connects through your current default outbound number.
            </p>
          </Card>
          <Card heading="Running the Call">
            <p>
              Use the COMPASS script. Stick to the opener, match the prospect archetype fast, run objection handling if they push back, go for the booking.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Time-Starved", "Scaling", "New", "Burned", "Team Escapee", "Big Producer"].map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-mono text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {a}
                </span>
              ))}
            </div>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="Pacing">
            <ul className="list-disc space-y-1 pl-5">
              <li>100 dials per phone number, then rotate.</li>
              <li>
                5–10 minute break every hour — <span className="font-medium text-zinc-900 dark:text-zinc-100">do not skip this</span>, your voice will die by hour 4 otherwise.
              </li>
              <li>Aim for 80–100 dials per hour in power mode.</li>
            </ul>
          </Card>
          <Card heading="Logging Every Call">
            <p>
              After each call, a pop-up appears to log the outcome. Pick one of the 4 dispositions before the next dial.{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Every dial gets a disposition.</span> Untagged calls break reporting and the follow-up workflows.
            </p>
          </Card>
        </div>
      </Phase>

      <Phase title="Booking Meetings">
        <Callout variant="warn">
          <span className="font-semibold">Do not send them the link and hang up.</span> They will flake. You book the appointment yourself while still on the phone.
        </Callout>
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="The Booking Flow">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open the booking link:{" "}
                <a
                  href="https://calendar.entheios.com/quick"
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-2"
                >
                  calendar.entheios.com/quick
                </a>
                .
              </li>
              <li>
                Ask: <em>"What day works better for you, [day] or [day]?"</em> Narrow to two options, then pick a time — within the next two days.
              </li>
              <li>Enter their name, email, phone, and website yourself — pull from GHL or the lead list.</li>
              <li>
                Hit <em>Book</em>.
              </li>
              <li>
                Read the confirmation back: <em>"You're booked for Thursday at 2pm Pacific. You'll get a text and email confirmation in a bit — any other questions I can answer?"</em>
              </li>
            </ol>
          </Card>
          <Card heading="After the Booking">
            <p>
              Log the post-call result as <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">meeting booked</code>, and move to the next dial.
            </p>
            <a
              href="https://calendar.entheios.com/quick"
              target="_blank"
              rel="noopener"
              className="mt-3 inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Open Booking Calendar →
            </a>
          </Card>
        </div>
      </Phase>

      <Phase title="After Calling">
        <div className="grid gap-4 md:grid-cols-2">
          <Card heading="Clean Up the Queue">
            <p>
              By end of day, every contact in today's batch should have an outcome tag. Anything still untagged means it didn't get dialed — decide whether to push it to tomorrow or mark it skipped.
            </p>
          </Card>
          <Card heading="Prep Tomorrow">
            <ul className="list-disc space-y-1 pl-5">
              <li>Swap the default outbound number one last time so tomorrow starts on a fresh rotation.</li>
              <li>
                Open the{" "}
                <Link href="/sales/leads" className="underline underline-offset-2">
                  Leads tab
                </Link>{" "}
                and identify tomorrow's batch — download it now so it's ready before you start dialing.
              </li>
              <li>
                Mark today's batch <em>Complete</em> so your checklist stays accurate.
              </li>
            </ul>
          </Card>
        </div>
      </Phase>
    </section>
  );
}

function Disposition({ dot, name, desc }: { dot: string; name: string; desc: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        {name}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>
    </div>
  );
}
