import { allFacts, profile as defaultProfile, type Profile } from "@/data/profile";
import { documentFactIds, documentLines, type CvDocument } from "@/lib/cv/types";
import { findEmploymentOverlaps } from "./dates";

export interface CvIntegrityIssue {
  code:
    | "line_without_fact"
    | "unknown_fact"
    | "unconfirmed_fact"
    | "overlapping_dates"
    | "metric_without_evidence"
    | "no_contact"
    | "too_long";
  message: string;
  factId?: string;
  lineId?: string;
}

export interface CvIntegrityReport {
  /** Errors block export. Warnings are Rami's call. */
  errors: CvIntegrityIssue[];
  warnings: CvIntegrityIssue[];
  factIds: string[];
  exportable: boolean;
}

/**
 * The gate in front of every CV export (PROMPT.md §6.5).
 *
 * Blocks when a line carries no fact id, cites a fact that does not exist, cites a fact that still
 * needs confirmation, or when two roles it includes overlap without a part-time flag. Warns on a
 * metric with no evidence — that one is a judgement call, so it stays Rami's.
 */
export function checkCvDocument(
  document: CvDocument,
  source: Profile = defaultProfile,
  options: { pageCount?: number } = {},
): CvIntegrityReport {
  const errors: CvIntegrityIssue[] = [];
  const warnings: CvIntegrityIssue[] = [];
  const byId = new Map(allFacts(source).map((fact) => [fact.id, fact]));

  for (const line of documentLines(document)) {
    // A heading with no text is a layout artefact, not a claim.
    if (line.text.trim().length === 0) continue;

    if (line.factIds.length === 0) {
      errors.push({
        code: "line_without_fact",
        lineId: line.id,
        message: `"${line.text.slice(0, 60)}" cites no fact.`,
      });
      continue;
    }

    for (const factId of line.factIds) {
      const fact = byId.get(factId);
      if (!fact) {
        errors.push({
          code: "unknown_fact",
          factId,
          lineId: line.id,
          message: `${line.id} cites "${factId}", which is not in the profile.`,
        });
        continue;
      }
      if (fact.status !== "confirmed") {
        errors.push({
          code: "unconfirmed_fact",
          factId,
          lineId: line.id,
          message: `${line.id} uses "${factId}", which still needs confirmation.`,
        });
      }
      for (const metric of fact.metrics ?? []) {
        if (metric.evidence === null) {
          warnings.push({
            code: "metric_without_evidence",
            factId,
            lineId: line.id,
            message: `"${metric.claim}" has no evidence behind it.`,
          });
        }
      }
    }
  }

  // Only the roles this document actually includes can create a date conflict in it.
  const includedIds = new Set(document.sections.flatMap((s) => s.entries.map((entry) => entry.id)));
  const included = {
    ...source,
    experience: source.experience.filter((record) => includedIds.has(record.id)),
  };
  const now = new Date().toISOString().slice(0, 7);
  for (const overlap of findEmploymentOverlaps(included, now)) {
    errors.push({ code: "overlapping_dates", message: overlap.message });
  }

  // A CV nobody can reply to is not a CV. This is what currently blocks the master export: no
  // permanent email address has been confirmed.
  if (document.contact.filter((line) => line.factIds.some((id) => byId.get(id)?.tags?.includes("contact"))).length === 0) {
    errors.push({
      code: "no_contact",
      message:
        "The CV carries no way to reach Rami. Confirm a permanent email address (see confirm.permanent-email).",
    });
  }

  if (options.pageCount !== undefined && options.pageCount > 2) {
    warnings.push({
      code: "too_long",
      message: `The CV runs to ${options.pageCount} pages; an academic CV at this stage is usually two.`,
    });
  }

  return { errors, warnings, factIds: documentFactIds(document), exportable: errors.length === 0 };
}
