CREATE TYPE "public"."admission_route" AS ENUM('central_program', 'direct_supervisor', 'cohort_cdt', 'employment_position');--> statement-breakpoint
CREATE TYPE "public"."application_stage" AS ENUM('researching', 'preparing', 'submitted', 'interview', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."cv_target_type" AS ENUM('master', 'program', 'professor');--> statement-breakpoint
CREATE TYPE "public"."gre_requirement" AS ENUM('required', 'optional', 'not_required', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('draft', 'reviewed', 'approved', 'sent_manually', 'follow_up_due', 'replied', 'closed');--> statement-breakpoint
CREATE TYPE "public"."professor_status" AS ENUM('candidate', 'verified', 'contacted', 'replied', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."statement_status" AS ENUM('draft', 'needs_review', 'edited', 'approved');--> statement-breakpoint
CREATE TYPE "public"."statement_type" AS ENUM('sop', 'research_statement', 'motivation_letter', 'cover_letter');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'verified', 'outdated');--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"search_count" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"professor_ids" uuid[] DEFAULT '{}' NOT NULL,
	"stage" "application_stage" DEFAULT 'researching' NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"referee_status" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cv_variant_id" uuid,
	"statement_ids" uuid[] DEFAULT '{}' NOT NULL,
	"portal_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "cv_target_type" NOT NULL,
	"target_id" uuid,
	"label" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emphasis" text,
	"pdf_blob_url" text,
	"warnings" text[] DEFAULT '{}' NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"city" text,
	"open_alex_id" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"total_steps" integer,
	"progress" real DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"dedupe_key" text,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"parent_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professor_id" uuid NOT NULL,
	"subject_options" text[] DEFAULT '{}' NOT NULL,
	"selected_subject" text,
	"body" text NOT NULL,
	"fact_ids_used" text[] DEFAULT '{}' NOT NULL,
	"paper_ids_referenced" text[] DEFAULT '{}' NOT NULL,
	"word_count" integer NOT NULL,
	"max_similarity" real,
	"warnings" text[] DEFAULT '{}' NOT NULL,
	"status" "outreach_status" DEFAULT 'draft' NOT NULL,
	"is_follow_up" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"follow_up_at" timestamp with time zone,
	"reply_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"institution_id" uuid,
	"department" text,
	"lab_name" text,
	"homepage_url" text,
	"official_email" text,
	"email_source_url" text,
	"open_alex_id" text,
	"semantic_scholar_id" text,
	"orcid" text,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"recent_papers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recruiting_signal" jsonb,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fit_score" integer,
	"fit_rationale" jsonb,
	"linked_program_ids" uuid[] DEFAULT '{}' NOT NULL,
	"why_not_contact" text,
	"status" "professor_status" DEFAULT 'candidate' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" text NOT NULL,
	"institution_id" uuid,
	"university" text NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"department" text,
	"program_name" text NOT NULL,
	"degree_type" text NOT NULL,
	"research_areas" text[] DEFAULT '{}' NOT NULL,
	"admission_route" "admission_route" DEFAULT 'central_program' NOT NULL,
	"degree_requirement" text,
	"min_gpa" text,
	"english_tests" jsonb,
	"gre_required" "gre_requirement" DEFAULT 'unknown' NOT NULL,
	"documents" text[] DEFAULT '{}' NOT NULL,
	"interview" text,
	"funding_type" text,
	"stipend" text,
	"stipend_currency" text,
	"stipend_year" integer,
	"international_eligibility" text,
	"deadlines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_term" text,
	"application_url" text,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provenance" text DEFAULT 'extraction' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"confidence" real,
	"fit_score" integer,
	"fit_rationale" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "statement_type" NOT NULL,
	"target_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"fact_ids_used" text[] DEFAULT '{}' NOT NULL,
	"word_limit" integer,
	"word_count" integer DEFAULT 0 NOT NULL,
	"warnings" text[] DEFAULT '{}' NOT NULL,
	"status" "statement_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_professor_id_professors_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."professors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professors" ADD CONSTRAINT "professors_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_program_idx" ON "applications" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "applications_stage_idx" ON "applications" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_table","entity_id");--> statement-breakpoint
CREATE INDEX "cv_variants_target_idx" ON "cv_variants" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_name_idx" ON "institutions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "institutions_open_alex_idx" ON "institutions" USING btree ("open_alex_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_active_dedupe_idx" ON "jobs" USING btree ("dedupe_key") WHERE "jobs"."status" in ('queued', 'running') and "jobs"."dedupe_key" is not null;--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","run_after","priority");--> statement-breakpoint
CREATE INDEX "outreach_professor_idx" ON "outreach_drafts" USING btree ("professor_id");--> statement-breakpoint
CREATE INDEX "outreach_status_idx" ON "outreach_drafts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "professors_open_alex_idx" ON "professors" USING btree ("open_alex_id");--> statement-breakpoint
CREATE INDEX "professors_institution_idx" ON "professors" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "professors_status_idx" ON "professors" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_dedupe_idx" ON "programs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "programs_region_idx" ON "programs" USING btree ("region");--> statement-breakpoint
CREATE INDEX "programs_verification_idx" ON "programs" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "statements_target_idx" ON "statements" USING btree ("type","target_id");