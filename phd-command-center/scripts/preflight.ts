/**
 * Checks the environment before a deploy or a first run, and says exactly what is missing and
 * where to get it. Run with `pnpm preflight`.
 */
import { config as loadEnv } from "dotenv";

import { parseServerEnv, EnvValidationError } from "@/lib/env";

loadEnv({ path: ".env.local", quiet: true });

interface Check {
  key: string;
  required: boolean;
  where: string;
}

const CHECKS: Check[] = [
  {
    key: "DATABASE_URL",
    required: true,
    where: "Neon, added to the Vercel project from the marketplace",
  },
  { key: "AUTH_SECRET", required: true, where: "openssl rand -base64 32" },
  {
    key: "AUTH_GITHUB_ID",
    required: true,
    where: "GitHub → Settings → Developer settings → OAuth Apps",
  },
  { key: "AUTH_GITHUB_SECRET", required: true, where: "the same OAuth app" },
  {
    key: "AUTH_ALLOWED_EMAILS",
    required: true,
    where: "your own address; nobody else can sign in",
  },
  { key: "CRON_SECRET", required: true, where: "openssl rand -hex 16" },
  { key: "OPENALEX_MAILTO", required: true, where: "your contact address, sent in the User-Agent" },
  {
    key: "ANTHROPIC_API_KEY",
    required: false,
    where: "platform.claude.com — needed from phase 4 onward",
  },
  {
    key: "OPENALEX_API_KEY",
    required: false,
    where: "openalex.org — free, and raises the daily budget tenfold",
  },
  { key: "PROFILE_PHONE", required: false, where: "your phone number, kept out of git on purpose" },
];

function main(): void {
  const missing = CHECKS.filter((check) => !process.env[check.key]?.trim());
  const blocking = missing.filter((check) => check.required);

  for (const check of CHECKS) {
    const present = Boolean(process.env[check.key]?.trim());
    const mark = present ? "ok  " : check.required ? "MISSING" : "unset";
    console.log(`${mark.padEnd(8)} ${check.key.padEnd(22)} ${present ? "" : check.where}`);
  }

  if (blocking.length > 0) {
    console.error(`\n${blocking.length} required variable(s) missing. See SETUP.md.`);
    process.exit(1);
  }

  try {
    const env = parseServerEnv(process.env);
    console.log(`\nEnvironment valid. Allowlist: ${env.AUTH_ALLOWED_EMAILS.join(", ")}`);
    console.log(
      `Models: ${env.ANTHROPIC_MODEL_RESEARCH} (research), ${env.ANTHROPIC_MODEL_WRITING} (writing), ${env.ANTHROPIC_MODEL_FAST} (fast)`,
    );
    console.log(`AI cap: $${env.AI_MONTHLY_BUDGET_USD.toFixed(2)} per month`);
    if (!env.OPENALEX_API_KEY) {
      console.warn(
        "\nNo OPENALEX_API_KEY. Discovery will share an anonymous daily budget and will usually be rate limited.",
      );
    }
  } catch (error: unknown) {
    if (error instanceof EnvValidationError) {
      console.error("\nEnvironment is present but invalid:");
      for (const issue of error.issues) console.error(`  - ${issue}`);
      process.exit(1);
    }
    throw error;
  }
}

main();
