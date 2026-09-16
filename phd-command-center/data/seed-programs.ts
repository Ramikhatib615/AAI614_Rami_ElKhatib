/**
 * Seed programs from PROMPT.md §7, compiled 11 September 2026.
 *
 * Every row ships `verificationStatus: "unverified"` with `lastVerifiedAt: null`, and is marked
 * `provenance: "prompt_seed"` to distinguish it from a record the extraction job fetched itself.
 * Most of these cite a cycle that has already closed, so nothing here may be treated as current
 * until the refresh job re-fetches the source and Rami marks it verified.
 */

export type AdmissionRoute =
  "central_program" | "direct_supervisor" | "cohort_cdt" | "employment_position";

export type GreRequirement = "required" | "optional" | "not_required" | "unknown";

export interface SourceRef {
  url: string;
  /** A short quote or summary, 25 words or fewer. */
  evidenceSnippet: string;
  fetchedAt: string | null;
}

export interface DeadlineRef {
  label: string;
  /** ISO date, or null when the next cycle has not been published. */
  date: string | null;
  timezone: string | null;
  cycle: string;
  note?: string;
}

export interface SeedProgram {
  slug: string;
  university: string;
  country: string;
  region: string;
  department: string | null;
  programName: string;
  degreeType: string;
  researchAreas: string[];
  admissionRoute: AdmissionRoute;
  degreeRequirement: string | null;
  minGpa: string | null;
  englishTests: Record<string, string> | null;
  greRequired: GreRequirement;
  documents: string[];
  interview: string | null;
  fundingType: string | null;
  stipend: string | null;
  internationalEligibility: string | null;
  deadlines: DeadlineRef[];
  startTerm: string | null;
  applicationUrl: string;
  sources: SourceRef[];
  provenance: "prompt_seed";
  notes: string | null;
}

