import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { institutions, professors, type RecentPaper, type RecruitingSignal } from "@/db/schema";
import type { SourceRef } from "@/data/seed-programs";
import type { AuthorCandidate } from "@/lib/sources/openalex";

export async function upsertInstitution(input: {
  name: string;
  country: string | null;
  openAlexId: string | null;
}): Promise<string> {
  const [row] = await db()
    .insert(institutions)
    .values({ name: input.name, country: input.country, openAlexId: input.openAlexId })
    .onConflictDoUpdate({
      target: institutions.name,
      set: { country: input.country, openAlexId: input.openAlexId, updatedAt: new Date() },
    })
    .returning({ id: institutions.id });
  return row.id;
}

/**
 * Writes a discovered author. Only what OpenAlex actually returned is stored — no email, no
 * homepage, no recruiting signal. Those can only come from the professor's own page, in the
 * verification step.
 */
export async function upsertCandidate(
  candidate: AuthorCandidate,
  institutionId: string | null,
): Promise<string> {
  const papers: RecentPaper[] = candidate.papers.slice(0, 8).map((paper) => ({
    title: paper.title,
    year: paper.year,
    venue: paper.venue,
    url: paper.url,
    doi: paper.doi,
    openAlexId: paper.openAlexId,
    verified: true,
  }));

  const [row] = await db()
    .insert(professors)
    .values({
      name: candidate.name,
      openAlexId: candidate.openAlexId,
      orcid: candidate.orcid,
      institutionId,
      topics: candidate.topics.slice(0, 12),
      recentPapers: papers,
      status: "candidate",
    })
    .onConflictDoUpdate({
      target: professors.openAlexId,
      set: {
        name: candidate.name,
        orcid: candidate.orcid,
        institutionId,
        topics: candidate.topics.slice(0, 12),
        recentPapers: papers,
        updatedAt: new Date(),
      },
    })
    .returning({ id: professors.id });

  return row.id;
}

export interface VerificationPatch {
  title: string | null;
  department: string | null;
  labName: string | null;
  homepageUrl: string | null;
  officialEmail: string | null;
  emailSourceUrl: string | null;
  recruitingSignal: RecruitingSignal | null;
  whyNotContact: string | null;
  sources: SourceRef[];
  fitScore: number;
  fitRationale: Record<string, unknown>;
}

export async function applyVerification(
  professorId: string,
  patch: VerificationPatch,
): Promise<void> {
  await db()
    .update(professors)
    .set({
      title: patch.title,
      department: patch.department,
      labName: patch.labName,
      homepageUrl: patch.homepageUrl,
      officialEmail: patch.officialEmail,
      emailSourceUrl: patch.emailSourceUrl,
      recruitingSignal: patch.recruitingSignal,
      whyNotContact: patch.whyNotContact,
      sources: patch.sources,
      fitScore: patch.fitScore,
      fitRationale: patch.fitRationale,
      status: patch.whyNotContact ? "excluded" : "verified",
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(professors.id, professorId));
}

export async function getProfessor(id: string) {
  const [row] = await db().select().from(professors).where(eq(professors.id, id)).limit(1);
  return row ?? null;
}

export async function listProfessors(limit = 100) {
  return db()
    .select()
    .from(professors)
    .orderBy(sql`${professors.fitScore} desc nulls last`, desc(professors.updatedAt))
    .limit(limit);
}

export async function institutionNames(): Promise<Map<string, string>> {
  const rows = await db()
    .select({ id: institutions.id, name: institutions.name })
    .from(institutions);
  return new Map(rows.map((row) => [row.id, row.name]));
}
