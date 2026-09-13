import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  programs,
  statements,
  type ChecklistItem,
  type RefereeStatus,
} from "@/db/schema";
import { buildChecklist } from "./checklist";

export type ApplicationRow = typeof applications.$inferSelect;

export const STAGES = [
  "researching",
  "preparing",
  "submitted",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export async function listApplications() {
  const rows = await db()
    .select({
      application: applications,
      university: programs.university,
      programName: programs.programName,
      deadlines: programs.deadlines,
      verification: programs.verificationStatus,
    })
    .from(applications)
    .leftJoin(programs, eq(applications.programId, programs.id))
    .orderBy(desc(applications.updatedAt));
  return rows;
}

export async function getApplication(id: string) {
  const [row] = await db().select().from(applications).where(eq(applications.id, id)).limit(1);
  return row ?? null;
}

/**
 * Starts tracking a program. The checklist is generated from what that program actually requires,
 * so it cannot list a document the page never asked for.
 */
export async function startApplication(
  programId: string,
  applicant: { englishTestTaken: boolean; greTaken: boolean; refereesConfirmed: number },
): Promise<string> {
  const [program] = await db().select().from(programs).where(eq(programs.id, programId)).limit(1);
  if (!program) throw new Error("No such program.");

  const checklist = buildChecklist({
    documents: program.documents,
    englishTests: program.englishTests,
    greRequired: program.greRequired,
    interview: program.interview,
    deadlines: program.deadlines,
    applicant,
  });

  const [row] = await db()
    .insert(applications)
    .values({ programId, stage: "researching", checklist })
    .onConflictDoUpdate({ target: applications.programId, set: { updatedAt: new Date() } })
    .returning({ id: applications.id });

  return row.id;
}

export async function setStage(id: string, stage: (typeof STAGES)[number]): Promise<void> {
  await db()
    .update(applications)
    .set({ stage, updatedAt: new Date() })
    .where(eq(applications.id, id));
}

export async function toggleChecklistItem(id: string, index: number): Promise<void> {
  const application = await getApplication(id);
  if (!application) return;
  const checklist: ChecklistItem[] = application.checklist.map((item, position) =>
    position === index ? { ...item, done: !item.done } : item,
  );
  await db()
    .update(applications)
    .set({ checklist, updatedAt: new Date() })
    .where(eq(applications.id, id));
}

export async function setReferees(id: string, referees: RefereeStatus[]): Promise<void> {
  await db()
    .update(applications)
    .set({ refereeStatus: referees, updatedAt: new Date() })
    .where(eq(applications.id, id));
}

export async function listStatements() {
  return db().select().from(statements).orderBy(desc(statements.updatedAt));
}

export async function getStatement(id: string) {
  const [row] = await db().select().from(statements).where(eq(statements.id, id)).limit(1);
  return row ?? null;
}

export async function updateStatement(id: string, patch: Partial<typeof statements.$inferInsert>) {
  await db()
    .update(statements)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(statements.id, id));
}
