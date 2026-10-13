/**
 * Keyword sets for Rami's ranked research interests (data/profile.ts). Matching is done on the
 * topic labels OpenAlex already assigns to a paper, so a match is evidence from the record rather
 * than a judgement the model made.
 */
export interface InterestRule {
  factId: string;
  rank: number;
  label: string;
  keywords: string[];
}

export const INTEREST_RULES: InterestRule[] = [
  {
    factId: "interest.llm-nlp",
    rank: 1,
    label: "Language models and NLP",
    keywords: [
      "language model",
      "natural language processing",
      "computational linguistics",
      "text mining",
      "machine translation",
      "information extraction",
      "question answering",
      "speech recognition",
      "sentiment analysis",
      "transformer",
    ],
  },
  {
    factId: "interest.geoai",
    rank: 2,
    label: "GeoAI and remote sensing",
    keywords: [
      "remote sensing",
      "geospatial",
      "satellite",
      "earth observation",
      "land cover",
      "land use",
      "geographic information",
      "spatial analysis",
      "urban planning",
      "cartography",
      "hyperspectral",
      "synthetic aperture radar",
    ],
  },
  {
    factId: "interest.applied-ml",
    rank: 3,
    label: "Applied machine learning",
    keywords: [
      "machine learning",
      "deep learning",
      "neural network",
      "anomaly detection",
      "imbalanced",
      "predictive model",
      "statistical learning",
      "computer vision",
      "data mining",
    ],
  },
  {
    factId: "interest.ai-for-development",
    rank: 4,
    label: "AI for humanitarian and development work",
    keywords: [
      "humanitarian",
      "development economics",
      "public policy",
      "governance",
      "poverty",
      "disaster",
      "crisis",
      "refugee",
      "sustainable development",
      "global health",
    ],
  },
];

/** Points for the best-matching interest, by rank — priority 1 is worth the most. */
export const RANK_POINTS: Record<number, number> = { 1: 50, 2: 42, 3: 34, 4: 28 };

export function matchInterests(topics: readonly string[]): InterestRule[] {
  const haystack = topics.map((topic) => topic.toLowerCase());
  return INTEREST_RULES.filter((rule) =>
    rule.keywords.some((keyword) => haystack.some((topic) => topic.includes(keyword))),
  );
}