export const seedPrograms: SeedProgram[] = [
  {
    slug: "ellis-institute-finland-doctoral",
    university: "ELLIS Institute Finland",
    country: "Finland",
    region: "Europe",
    department: null,
    programName: "Doctoral student positions",
    degreeType: "PhD",
    researchAreas: ["machine learning", "artificial intelligence"],
    admissionRoute: "employment_position",
    degreeRequirement:
      "Master's held or expected soon in CS, statistics, electrical engineering, mathematics or a related field",
    minGpa: null,
    englishTests: null,
    greRequired: "unknown",
    documents: [
      "Cover letter (max 2 pages)",
      "CV",
      "BSc and MSc transcripts",
      "Degree certificate or completion plan",
      "2–3 senior referees",
    ],
    interview: null,
    fundingType: "Fully funded salaried position",
    stipend: "Salaried four-year contract (amount not stated in the seed)",
    internationalEligibility: "Open to international applicants",
    deadlines: [
      {
        label: "Application deadline",
        date: "2026-09-21",
        timezone: "EEST",
        cycle: "Autumn 2026 recruit",
        note: "23:59 EEST. Ten days after this seed was compiled — verify before relying on it.",
      },
    ],
    startTerm: null,
    applicationUrl: "https://www.ellisinstitute.fi/postdoc-and-phd-recruit-autumn-2026",
    sources: [
      {
        url: "https://www.ellisinstitute.fi/postdoc-and-phd-recruit-autumn-2026",
        evidenceSnippet:
          "Autumn 2026 postdoc and PhD recruit: fully funded salaried four-year doctoral contracts.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes:
      "Accepts a master's expected soon, which fits a Feb 2027 completion. The nearest live deadline on the list.",
  },
  {
    slug: "ellis-phd-program-central",
    university: "ELLIS (multi-institution)",
    country: "Multiple",
    region: "Europe",
    department: null,
    programName: "ELLIS PhD Program (central call)",
    degreeType: "PhD",
    researchAreas: ["machine learning", "artificial intelligence"],
    admissionRoute: "central_program",
    degreeRequirement: "Master's or equivalent, applied through the central portal",
    minGpa: null,
    englishTests: null,
    greRequired: "unknown",
    documents: [
      "Portal application",
      "Two-page motivational letter with research statement",
      "Referees via portal",
    ],
    interview: null,
    fundingType: "Funded through the advisor's institution; ELLIS itself provides no funding",
    stipend: null,
    internationalEligibility: "Open to international applicants",
    deadlines: [
      {
        label: "Central call",
        date: null,
        timezone: null,
        cycle: "expected Oct–Nov 2026",
        note: "Last known cycle closed 31 Oct 2025. The next call had not been published when this seed was compiled.",
      },
    ],
    startTerm: null,
    applicationUrl: "https://ellis.eu/news/ellis-phd-program-call-for-applications-2025",
    sources: [
      {
        url: "https://ellis.eu/news/ellis-phd-program-call-for-applications-2025",
        evidenceSnippet:
          "Joint supervision with an exchange of at least six months; two-page motivational letter required.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes:
      "Requires identifying ELLIS advisors first, which makes the professor finder the prerequisite.",
  },
  {
    slug: "imprs-is",
    university: "Max Planck Institute for Intelligent Systems",
    country: "Germany",
    region: "Europe",
    department: "IMPRS for Intelligent Systems (Stuttgart / Tübingen)",
    programName: "IMPRS-IS doctoral program",
    degreeType: "PhD",
    researchAreas: ["machine learning", "computer vision", "robotics"],
    admissionRoute: "central_program",
    degreeRequirement:
      "Master's in engineering, computer science, mathematics, physics or a related field",
    minGpa: null,
    englishTests: { proof: "English proficiency proof required" },
    greRequired: "optional",
    documents: [
      "CV",
      "Transcripts",
      "Two-page motivation letter",
      "Three referees",
      "English proof",
    ],
    interview: null,
    fundingType: "Employment contract, initially three years",
    stipend: "Employment contract (amount not stated in the seed)",
    internationalEligibility: "Open to international applicants",
    deadlines: [
      {
        label: "Application deadline",
        date: null,
        timezone: null,
        cycle: "confirm current cycle",
        note: "Last known date was 15 Nov 2024 — two cycles stale.",
      },
    ],
    startTerm: null,
    applicationUrl: "https://imprs.is.mpg.de/application",
    sources: [
      {
        url: "https://imprs.is.mpg.de/application",
        evidenceSnippet:
          "Doctoral researchers receive an employment contract, initially for three years.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes: null,
  },
  {
    slug: "ukri-ai-cdt",
    university: "UKRI AI Centres for Doctoral Training",
    country: "United Kingdom",
    region: "UK",
    department: null,
    programName: "UKRI AI CDTs (multiple host universities)",
    degreeType: "PhD",
    researchAreas: ["artificial intelligence", "machine learning"],
    admissionRoute: "cohort_cdt",
    degreeRequirement: "First or 2:1 bachelor's degree, or a relevant master's",
    minGpa: null,
    englishTests: null,
    greRequired: "not_required",
    documents: [],
    interview: null,
    fundingType: "UKRI studentship: stipend plus fees",
    stipend: "UKRI stipend (rate varies by year and CDT)",
    internationalEligibility:
      "International studentships are limited; fee coverage varies by CDT — check each one",
    deadlines: [
      {
        label: "Varies by CDT",
        date: null,
        timezone: null,
        cycle: "2027 entry",
        note: "Each CDT runs its own timetable; Surrey's was expected to open in Dec 2026.",
      },
    ],
    startTerm: null,
    applicationUrl:
      "https://www.ukri.org/who-we-are/our-vision-and-strategy/tomorrows-technologies/how-we-work-in-ai/ukri-artificial-intelligence-centres-for-doctoral-training/",
    sources: [
      {
        url: "https://www.ukri.org/who-we-are/our-vision-and-strategy/tomorrows-technologies/how-we-work-in-ai/ukri-artificial-intelligence-centres-for-doctoral-training/",
        evidenceSnippet: "UKRI funds AI Centres for Doctoral Training across UK universities.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes:
      "This is an umbrella, not a single program. The discovery job should expand it into individual CDTs with their own deadlines.",
  },
  {
    slug: "cmu-machine-learning-phd",
    university: "Carnegie Mellon University",
    country: "United States",
    region: "US",
    department: "Machine Learning Department",
    programName: "PhD in Machine Learning",
    degreeType: "PhD",
    researchAreas: ["machine learning"],
    admissionRoute: "central_program",
    degreeRequirement: "Bachelor's; master's not required",
    minGpa: null,
    englishTests: {
      TOEFL: "required for non-native speakers",
      IELTS: "required for non-native speakers",
      Duolingo: "accepted",
    },
    greRequired: "optional",
    documents: ["Transcripts", "Statement of purpose", "Letters of recommendation"],
    interview: null,
    fundingType: "Typically funded",
    stipend: null,
    internationalEligibility: "Open to international applicants; no English test waivers",
    deadlines: [
      {
        label: "Application deadline",
        date: null,
        timezone: null,
        cycle: "Fall 2027 entry",
        note: "Usually early-to-mid December of the preceding year, so around Dec 2026.",
      },
    ],
    startTerm: "Fall",
    applicationUrl: "https://ml.cmu.edu/academics/machine-learning-phd",
    sources: [
      {
        url: "https://ml.cmu.edu/academics/machine-learning-phd",
        evidenceSnippet:
          "TOEFL, IELTS or Duolingo required for non-native English speakers, with no waivers.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes: "Listed in the brief as a representative US program rather than a researched match.",
  },
  {
    slug: "mila-supervision",
    university: "Mila (Université de Montréal, McGill, Polytechnique)",
    country: "Canada",
    region: "Canada",
    department: null,
    programName: "PhD through a Mila supervisor",
    degreeType: "PhD",
    researchAreas: ["machine learning", "deep learning"],
    admissionRoute: "direct_supervisor",
    degreeRequirement: "PhD normally entered after a master's",
    minGpa: null,
    englishTests: null,
    greRequired: "not_required",
    documents: ["Supervision request", "Parallel university application"],
    interview: null,
    fundingType: "Through the supervisor and host university",
    stipend: null,
    internationalEligibility: "Open to international applicants; no French exam at UdeM DIRO",
    deadlines: [
      {
        label: "Supervision request window",
        date: null,
        timezone: null,
        cycle: "2027 entry",
        note: "Brief states 15 Oct – 1 Dec 2026.",
      },
    ],
    startTerm: null,
    applicationUrl:
      "https://mila.quebec/en/prospective-students-and-postdocs/research-programs/request-supervisor",
    sources: [
      {
        url: "https://mila.quebec/en/prospective-students-and-postdocs/research-programs/request-supervisor",
        evidenceSnippet:
          "Applicants request a supervisor and apply to the host university in parallel.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes: "Two-step route: the supervisor request comes first, so outreach drives this one.",
  },
  {
    slug: "mbzuai-phd",
    university: "Mohamed bin Zayed University of Artificial Intelligence",
    country: "United Arab Emirates",
    region: "Gulf/MENA",
    department: null,
    programName: "PhD programs",
    degreeType: "PhD",
    researchAreas: ["machine learning", "computer vision", "natural language processing"],
    admissionRoute: "central_program",
    degreeRequirement: "STEM bachelor's and master's",
    minGpa: "3.0–3.5 depending on the program",
    englishTests: { certificate: "English certificate required" },
    greRequired: "unknown",
    documents: [
      "Research statement",
      "Statement of purpose",
      "At least three referees",
      "English certificate",
    ],
    interview: "Screening exam and interview",
    fundingType: "Full scholarship for admitted full-time students",
    stipend: "Full scholarship (monthly stipend amount not stated in the seed)",
    internationalEligibility: "Open to international applicants",
    deadlines: [
      {
        label: "Priority round",
        date: null,
        timezone: null,
        cycle: "confirm current cycle",
        note: "Last known cycle: priority 15 Nov 2025, final 15 Dec 2025.",
      },
    ],
    startTerm: null,
    applicationUrl: "https://mbzuai.ac.ae/study/graduate-admission-process/",
    sources: [
      {
        url: "https://mbzuai.ac.ae/study/graduate-admission-process/",
        evidenceSnippet:
          "Admitted full-time students receive a full scholarship; screening exam and interview required.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes:
      "GRE requirement was reported as conflicting in the brief — resolve it on the official page.",
  },
  {
    slug: "aub-ece-phd",
    university: "American University of Beirut",
    country: "Lebanon",
    region: "Gulf/MENA",
    department: "Electrical & Computer Engineering",
    programName: "PhD in Electrical & Computer Engineering",
    degreeType: "PhD",
    researchAreas: ["electrical engineering", "computer engineering"],
    admissionRoute: "central_program",
    degreeRequirement: "Master's in ECE or a related field, average of at least 85 (3.7)",
    minGpa: "85 / 3.7",
    englishTests: null,
    greRequired: "required",
    documents: [
      "Transcripts",
      "GRE",
      "Statement of purpose",
      "Three letters of recommendation",
      "Portfolio",
    ],
    interview: "Interview required",
    fundingType: null,
    stipend: null,
    internationalEligibility: null,
    deadlines: [
      {
        label: "See AUB Graduate Council",
        date: null,
        timezone: null,
        cycle: "confirm current cycle",
      },
    ],
    startTerm: null,
    applicationUrl: "https://www.aub.edu.lb/msfea/ece/ECE-PHD/Pages/admissions.aspx",
    sources: [
      {
        url: "https://www.aub.edu.lb/msfea/ece/ECE-PHD/Pages/admissions.aspx",
        evidenceSnippet:
          "Graduation requires one journal paper and two conference papers; GRE, portfolio and interview required.",
        fetchedAt: null,
      },
    ],
    provenance: "prompt_seed",
    notes:
      "Rami already works at AUB, so this is the local fallback. Funding must be confirmed with the department.",
  },
];
