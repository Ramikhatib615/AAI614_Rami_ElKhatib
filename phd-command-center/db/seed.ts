/**
 * Seeds the §7 programs. Idempotent: re-running updates the same rows by dedupe key and never
 * touches `verificationStatus`, so a program Rami has verified is not quietly reset to unverified.
 */
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { seedPrograms } from "@/data/seed-programs";
import { programDedupeKey } from "@/lib/dedupe";
import { institutions, programs } from "./schema";

loadEnv({ path: ".env.local", quiet: true });

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema: { institutions, programs } });

  try {
    for (const program of seedPrograms) {
      const cycle = program.deadlines[0]?.cycle ?? "unknown-cycle";
      const dedupeKey = programDedupeKey(program.university, program.programName, cycle);

      const [institution] = await db
        .insert(institutions)
        .values({ name: program.university, country: program.country })
        .onConflictDoUpdate({
          target: institutions.name,
          set: { country: program.country, updatedAt: new Date() },
        })
        .returning();

      const values = {
        dedupeKey,
        institutionId: institution.id,
        university: program.university,
        country: program.country,
        region: program.region,
        department: program.department,
        programName: program.programName,
        degreeType: program.degreeType,
        researchAreas: program.researchAreas,
        admissionRoute: program.admissionRoute,
        degreeRequirement: program.degreeRequirement,
        minGpa: program.minGpa,
        englishTests: program.englishTests,
        greRequired: program.greRequired,
        documents: program.documents,
        interview: program.interview,
        fundingType: program.fundingType,
        stipend: program.stipend,
        internationalEligibility: program.internationalEligibility,
        deadlines: program.deadlines,
        startTerm: program.startTerm,
        applicationUrl: program.applicationUrl,
        sources: program.sources,
        provenance: program.provenance,
        notes: program.notes,
      };

      const existing = await db.select().from(programs).where(eq(programs.dedupeKey, dedupeKey));

      if (existing.length === 0) {
        await db.insert(programs).values(values);
        console.log(`inserted  ${dedupeKey}`);
      } else {
        // Leave verificationStatus and lastVerifiedAt alone — those are Rami's, not the seed's.
        await db
          .update(programs)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(programs.dedupeKey, dedupeKey));
        console.log(`updated   ${dedupeKey}`);
      }
    }
    console.log(`\n${seedPrograms.length} programs seeded, all unverified.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
