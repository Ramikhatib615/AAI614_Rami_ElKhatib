import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { outreachDrafts, professors } from "@/db/schema";

export async function draftsForProfessor(professorId: string) {
  return db()
    .select()
    .from(outreachDrafts)
    .where(eq(outreachDrafts.professorId, professorId))
    .orderBy(desc(outreachDrafts.createdAt));
}

/** Bodies of every other draft, for the near-duplicate check. */
export async function otherDraftBodies(professorId: string) {
  const rows = await db()
    .select({ id: outreachDrafts.id, body: outreachDrafts.body })
    .from(outreachDrafts)
    .where(ne(outreachDrafts.professorId, professorId));
  return rows;
}

/**
 * Other people at the same institution Rami has already written to. Approaching two colleagues in
 * one department at once is the kind of thing that gets noticed, so it is surfaced rather than
 * prevented — the choice is his (PROMPT.md §6.4).
 */
export async function colleaguesAlreadyContacted(
  institutionId: string | null,
  professorId: string,
) {
  if (!institutionId) return [];
  const rows = await db()
    .select({ id: professors.id, name: professors.name, status: professors.status })
    .from(professors)
    .where(and(eq(professors.institutionId, institutionId), ne(professors.id, professorId)));

  const contacted = [];
  for (const row of rows) {
    const drafts = await draftsForProfessor(row.id);
    if (drafts.some((draft) => draft.status === "sent_manually" || draft.status === "approved")) {
      contacted.push(row);
    }
  }
  return contacted;
}

export async function listDrafts(limit = 100) {
  return db().select().from(outreachDrafts).orderBy(desc(outreachDrafts.updatedAt)).limit(limit);
}

export async function getDraft(id: string) {
  const [row] = await db().select().from(outreachDrafts).where(eq(outreachDrafts.id, id)).limit(1);
  return row ?? null;
}

export async function insertDraft(values: typeof outreachDrafts.$inferInsert) {
  const [row] = await db()
    .insert(outreachDrafts)
    .values(values)
    .returning({ id: outreachDrafts.id });
  return row.id;
}

export async function updateDraft(id: string, patch: Partial<typeof outreachDrafts.$inferInsert>) {
  await db()
    .update(outreachDrafts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(outreachDrafts.id, id));
}

export async function countFollowUps(professorId: string): Promise<number> {
  const rows = await draftsForProfessor(professorId);
  return rows.filter((row) => row.isFollowUp).length;
}
