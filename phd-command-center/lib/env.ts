import { z } from "zod";

/**
 * Environment validation.
 *
 * `parseServerEnv` is pure so it can be unit tested. `serverEnv()` memoises it and is called
 * lazily from inside request handlers — never at module top level — so that `next build` and the
 * unit tests do not need real secrets.
 */

const emailList = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  )
  .pipe(z.array(z.email()).min(1));

const ServerEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  AUTH_ALLOWED_EMAILS: emailList,

  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL_RESEARCH: z.string().min(1).default("claude-sonnet-5"),
  ANTHROPIC_MODEL_WRITING: z.string().min(1).default("claude-opus-5"),
  ANTHROPIC_MODEL_FAST: z.string().min(1).default("claude-haiku-4-5-20251001"),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(25),

  OPENALEX_MAILTO: z.email(),
  SEMANTIC_SCHOLAR_API_KEY: z.string().min(1).optional(),

  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),

  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

/** Keys that may be referenced by a profile fact's `valueFrom`. */
export const PRIVATE_PROFILE_KEYS = ["PROFILE_PHONE"] as const;
export type PrivateProfileKey = (typeof PRIVATE_PROFILE_KEYS)[number];

export class EnvValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid environment:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "EnvValidationError";
  }
}

function emptyToUndefined(
  raw: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
}

export function parseServerEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = ServerEnvSchema.safeParse(emptyToUndefined(raw));
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "serverEnv() was called in the browser. Server env must never reach the client.",
    );
  }
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** Test seam: drop the memoised value. */
export function resetServerEnvCache(): void {
  cached = undefined;
}

/**
 * Reads a private profile value (see CLAUDE.md "Private data"). Returns null when unset, so the
 * caller can degrade to "withheld" rather than crash — a missing phone number must never take the
 * site down.
 */
export function privateProfileValue(key: PrivateProfileKey): string | null {
  if (typeof window !== "undefined") {
    throw new Error(`privateProfileValue(${key}) was called in the browser.`);
  }
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : null;
}
