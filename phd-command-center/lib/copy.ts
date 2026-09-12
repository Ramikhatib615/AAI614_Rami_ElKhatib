/**
 * Site prose that is not a fact verbatim.
 *
 * Rule 2 allows selecting, reordering, shortening and rephrasing existing facts — never adding.
 * Every sentence here therefore declares the fact ids it was built from, and
 * `tests/unit/copy.test.ts` runs each one through the same integrity check that generated text
 * will face, so a sentence can never quietly outgrow its sources.
 */
export interface CopyEntry {
  id: string;
  text: string;
  factIds: string[];
}

export const siteCopy = {
  lede: {
    id: "copy.home.lede",
    text: "Surveying engineer by training, data scientist by practice, based in Beirut.",
    factIds: ["edu.bsc.liu.headline", "edu.msc.lau.headline", "identity.location"],
  },
  researchIntro: {
    id: "copy.research.intro",
    text: "Four interests, in the order I would rank them. What sits under each is work I have actually done.",
    factIds: [
      "interest.llm-nlp",
      "interest.geoai",
      "interest.applied-ml",
      "interest.ai-for-development",
    ],
  },
  researchStatus: {
    id: "copy.research.status",
    text: "I have no peer-reviewed publications yet. My MSc in Data Science runs to February 2027.",
    factIds: ["edu.msc.lau.headline"],
  },
  projectsIntro: {
    id: "copy.projects.intro",
    text: "Geospatial and public-sector data work, mostly with UN agencies in Lebanon.",
    factIds: ["exp.unhabitat.headline", "exp.escwa.headline"],
  },
  cvNote: {
    id: "copy.cv.note",
    text: "This page lists what has been confirmed. The PDF follows once the full CV is approved.",
    factIds: ["edu.msc.lau.headline"],
  },
} as const satisfies Record<string, CopyEntry>;

export const allCopyEntries: CopyEntry[] = Object.values(siteCopy);

/**
 * Interests are matched to evidence through the tags already on the facts, so nothing on the
 * research page is asserted — each interest simply shows the work that carries the matching tag.
 */
export const interestEvidenceTags: Record<string, string[]> = {
  "interest.llm-nlp": [],
  "interest.geoai": ["remote-sensing", "gis", "surveying"],
  "interest.applied-ml": ["python", "data-engineering", "bi", "statistics"],
  "interest.ai-for-development": ["research", "index-design", "data-collection"],
};
