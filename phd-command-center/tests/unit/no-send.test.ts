import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PROMPT.md §1.2 and CLAUDE.md rule 7: emails are drafts only. This walks the source and fails if
 * any code path calls a send endpoint. It runs from phase 4 so the rule is enforced before the
 * outreach code that could break it is written.
 */
const ROOTS = ["app", "lib", "db", "data", "components"];

const FORBIDDEN: { pattern: RegExp; what: string }[] = [
  { pattern: /\/sendMail\b/, what: "Microsoft Graph sendMail" },
  { pattern: /messages\/send\b/, what: "Gmail messages.send" },
  { pattern: /\.sendMail\s*\(/, what: "a mail transport send call" },
  { pattern: /users\/[^"'`\s]+\/sendMail/, what: "Graph user sendMail" },
  { pattern: /resend[\s\S]{0,40}\.emails\.send\s*\(/i, what: "Resend send to a third party" },
];

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe("no code path can send an email", () => {
  it("finds no send endpoint anywhere in the source", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of sourceFiles(root)) {
        // The rule's own statement mentions these names; skip this test file's siblings only.
        const contents = readFileSync(file, "utf8");
        for (const { pattern, what } of FORBIDDEN) {
          if (pattern.test(contents)) offenders.push(`${file}: ${what}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
