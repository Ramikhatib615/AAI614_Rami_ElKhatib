import { describe, expect, it } from "vitest";

import { EnvValidationError, parseServerEnv } from "@/lib/env";

const valid: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@host.neon.tech/db?sslmode=require",
  AUTH_SECRET: "x".repeat(32),
  AUTH_GITHUB_ID: "github-client-id",
  AUTH_GITHUB_SECRET: "github-client-secret",
  AUTH_ALLOWED_EMAILS: "ramikhatib615@gmail.com",
  OPENALEX_MAILTO: "ramikhatib615@gmail.com",
  CRON_SECRET: "y".repeat(16),
};

describe("parseServerEnv", () => {
  it("accepts a complete environment and applies model defaults", () => {
    const env = parseServerEnv(valid);
    expect(env.ANTHROPIC_MODEL_RESEARCH).toBe("claude-sonnet-5");
    expect(env.ANTHROPIC_MODEL_WRITING).toBe("claude-opus-5");
    expect(env.ANTHROPIC_MODEL_FAST).toBe("claude-haiku-4-5");
    expect(env.AI_MONTHLY_BUDGET_USD).toBe(25);
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("splits, trims, and lowercases the allowlist", () => {
    const env = parseServerEnv({
      ...valid,
      AUTH_ALLOWED_EMAILS: " Rami@Example.com , second@example.com ",
    });
    expect(env.AUTH_ALLOWED_EMAILS).toEqual(["rami@example.com", "second@example.com"]);
  });

  it("rejects an empty allowlist", () => {
    expect(() => parseServerEnv({ ...valid, AUTH_ALLOWED_EMAILS: " , " })).toThrow(
      EnvValidationError,
    );
  });

  it("rejects a non-postgres database url", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://host/db" })).toThrow(
      EnvValidationError,
    );
  });

  it("rejects a short auth secret", () => {
    expect(() => parseServerEnv({ ...valid, AUTH_SECRET: "too-short" })).toThrow(
      /AUTH_SECRET must be at least 32 characters/,
    );
  });

  it("rejects a short cron secret", () => {
    expect(() => parseServerEnv({ ...valid, CRON_SECRET: "short" })).toThrow(
      /CRON_SECRET must be at least 16 characters/,
    );
  });

  it("treats an empty string as unset rather than as a value", () => {
    expect(() => parseServerEnv({ ...valid, AUTH_GITHUB_ID: "" })).toThrow(EnvValidationError);
  });

  it("rejects a non-positive AI budget", () => {
    expect(() => parseServerEnv({ ...valid, AI_MONTHLY_BUDGET_USD: "0" })).toThrow(
      EnvValidationError,
    );
  });

  it("reports every problem at once, with the key named", () => {
    try {
      parseServerEnv({ ...valid, AUTH_SECRET: "short", OPENALEX_MAILTO: "not-an-email" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const issues = (error as EnvValidationError).issues.join("\n");
      expect(issues).toContain("AUTH_SECRET");
      expect(issues).toContain("OPENALEX_MAILTO");
    }
  });
});
