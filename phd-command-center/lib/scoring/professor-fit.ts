import { matchInterests, RANK_POINTS, type InterestRule } from "./interests";

/**
 * The professor rubric from PROMPT.md §6.3, shown in the UI exactly as it is computed here:
 * topical overlap 50, recent activity 15, an explicit recruiting signal 15, the GeoAI/humanitarian
 * crossover 10, and funding 10.
 *
 * Nothing scores on an assumption. A component with no evidence scores zero and says why, rather
 * than taking a middling default that would quietly promote an unverified professor.
 */
export interface ProfessorFitInput {
  topics: readonly string[];
  papers: readonly { year: number | null }[];
  recruitingSignal: { text: string; url: string; date: string | null } | null;
  /** Whether a linked program is known to fund international students. Null means not established. */
  linkedProgramFunded: boolean | null;
  /** Current year, injected so the scoring is deterministic in tests. */
  currentYear: number;
}

export interface FitComponent {
  key: "topics" | "activity" | "recruiting" | "crossover" | "funding";
  label: string;
  points: number;
  max: number;
  reason: string;
}

export interface ProfessorFit {
  score: number;
  components: FitComponent[];
  matchedInterests: string[];
}

const MAX = { topics: 50, activity: 15, recruiting: 15, crossover: 10, funding: 10 } as const;

function topicPoints(matched: InterestRule[]): { points: number; reason: string } {
  if (matched.length === 0) {
    return { points: 0, reason: "No paper topic matches any of the four stated interests." };
  }
  const best = matched.reduce((a, b) => (a.rank <= b.rank ? a : b));
  const base = RANK_POINTS[best.rank] ?? 0;
  // A second matching interest is worth a little, but never more than the cap.
  const breadth = Math.min(MAX.topics - base, (matched.length - 1) * 4);
  return {
    points: base + breadth,
    reason: `Matches ${matched.map((rule) => rule.label).join(", ")}; best is priority ${best.rank}.`,
  };
}

function activityPoints(papers: readonly { year: number | null }[], currentYear: number) {
  const years = papers.map((paper) => paper.year).filter((year): year is number => year !== null);
  if (years.length === 0) return { points: 0, reason: "No dated papers on record." };
  const latest = Math.max(...years);
  const age = currentYear - latest;
  if (age <= 1) return { points: 15, reason: `Published in ${latest}.` };
  if (age <= 2) return { points: 10, reason: `Most recent paper is from ${latest}.` };
  if (age <= 3)
    return { points: 5, reason: `Most recent paper is from ${latest}, three years back.` };
  return { points: 0, reason: `Nothing since ${latest}.` };
}

export function scoreProfessor(input: ProfessorFitInput): ProfessorFit {
  const matched = matchInterests(input.topics);
  const topics = topicPoints(matched);
  const activity = activityPoints(input.papers, input.currentYear);

  const recruiting = input.recruitingSignal
    ? { points: 15, reason: `The page says so: "${input.recruitingSignal.text.slice(0, 80)}".` }
    : { points: 0, reason: "No published statement about taking students." };

  const hasAi = matched.some((rule) => rule.rank === 1 || rule.rank === 3);
  const hasDomain = matched.some((rule) => rule.rank === 2 || rule.rank === 4);
  const crossover =
    hasAi && hasDomain
      ? {
          points: 10,
          reason: "Works across machine learning and Rami's geospatial or development ground.",
        }
      : {
          points: 0,
          reason: "No overlap between the machine-learning and geospatial or development sides.",
        };

  const funding =
    input.linkedProgramFunded === true
      ? { points: 10, reason: "A linked program funds international students." }
      : input.linkedProgramFunded === false
        ? { points: 0, reason: "The linked program does not fund international students." }
        : { points: 0, reason: "No funded program linked yet, so this cannot be scored." };

  const components: FitComponent[] = [
    { key: "topics", label: "Research overlap", max: MAX.topics, ...topics },
    { key: "activity", label: "Recent activity", max: MAX.activity, ...activity },
    { key: "recruiting", label: "Recruiting signal", max: MAX.recruiting, ...recruiting },
    { key: "crossover", label: "Crossover with Rami's ground", max: MAX.crossover, ...crossover },
    { key: "funding", label: "Funding", max: MAX.funding, ...funding },
  ];

  return {
    score: components.reduce((total, component) => total + component.points, 0),
    components,
    matchedInterests: matched.map((rule) => rule.factId),
  };
}
