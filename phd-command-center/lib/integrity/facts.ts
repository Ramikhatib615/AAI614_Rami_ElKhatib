import { allFacts, type Fact, type Profile, profile as defaultProfile } from "@/data/profile";

export interface FactCheck {
  ok: boolean;
  /** Ids that do not exist in the profile — an invented fact. */
  missing: string[];
  /** Ids that exist but are not confirmed yet. */
  unconfirmed: string[];
  /** Ids whose claims carry a metric with no evidence. */
  unevidencedMetrics: string[];
  resolved: Fact[];
}

/**
 * The gate every generated artefact passes through. A sentence that cites no fact, or cites one
 * that does not exist, never ships (CLAUDE.md rules 1 and 2).
 */
export function checkFactIds(ids: readonly string[], source: Profile = defaultProfile): FactCheck {
  const byId = new Map(allFacts(source).map((fact) => [fact.id, fact]));
  const missing: string[] = [];
  const unconfirmed: string[] = [];
  const unevidencedMetrics: string[] = [];
  const resolved: Fact[] = [];

  for (const id of ids) {
    const fact = byId.get(id);
    if (!fact) {
      missing.push(id);
      continue;
    }
    resolved.push(fact);
    if (fact.status !== "confirmed") unconfirmed.push(id);
    if (fact.metrics?.some((metric) => metric.evidence === null)) unevidencedMetrics.push(id);
  }

  return {
    ok: missing.length === 0 && unconfirmed.length === 0,
    missing,
    unconfirmed,
    unevidencedMetrics,
    resolved,
  };
}

/** True only when a fact may appear on the public site. */
export function isPublishable(fact: Fact): boolean {
  return fact.visibility === "public" && fact.status === "confirmed" && !fact.retired;
}
