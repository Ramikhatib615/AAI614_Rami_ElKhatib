import { db } from "@/db";
import {
  aiUsage,
  applications,
  auditLog,
  cvVariants,
  institutions,
  jobs,
  outreachDrafts,
  professors,
  programs,
  statements,
} from "@/db/schema";
import { requireViewerApi } from "@/lib/guard";

export const maxDuration = 60;

/**
 * Everything in the database as one JSON file (PROMPT.md §9). This is the escape hatch: the work
 * of a year should not be locked inside one hosted app, and a restore is a paste into psql away.
 */
export async function GET(): Promise<Response> {
  const guard = await requireViewerApi();
  if ("response" in guard) return guard.response;

  const database = db();
  const [
    institutionRows,
    programRows,
    professorRows,
    draftRows,
    applicationRows,
    statementRows,
    cvRows,
    jobRows,
    usageRows,
    auditRows,
  ] = await Promise.all([
    database.select().from(institutions),
    database.select().from(programs),
    database.select().from(professors),
    database.select().from(outreachDrafts),
    database.select().from(applications),
    database.select().from(statements),
    database.select().from(cvVariants),
    database.select().from(jobs),
    database.select().from(aiUsage),
    database.select().from(auditLog),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    note: "Full export from the PhD command center. Profile facts live in data/profile.ts, in the repository.",
    institutions: institutionRows,
    programs: programRows,
    professors: professorRows,
    outreachDrafts: draftRows,
    applications: applicationRows,
    statements: statementRows,
    cvVariants: cvRows,
    jobs: jobRows,
    aiUsage: usageRows,
    auditLog: auditRows,
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="phd-command-center-${new Date().toISOString().slice(0, 10)}.json"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
