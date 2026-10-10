/**
 * The standing report from PROMPT.md §12: every open confirmation and every integrity warning the
 * profile currently carries. Written to docs/plan/status-report.md by `pnpm report`, and rendered
 * live in the dashboard.
 */
import { writeFileSync } from "node:fs";

import { allFacts, profile } from "@/data/profile";
import { buildMasterCv } from "@/lib/cv/master";
import { checkCvDocument } from "@/lib/integrity/cv";
import { coveredMonths, findEmploymentOverlaps } from "@/lib/integrity/dates";
import { withheldFromPublicSite } from "@/lib/site";

const now = new Date().toISOString().slice(0, 7);
const facts = allFacts();
const master = buildMasterCv();
const cv = checkCvDocument(master);
const withheld = withheldFromPublicSite();
const overlaps = findEmploymentOverlaps(profile, now);
const dataMonths = coveredMonths(
  profile.experience.filter((record) => record.id !== "exp.omt"),
  now,
);

const lines = [
  "# Status report",
  "",
  `Generated ${new Date().toISOString().slice(0, 10)} by \`pnpm report\`. The dashboard shows the same thing live.`,
  "",
  "## Open confirmations",
  "",
  `${profile.openConfirmations.length} questions only Rami can answer. ${facts.filter((f) => f.status === "needs_confirmation").length} facts are blocked until he does.`,
  "",
  ...profile.openConfirmations.map(
    (item) =>
      `- **${item.id}** — ${item.question}${item.blocks.length ? ` _(blocks ${item.blocks.join(", ")})_` : ""}`,
  ),
  "",
  "## What the public site is withholding",
  "",
  ...withheld.map((item) => `- **${item.label}** — ${item.reason}`),
  "",
  "## CV export",
  "",
  cv.exportable
    ? "The master CV passes every check and can be exported."
    : `Export is blocked by ${cv.errors.length} issue(s):`,
  ...cv.errors.map((issue) => `- ${issue.message} _(${issue.code})_`),
  "",
  ...(cv.warnings.length
    ? [
        "Warnings, which are Rami's call:",
        "",
        ...cv.warnings.map((issue) => `- ${issue.message}`),
        "",
      ]
    : []),
  "## Integrity findings in the record",
  "",
  ...(overlaps.length
    ? overlaps.map((warning) => `- ${warning.message}`)
    : ["- No unresolved employment overlaps."]),
  `- Data and GIS roles cover ${dataMonths} months (${(dataMonths / 12).toFixed(1)} years), counting overlaps once. No fact in the profile claims a number of years, and a test prevents one being added.`,
  ...facts
    .filter((fact) => fact.metrics?.some((metric) => metric.evidence === null))
    .map(
      (fact) =>
        `- \`${fact.id}\` states a metric with no evidence: ${fact.metrics?.map((m) => m.claim).join("; ")}`,
    ),
  "",
];

const output = lines.join("\n");
writeFileSync("../docs/plan/status-report.md", output);
console.log(output);
