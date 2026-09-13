import { toCsv } from "@/lib/export/csv";
import { requireViewerApi } from "@/lib/guard";
import { listPrograms } from "@/lib/programs/store";

const COLUMNS = [
  "university",
  "programName",
  "country",
  "region",
  "degreeType",
  "fitScore",
  "verificationStatus",
  "fundingType",
  "stipend",
  "greRequired",
  "nextDeadline",
  "applicationUrl",
  "sourceUrl",
];

export async function GET(): Promise<Response> {
  const guard = await requireViewerApi();
  if ("response" in guard) return guard.response;

  const rows = await listPrograms(500);
  const csv = toCsv(
    rows.map((row) => ({
      ...row,
      nextDeadline:
        row.deadlines
          .map((deadline) => deadline.date)
          .filter((date): date is string => !!date)
          .sort()[0] ?? "",
      sourceUrl: row.sources[0]?.url ?? "",
    })),
    COLUMNS,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="phd-programs.csv"',
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
