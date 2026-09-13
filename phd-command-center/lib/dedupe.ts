/**
 * Deduplication keys. Program identity is university + program + cycle, normalised, so the same
 * program arriving from two different search results collapses into one row (PROMPT.md §6.2).
 */
export function normaliseKeyPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function programDedupeKey(university: string, programName: string, cycle: string): string {
  return [university, programName, cycle].map(normaliseKeyPart).join("::");
}
