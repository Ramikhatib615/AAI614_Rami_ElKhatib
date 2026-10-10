/**
 * Near-duplicate detection between outreach drafts (PROMPT.md §6.4).
 *
 * Jaccard overlap on three-word shingles: cheap, deterministic, and it catches the failure that
 * matters — the same letter with the names swapped. Professors in one department talk to each
 * other, so two near-identical emails is worse than none.
 */
export function shingles(text: string, size = 3): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const result = new Set<string>();
  for (let i = 0; i + size <= words.length; i += 1) {
    result.add(words.slice(i, i + size).join(" "));
  }
  return result;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function similarity(a: string, b: string): number {
  return jaccard(shingles(a), shingles(b));
}

/** Above this a draft is only flagged; above the block threshold it cannot be approved. */
export const SIMILARITY_WARN = 0.35;
export const SIMILARITY_BLOCK = 0.6;

export interface SimilarityFinding {
  otherId: string;
  score: number;
  level: "warn" | "block";
}

export function compareAgainst(
  body: string,
  others: readonly { id: string; body: string }[],
): SimilarityFinding[] {
  return others
    .map((other) => ({ otherId: other.id, score: similarity(body, other.body) }))
    .filter((finding) => finding.score >= SIMILARITY_WARN)
    .map((finding) => ({
      ...finding,
      level: finding.score >= SIMILARITY_BLOCK ? ("block" as const) : ("warn" as const),
    }))
    .sort((a, b) => b.score - a.score);
}
