// Sales → Script tab. The COMPASS framework + objection handling, ported
// verbatim from the Cold Calling SOP v2 (Notion). Static content for now.

type ScriptStep = {
  title: string;
  line: string;
  note: string;
};

const STEPS: ScriptStep[] = [
  {
    title: "1. The Opener",
    line: "Hi [first name]? This is [your name]. I'll be honest, this is a cold call, but we only call Compass agents and your name came up. Do you have 30 seconds?",
    note: "Honesty is the pattern-break. \"We only call Compass agents\" implies selectivity from the first sentence. If no, thank them and hang up in under 5 seconds. Never recover a dead opener. If yes, go straight into the pitch.",
  },
  {
    title: "2. The Hook",
    line: "Here's what we do. We book listing appointments onto Compass agents' calendars. Not just leads — actual meetings with sellers confirmed to be listing in the next 90 days. We run the ads, and we have an AI sales team that qualifies and books every lead inside 60 seconds. You just show up and close. Would you be open to a quick 15 minutes to see what this could look like in your area?",
    note: "\"AI sales team\" lands harder than \"AI-powered\" because it makes the stack feel like real personnel, not software. If yes, lock the slot. If hedging, ask once more softly. If no, go to Objections.",
  },
  {
    title: "3. The Booking",
    line: "Perfect. I have tomorrow pretty open. What time works best for you?",
    note: "The pitch already sold the 15 minutes — booking just locks the slot. Open the booking link while still on the call. Enter their name, email, and phone yourself, confirm email spelling out loud, hit book.",
  },
];

const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: 'If they say: "just send me an email" / "send me info"',
    a: "I could, but honestly email rarely leads anywhere and wastes both our time. 15 minutes will tell us what email can't. [Day] at [time] or [day] at [time]?",
  },
  {
    q: 'If they ask: "what does it cost?"',
    a: "It depends on your volume. We are not the cheapest and don't try to be. Clients we work with usually close one of the first three listings we deliver, so it pays back in the first 30 days. The 15 minutes gets you an actual number. [Day] at [time] or [day] at [time]?",
  },
  {
    q: 'If they say: "I\'m too busy right now"',
    a: "That is exactly why we built this. The agents we work with are the ones too busy to build this themselves. We are only onboarding a couple per market and your area is still open. Would you rather schedule 15 minutes now, or have me circle back in a few weeks?",
  },
  {
    q: 'If they say: "I already have leads, a team, or a CRM"',
    a: "Good — that tells me you are serious about growth. Most Compass agents we work with already had Follow Up Boss or kvCORE. We are top of funnel, not a replacement. The 15 minutes will show you where we would fit in. [Day] at [time] or [day] at [time]?",
  },
  {
    q: 'If they say: "how did you get my number?"',
    a: "I found your contact through the Compass database, and you seemed like a good fit to reach out to for the people we get results for.",
  },
  {
    q: 'If they say: "not interested"',
    a: "No worries — before I let you go, if 5 extra listing appointments a month sounds useful down the line, would it be alright if I check back in 90 days?",
  },
];

export default function SalesScript() {
  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Script</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Bold</span> = exact words.{" "}
          <em>Italics = instructions, never said out loud.</em> Tonality: peer to peer. Simple and direct. No slang, no hype, no filler.
        </p>
      </header>

      {/* COMPASS — 3 columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.title}
            className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {s.title}
            </div>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
              {s.line}
            </p>
            <p className="mt-4 border-t border-zinc-100 pt-3 text-xs italic leading-relaxed text-zinc-500 dark:border-zinc-900 dark:text-zinc-400">
              {s.note}
            </p>
          </div>
        ))}
      </div>

      {/* Objection Handling */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Objection Handling</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Every rebuttal ends with the same two slots. If they push on the same thing twice, stop, thank them, and end the call. <span className="font-medium text-zinc-700 dark:text-zinc-300">Never argue.</span>
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {OBJECTIONS.map((o) => (
            <div
              key={o.q}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{o.q}</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">{o.a}</div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
