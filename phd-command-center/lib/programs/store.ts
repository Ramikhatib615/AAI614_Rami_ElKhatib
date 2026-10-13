import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { programs } from "@/db/schema";
import type { DeadlineRef, SourceRef } from "@/data/seed-programs";
import { programDedupeKey } from "@/lib/dedupe";

export type ProgramRow = typeof programs.$inferSelect;

export async function listPrograms(limit = 200): Promise<ProgramRow[]> {
  return db()
    .select()
    .from(programs)
    .orderBy(sql`${programs.fitScore} desc nulls last`, desc(programs.updatedAt))
    .limit(limit);
}

export async function getProgram(id: string): Promise<ProgramRow | null> {
  const [row] = await db().select().from(programs).where(eq(programs.id, id)).limit(1);
  return row ?? null;
}

export async function findByDedupeKey(key: string): Promise<ProgramRow | null> {
  const [row] = await db().select().from(programs).where(eq(programs.dedupeKey, key)).limit(1);
  return row ?? null;
}

export interface UpsertProgramInput {
  university: string;
  programName: string;
  cycle: string;
  values: Partial<typeof programs.$inferInsert> & {
    country: string;
    region: string;
    degreeType: string;
  };
}

/**
 * Writes an extracted program. `verificationStatus` and `lastVerifiedAt` are never set here:
 * verification is Rami's act, and an extraction that overwrote it would quietly launder unchecked
 * data into a checked record.
 */
export async function upsertProgram(
  input: UpsertProgramInput,
): Promise<{ id: string; changed: string[] }> {
  const dedupeKey = programDedupeKey(input.university, input.programName, input.cycle);
  const existing = await findByDedupeKey(dedupeKey);

  if (!existing) {
    const [row] = await db()
      .insert(programs)
      .values({
        ...input.values,
        dedupeKey,
        university: input.university,
        programName: input.programName,
        provenance: "extraction",
      })
      .returning({ id: programs.id });
    return { id: row.id, changed: [] };
  }

  const changed = diffPrograms(existing, input.values);
  await db()
    .update(programs)
    .set({
      ...input.values,
      updatedAt: new Date(),
      // A verified record whose source has changed becomes outdated, not silently overwritten.
      ...(changed.length > 0 && existing.verificationStatus === "verified"
        ? { verificationStatus: "outdated" as const }
        : {}),
    })
    .where(eq(programs.id, existing.id));

  return { id: existing.id, changed };
}

/** Field-level diff used by the refresh job to show what moved. */
export function diffPrograms(
  existing: Pick<
    ProgramRow,
    "deadlines" | "fundingType" | "degreeRequirement" | "greRequired" | "documents"
  >,
  next: Partial<typeof programs.$inferInsert>,
): string[] {
  const changed: string[] = [];
  const compare = (key: string, a: unknown, b: unknown) => {
    if (b === undefined) return;
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(key);
  };

  compare("deadlines", existing.deadlines, next.deadlines);
  compare("fundingType", existing.fundingType, next.fundingType);
  compare("degreeRequirement", existing.degreeRequirement, next.degreeRequirement);
  compare("greRequired", existing.greRequired, next.greRequired);
  compare("documents", existing.documents, next.documents);
  return changed;
}

export async function setVerification(
  id: string,
  status: "unverified" | "verified" | "outdated",
): Promise<void> {
  await db()
    .update(programs)
    .set({
      verificationStatus: status,
      lastVerifiedAt: status === "verified" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(programs.id, id));
}

export async function setScore(
  id: string,
  fitScore: number,
  fitRationale: Record<string, unknown>,
): Promise<void> {
  await db()
    .update(programs)
    .set({ fitScore, fitRationale, updatedAt: new Date() })
    .where(eq(programs.id, id));
}

/** Deadlines within the window, for the dashboard and the calendar export. */
export function upcomingDeadlines(rows: readonly ProgramRow[], today: string) {
  const entries: {
    programId: string;
    university: string;
    programName: string;
    verification: string;
    applicationUrl: string | null;
    deadline: DeadlineRef;
  }[] = [];

  for (const row of rows) {
    for (const deadline of row.deadlines) {
      if (!deadline.date || deadline.date < today) continue;
      entries.push({
        programId: row.id,
        university: row.university,
        programName: row.programName,
        verification: row.verificationStatus,
        applicationUrl: row.applicationUrl,
        deadline,
      });
    }
  }

  return entries.sort((a, b) => (a.deadline.date ?? "").localeCompare(b.deadline.date ?? ""));
}

export function sourcesOf(row: ProgramRow): SourceRef[] {
  return row.sources;
}
