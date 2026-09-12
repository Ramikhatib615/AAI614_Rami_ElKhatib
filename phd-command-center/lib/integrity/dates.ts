import type { ExperienceRecord, Profile } from "@/data/profile";

/** Months since year 0 for a `YYYY-MM` string. Throws on a malformed value rather than guessing. */
export function monthIndex(value: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected a YYYY-MM date, received "${value}"`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Month out of range in "${value}"`);
  return year * 12 + (month - 1);
}

/** Inclusive months between two `YYYY-MM` values; `null` end means "to now". */
export function monthsBetween(start: string, end: string | null, now: string): number {
  return monthIndex(end ?? now) - monthIndex(start) + 1;
}

export interface OverlapWarning {
  a: string;
  b: string;
  months: number;
  message: string;
}

function overlapMonths(a: ExperienceRecord, b: ExperienceRecord, now: string): number {
  const startA = monthIndex(a.start);
  const endA = monthIndex(a.end ?? now);
  const startB = monthIndex(b.start);
  const endB = monthIndex(b.end ?? now);
  return Math.min(endA, endB) - Math.max(startA, startB) + 1;
}

/**
 * Overlapping employment is the integrity problem PROMPT.md §6.5 names explicitly. Two roles may
 * legitimately overlap — but only once at least one of them is marked part-time. An overlap
 * between roles that are both full-time, or either of which is `unknown`, is reported for Rami to
 * resolve; it is never silently corrected.
 */
export function findEmploymentOverlaps(profile: Profile, now: string): OverlapWarning[] {
  const warnings: OverlapWarning[] = [];
  const records = profile.experience;

  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i];
      const b = records[j];
      const months = overlapMonths(a, b, now);
      if (months <= 0) continue;
      if (a.employmentType === "part_time" || b.employmentType === "part_time") continue;

      const unknown = [a, b].filter((record) => record.employmentType === "unknown");
      const message =
        unknown.length > 0
          ? `${a.organization} and ${b.organization} overlap by ${months} month(s), and ${unknown
              .map((record) => record.organization)
              .join(" and ")} has no confirmed employment type.`
          : `${a.organization} and ${b.organization} are both marked full-time and overlap by ${months} month(s).`;

      warnings.push({ a: a.id, b: b.id, months, message });
    }
  }

  return warnings;
}

/** Total months covered by the given records, counting overlapping months once. */
export function coveredMonths(records: ExperienceRecord[], now: string): number {
  const ranges = records
    .map((record) => [monthIndex(record.start), monthIndex(record.end ?? now)] as const)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let cursorStart: number | null = null;
  let cursorEnd = 0;

  for (const [start, end] of ranges) {
    if (cursorStart === null) {
      cursorStart = start;
      cursorEnd = end;
      continue;
    }
    if (start <= cursorEnd + 1) {
      cursorEnd = Math.max(cursorEnd, end);
    } else {
      total += cursorEnd - cursorStart + 1;
      cursorStart = start;
      cursorEnd = end;
    }
  }

  if (cursorStart !== null) total += cursorEnd - cursorStart + 1;
  return total;
}
