/**
 * Database schema (PROMPT.md §4).
 *
 * Two conventions carry the integrity rules into the database itself:
 *  - Anything fetched from the web stores `sources`: url, a short evidence snippet, and when it
 *    was fetched. A field with no source is null, never a guess.
 *  - Anything generated stores `factIdsUsed`, the ids from data/profile.ts it was built from.
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { DeadlineRef, SourceRef } from "@/data/seed-programs";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const verificationStatus = pgEnum("verification_status", [
  "unverified",
  "verified",
  "outdated",
]);
export const greRequirement = pgEnum("gre_requirement", [
  "required",
  "optional",
  "not_required",
  "unknown",
]);
export const admissionRoute = pgEnum("admission_route", [
  "central_program",
  "direct_supervisor",
  "cohort_cdt",
  "employment_position",
]);
export const professorStatus = pgEnum("professor_status", [
  "candidate",
  "verified",
  "contacted",
  "replied",
  "excluded",
]);
export const outreachStatus = pgEnum("outreach_status", [
  "draft",
  "reviewed",
  "approved",
  "sent_manually",
  "follow_up_due",
  "replied",
  "closed",
]);
export const applicationStage = pgEnum("application_stage", [
  "researching",
  "preparing",
  "submitted",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);
export const cvTargetType = pgEnum("cv_target_type", ["master", "program", "professor"]);
export const statementType = pgEnum("statement_type", [
  "sop",
  "research_statement",
  "motivation_letter",
  "cover_letter",
]);
export const statementStatus = pgEnum("statement_status", [
  "draft",
  "needs_review",
  "edited",
  "approved",
]);
export const jobStatus = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "paused",
  "cancelled",
]);

export const institutions = pgTable(
  "institutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    country: text("country"),
    city: text("city"),
    openAlexId: text("open_alex_id"),
    website: text("website"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("institutions_name_idx").on(table.name),
    index("institutions_open_alex_idx").on(table.openAlexId),
  ],
);

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** normalised university + program + cycle, used for deduplication */
    dedupeKey: text("dedupe_key").notNull(),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    university: text("university").notNull(),
    country: text("country").notNull(),
    region: text("region").notNull(),
    department: text("department"),
    programName: text("program_name").notNull(),
    degreeType: text("degree_type").notNull(),
    researchAreas: text("research_areas").array().notNull().default([]),
    admissionRoute: admissionRoute("admission_route").notNull().default("central_program"),
    degreeRequirement: text("degree_requirement"),
    minGpa: text("min_gpa"),
    englishTests: jsonb("english_tests").$type<Record<string, string> | null>(),
    greRequired: greRequirement("gre_required").notNull().default("unknown"),
    documents: text("documents").array().notNull().default([]),
    interview: text("interview"),
    fundingType: text("funding_type"),
    stipend: text("stipend"),
    stipendCurrency: text("stipend_currency"),
    stipendYear: integer("stipend_year"),
    internationalEligibility: text("international_eligibility"),
    deadlines: jsonb("deadlines").$type<DeadlineRef[]>().notNull().default([]),
    startTerm: text("start_term"),
    applicationUrl: text("application_url"),
    sources: jsonb("sources").$type<SourceRef[]>().notNull().default([]),
    /** "prompt_seed" for the §7 rows, "extraction" for anything a job fetched. */
    provenance: text("provenance").notNull().default("extraction"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verificationStatus: verificationStatus("verification_status").notNull().default("unverified"),
    confidence: real("confidence"),
    fitScore: integer("fit_score"),
    fitRationale: jsonb("fit_rationale").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("programs_dedupe_idx").on(table.dedupeKey),
    index("programs_region_idx").on(table.region),
    index("programs_verification_idx").on(table.verificationStatus),
  ],
);

export interface RecentPaper {
  title: string;
  year: number | null;
  venue: string | null;
  url: string | null;
  doi: string | null;
  openAlexId: string | null;
  verified: boolean;
}

export interface RecruitingSignal {
  text: string;
  url: string;
  date: string | null;
}

export const professors = pgTable(
  "professors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    title: text("title"),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    department: text("department"),
    labName: text("lab_name"),
    homepageUrl: text("homepage_url"),
    /** Only ever an address published on an official page. Null otherwise — never guessed. */
    officialEmail: text("official_email"),
    emailSourceUrl: text("email_source_url"),
    openAlexId: text("open_alex_id"),
    semanticScholarId: text("semantic_scholar_id"),
    orcid: text("orcid"),
    topics: text("topics").array().notNull().default([]),
    recentPapers: jsonb("recent_papers").$type<RecentPaper[]>().notNull().default([]),
    recruitingSignal: jsonb("recruiting_signal").$type<RecruitingSignal | null>(),
    sources: jsonb("sources").$type<SourceRef[]>().notNull().default([]),
    fitScore: integer("fit_score"),
    fitRationale: jsonb("fit_rationale").$type<Record<string, unknown> | null>(),
    linkedProgramIds: uuid("linked_program_ids").array().notNull().default([]),
    /** e.g. the page says they are not taking students */
    whyNotContact: text("why_not_contact"),
    status: professorStatus("status").notNull().default("candidate"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("professors_open_alex_idx").on(table.openAlexId),
    index("professors_institution_idx").on(table.institutionId),
    index("professors_status_idx").on(table.status),
  ],
);

