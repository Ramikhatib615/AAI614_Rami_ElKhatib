/**
 * The CV document model. It is a list of lines, each of which names the profile facts it was
 * built from — that is what makes a CV checkable rather than merely typed.
 */
export interface CvLine {
  id: string;
  text: string;
  factIds: string[];
  /** A secondary line: dates, institution, venue. */
  meta?: string;
}

export interface CvEntry {
  id: string;
  heading: string;
  meta?: string;
  lines: CvLine[];
  factIds: string[];
}

export interface CvSection {
  id: string;
  heading: string;
  entries: CvEntry[];
}

export interface CvDocument {
  label: string;
  /** Contact block, rendered under the name. */
  contact: CvLine[];
  sections: CvSection[];
  /** Facts left out, and why — the cost of the open confirmations, made visible. */
  omissions: { factId: string; label: string; reason: string }[];
}

export function documentFactIds(document: CvDocument): string[] {
  const ids = new Set<string>();
  for (const line of document.contact) line.factIds.forEach((id) => ids.add(id));
  for (const section of document.sections) {
    for (const entry of section.entries) {
      entry.factIds.forEach((id) => ids.add(id));
      for (const line of entry.lines) line.factIds.forEach((id) => ids.add(id));
    }
  }
  return [...ids];
}

export function documentLines(document: CvDocument): CvLine[] {
  return [
    ...document.contact,
    ...document.sections.flatMap((section) =>
      section.entries.flatMap((entry) => [
        { id: entry.id, text: entry.heading, factIds: entry.factIds, meta: entry.meta },
        ...entry.lines,
      ]),
    ),
  ];
}
