import { buildIcs } from "@/lib/calendar/ics";
import { requireViewerApi } from "@/lib/guard";
import { listPrograms, upcomingDeadlines } from "@/lib/programs/store";

export async function GET(): Promise<Response> {
  const guard = await requireViewerApi();
  if ("response" in guard) return guard.response;

  const rows = await listPrograms(500);
  const today = new Date().toISOString().slice(0, 10);

  const ics = buildIcs(
    upcomingDeadlines(rows, today).map((entry) => ({
      uid: `${entry.programId}-${entry.deadline.label}@phd-command-center`,
      date: entry.deadline.date as string,
      summary: `${entry.university} — ${entry.deadline.label}`,
      description: [
        entry.programName,
        `Status: ${entry.verification}`,
        entry.verification !== "verified"
          ? "Check the official page before relying on this date."
          : null,
        entry.deadline.timezone ? `Stated timezone: ${entry.deadline.timezone}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      ...(entry.applicationUrl ? { url: entry.applicationUrl } : {}),
    })),
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="phd-deadlines.ics"',
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