export const outreachDrafts = pgTable(
  "outreach_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professorId: uuid("professor_id")
      .notNull()
      .references(() => professors.id, { onDelete: "cascade" }),
    subjectOptions: text("subject_options").array().notNull().default([]),
    selectedSubject: text("selected_subject"),
    body: text("body").notNull(),
    factIdsUsed: text("fact_ids_used").array().notNull().default([]),
    paperIdsReferenced: text("paper_ids_referenced").array().notNull().default([]),
    wordCount: integer("word_count").notNull(),
    /** Highest cosine similarity against other drafts, so near-duplicates get flagged. */
    maxSimilarity: real("max_similarity"),
    warnings: text("warnings").array().notNull().default([]),
    status: outreachStatus("status").notNull().default("draft"),
    isFollowUp: boolean("is_follow_up").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    replySummary: text("reply_summary"),
    ...timestamps,
  },
  (table) => [
    index("outreach_professor_idx").on(table.professorId),
    index("outreach_status_idx").on(table.status),
  ],
);

export interface ChecklistItem {
  item: string;
  done: boolean;
  dueDate: string | null;
  sourceField?: string;
}

export interface RefereeStatus {
  /** Kept as an opaque label; referee identities stay out of git and out of the public site. */
  label: string;
  requestedAt: string | null;
  remindedAt: string | null;
  submittedAt: string | null;
}

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    professorIds: uuid("professor_ids").array().notNull().default([]),
    stage: applicationStage("stage").notNull().default("researching"),
    checklist: jsonb("checklist").$type<ChecklistItem[]>().notNull().default([]),
    refereeStatus: jsonb("referee_status").$type<RefereeStatus[]>().notNull().default([]),
    cvVariantId: uuid("cv_variant_id"),
    statementIds: uuid("statement_ids").array().notNull().default([]),
    portalUrl: text("portal_url"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("applications_program_idx").on(table.programId),
    index("applications_stage_idx").on(table.stage),
  ],
);

export interface CvSection {
  heading: string;
  factIds: string[];
}

export const cvVariants = pgTable(
  "cv_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: cvTargetType("target_type").notNull(),
    targetId: uuid("target_id"),
    label: text("label").notNull(),
    sections: jsonb("sections").$type<CvSection[]>().notNull().default([]),
    emphasis: text("emphasis"),
    pdfBlobUrl: text("pdf_blob_url"),
    warnings: text("warnings").array().notNull().default([]),
    approved: boolean("approved").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("cv_variants_target_idx").on(table.targetType, table.targetId)],
);

export const statements = pgTable(
  "statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: statementType("type").notNull(),
    targetId: uuid("target_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    factIdsUsed: text("fact_ids_used").array().notNull().default([]),
    wordLimit: integer("word_limit"),
    wordCount: integer("word_count").notNull().default(0),
    warnings: text("warnings").array().notNull().default([]),
    status: statementStatus("status").notNull().default("draft"),
    ...timestamps,
  },
  (table) => [index("statements_target_idx").on(table.type, table.targetId)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: jobStatus("status").notNull().default("queued"),
    step: integer("step").notNull().default(0),
    totalSteps: integer("total_steps"),
    progress: real("progress").notNull().default(0),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    priority: integer("priority").notNull().default(100),
    /** Unique among active jobs, so the same work is never queued twice. */
    dedupeKey: text("dedupe_key"),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    parentJobId: uuid("parent_job_id"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("jobs_active_dedupe_idx")
      .on(table.dedupeKey)
      .where(sql`${table.status} in ('queued', 'running') and ${table.dedupeKey} is not null`),
    index("jobs_claim_idx").on(table.status, table.runAfter, table.priority),
  ],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    purpose: text("purpose").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    searchCount: integer("search_count").notNull().default(0),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [index("ai_usage_created_idx").on(table.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "ai" for a model write, or the signed-in email for a human one. */
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entityTable: text("entity_table").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_entity_idx").on(table.entityTable, table.entityId)],
);

export const programsRelations = relations(programs, ({ one, many }) => ({
  institution: one(institutions, {
    fields: [programs.institutionId],
    references: [institutions.id],
  }),
  applications: many(applications),
}));

export const professorsRelations = relations(professors, ({ one, many }) => ({
  institution: one(institutions, {
    fields: [professors.institutionId],
    references: [institutions.id],
  }),
  drafts: many(outreachDrafts),
}));

export const outreachDraftsRelations = relations(outreachDrafts, ({ one }) => ({
  professor: one(professors, {
    fields: [outreachDrafts.professorId],
    references: [professors.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  program: one(programs, { fields: [applications.programId], references: [programs.id] }),
}));
