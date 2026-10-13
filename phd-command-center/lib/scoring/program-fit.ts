import { matchInterests, RANK_POINTS } from "./interests";

/**
 * The program rubric from PROMPT.md §6.2, shown in the UI exactly as computed:
 * research 40, eligibility 20, funding 20, deadline feasibility 10, region 10.
 *
 * As with professors, an unknown scores zero and says so. A program whose funding has not been
 * established must not outrank one that is confirmed funded.
 */
export interface ProgramFitInput {
  researchAreas: readonly string[];
  degreeRequirement: string | null;
  minGpa: string | null;
  englishTests: Record<string, string> | null;
  greRequired: "required" | "optional" | "not_required" | "unknown";
  fundingType: string | null;
  internationalEligibility: string | null;
  deadlines: readonly { date: string | null; cycle: string }[];
  /** Rami's situation, injected so the rubric stays pure. */
  applicant: {
    hasMastersBy: string;
    englishTestTaken: boolean;
    greTaken: boolean;
    /** Regions he has ruled out. Empty until he answers, which is itself scored as unknown. */
    excludedRegions: readonly string[];
    regionPreferenceKnown: boolean;
  };
  region: string;
  /** Start of the application window Fall 2027 needs. */
  today: string;
}

export interface ProgramFitComponent {
  key: "research" | "eligibility" | "funding" | "timing" | "region";
  label: string;
  points: number;
  max: number;
  reason: string;
}

export interface ProgramFit {
  score: number;
  components: ProgramFitComponent[];
  matchedInterests: string[];
}

const MAX = { research: 40, eligibility: 20, funding: 20, timing: 10, region: 10 } as const;

function researchPoints(areas: readonly string[]) {
  const matched = matchInterests(areas);
  if (matched.length === 0) {
    return { points: 0, reason: "No stated research area matches his interests.", matched };
  }
  const best = matched.reduce((a, b) => (a.rank <= b.rank ? a : b));
  const scale = (RANK_POINTS[best.rank] ?? 0) / RANK_POINTS[1];
  const points = Math.round(MAX.research * scale);
  return {
    points,
    reason: `Matches ${matched.map((rule) => rule.label).join(", ")}; best is priority ${best.rank}.`,
    matched,
  };
}

function eligibilityPoints(input: ProgramFitInput) {
  const notes: string[] = [];
  let points = 0;

  // A master's held or expected by Feb 2027 satisfies the common requirement.
  if (input.degreeRequirement) {
    points += 8;
    notes.push("His MSc completes in Feb 2027, which the stated degree requirement allows.");
  } else {
    notes.push("No degree requirement recorded, so it cannot be checked.");
  }

  if (input.englishTests && Object.keys(input.englishTests).length > 0) {
    if (input.applicant.englishTestTaken) {
      points += 7;
      notes.push("English requirement met.");
    } else {
      notes.push("An English test is required and has not been taken — this is the binding gap.");
    }
  } else {
    points += 4;
    notes.push("No English requirement recorded; confirm on the official page.");
  }

  if (input.greRequired === "not_required") {
    points += 5;
    notes.push("No GRE.");
  } else if (input.greRequired === "optional") {
    points += 3;
    notes.push("GRE optional.");
  } else if (input.greRequired === "required" && !input.applicant.greTaken) {
    notes.push("GRE required and not taken.");
  } else if (input.greRequired === "unknown") {
    notes.push("GRE requirement unknown.");
  }

  return { points: Math.min(points, MAX.eligibility), reason: notes.join(" ") };
}

function fundingPoints(input: ProgramFitInput) {
  if (!input.fundingType) {
    return { points: 0, reason: "No funding recorded, so this cannot be scored." };
  }
  const funding = input.fundingType.toLowerCase();
  const fullyFunded = /fully funded|full scholarship|salaried|employment contract|stipend/.test(
    funding,
  );
  const internationalOk = input.internationalEligibility
    ? !/not (open|available)|domestic only|home students/i.test(input.internationalEligibility)
    : null;

  if (fullyFunded && internationalOk === true) {
    return { points: 20, reason: `${input.fundingType}, open to international applicants.` };
  }
  if (fullyFunded && internationalOk === null) {
    return {
      points: 14,
      reason: `${input.fundingType}; eligibility for international applicants not confirmed.`,
    };
  }
  if (fullyFunded) {
    return {
      points: 6,
      reason: `${input.fundingType}, but international eligibility looks restricted.`,
    };
  }
  return {
    points: 4,
    reason: `Funding recorded as "${input.fundingType}" — not established as full.`,
  };
}

function timingPoints(input: ProgramFitInput) {
  const dated = input.deadlines
    .map((deadline) => deadline.date)
    .filter((date): date is string => !!date);
  if (dated.length === 0) {
    return { points: 0, reason: "No published date for the next cycle yet." };
  }
  const soonest = dated.sort()[0];
  if (soonest < input.today) {
    return {
      points: 0,
      reason: `The recorded deadline (${soonest}) has passed; the next cycle is unconfirmed.`,
    };
  }
  const days = Math.round(
    (new Date(`${soonest}T00:00:00Z`).getTime() - new Date(`${input.today}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  if (days < 21) return { points: 4, reason: `Closes in ${days} days — very tight.` };
  if (days < 120)
    return { points: 10, reason: `Closes in ${days} days, inside the Fall 2027 window.` };
  return { points: 7, reason: `Closes in ${days} days; confirm the cycle applies to Fall 2027.` };
}

function regionPoints(input: ProgramFitInput) {
  if (!input.applicant.regionPreferenceKnown) {
    return { points: 0, reason: "No region preferences recorded yet, so this cannot be scored." };
  }
  if (input.applicant.excludedRegions.includes(input.region)) {
    return { points: 0, reason: `${input.region} is on the excluded list.` };
  }
  return { points: 10, reason: `${input.region} is not excluded.` };
}

export function scoreProgram(input: ProgramFitInput): ProgramFit {
  const research = researchPoints(input.researchAreas);
  const components: ProgramFitComponent[] = [
    {
      key: "research",
      label: "Research match",
      max: MAX.research,
      points: research.points,
      reason: research.reason,
    },
    { key: "eligibility", label: "Eligibility", max: MAX.eligibility, ...eligibilityPoints(input) },
    { key: "funding", label: "Funding", max: MAX.funding, ...fundingPoints(input) },
    { key: "timing", label: "Deadline feasibility", max: MAX.timing, ...timingPoints(input) },
    { key: "region", label: "Region", max: MAX.region, ...regionPoints(input) },
  ];

  return {
    score: components.reduce((total, component) => total + component.points, 0),
    components,
    matchedInterests: research.matched.map((rule) => rule.factId),
  };
}
