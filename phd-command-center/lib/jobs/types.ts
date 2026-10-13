import { z } from "zod";

/** Job types. Phases 5 and 6 add their handlers; the contract is fixed here. */
export const JOB_TYPES = [
  "diagnostics.ping",
  "ai.probe",
  "program.discover",
  "program.extract",
  "program.refresh",
  "professor.discover",
  "professor.enrich",
  "professor.verify_page",
  "outreach.draft",
  "cv.tailor",
  "statement.draft",
  "maintenance.weekly",
] as const;

export const jobTypeSchema = z.enum(JOB_TYPES);
export type JobType = z.infer<typeof jobTypeSchema>;

export const enqueueSchema = z.object({
  type: jobTypeSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  dedupeKey: z.string().min(1).max(400).optional(),
  priority: z.number().int().min(0).max(1000).default(100),
  runAfter: z.coerce.date().optional(),
  parentJobId: z.uuid().optional(),
});

export type EnqueueInput = z.input<typeof enqueueSchema>;

export interface JobRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  step: number;
  totalSteps: number | null;
  attempts: number;
  maxAttempts: number;
}

/** One step of work. A handler does a little and says what comes next. */
export type JobStepResult =
  | { status: "done"; result?: Record<string, unknown> }
  | {
      status: "continue";
      step?: number;
      totalSteps?: number;
      payload?: Record<string, unknown>;
      children?: EnqueueInput[];
    }
  | { status: "paused"; reason: string };

export interface JobHandlerContext {
  job: JobRecord;
  /** Queue follow-on work; deduplicated, so replaying a step never doubles it. */
  enqueue: (input: EnqueueInput) => Promise<void>;
}

export type JobHandler = (context: JobHandlerContext) => Promise<JobStepResult>;
export type JobHandlerRegistry = Partial<Record<JobType, JobHandler>>;
