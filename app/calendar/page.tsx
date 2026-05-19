import { CalEmbed } from "@/components/cal-embed";

export default function CalendarRoot() {
  return (
    <CalEmbed
      calLink="team/entheios/discovery-call-in"
      event={{
        title: "Strategy Session with Entheios AI",
        description:
          "A short call with an Entheios specialist to see if there is a fit.",
        durationMin: 30,
        locationLabel: "Cal Video",
      }}
    />
  );
}
