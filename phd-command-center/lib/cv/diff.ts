import type { CvDocument } from "./types";

export interface CvDiffLine {
  id: string;
  text: string;
  change: "added" | "removed" | "unchanged";
}

export interface CvDiffSection {
  heading: string;
  lines: CvDiffLine[];
}

/**
 * Compares two CV projections line by line, keyed by fact id. Phase 3 uses it to show what the
 * open confirmations are costing; the same function serves tailored variants later.
 */
export function diffCvDocuments(base: CvDocument, candidate: CvDocument): CvDiffSection[] {
  const headings = [
    ...new Set([
      ...base.sections.map((section) => section.heading),
      ...candidate.sections.map((section) => section.heading),
    ]),
  ];

  return headings
    .map((heading) => {
      const baseLines = collect(base, heading);
      const candidateLines = collect(candidate, heading);
      const ids = [...new Set([...baseLines.keys(), ...candidateLines.keys()])];

      const lines = ids.map((id): CvDiffLine => {
        const inBase = baseLines.get(id);
        const inCandidate = candidateLines.get(id);
        if (inBase && inCandidate) return { id, text: inCandidate, change: "unchanged" };
        if (inCandidate) return { id, text: inCandidate, change: "added" };
        return { id, text: inBase as string, change: "removed" };
      });

      return { heading, lines };
    })
    .filter((section) => section.lines.some((line) => line.change !== "unchanged"));
}

function collect(document: CvDocument, heading: string): Map<string, string> {
  const section = document.sections.find((candidate) => candidate.heading === heading);
  const map = new Map<string, string>();
  for (const entry of section?.entries ?? []) {
    if (entry.heading.trim()) map.set(entry.id, `${entry.heading}${entry.meta ? ` — ${entry.meta}` : ""}`);
    for (const line of entry.lines) map.set(line.id, line.text);
  }
  return map;
}
