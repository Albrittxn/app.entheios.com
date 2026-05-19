import { CalEmbed } from "@/components/cal-embed";

export default function CalendarQuick() {
  return (
    <CalEmbed
      calLink="team/entheios/discovery-call-out"
      event={{
        title: "Strategy Session (Quick)",
        description:
          "A short call with an Entheios specialist to see if there is a fit.",
        durationMin: 30,
        locationLabel: "Cal Video",
      }}
    />
  );
}
