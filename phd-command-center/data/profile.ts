/**
 * The one and only source of facts about Rami (PROMPT.md §2, CLAUDE.md integrity rule 1).
 *
 * Every fact has a stable `id`. Generated text — a CV bullet, a website sentence, an outreach
 * email — must cite the ids it used, and `lib/integrity` re-checks those ids server-side before
 * anything is exported or published.
 *
 * Rules for editing this file:
 *  - Never add a fact that is not supported by Rami's own record. If a claim needs checking, add
 *    it with `status: "needs_confirmation"` and a `note` saying exactly what to check.
 *  - Never write a sensitive value here. Declare it with `valueFrom` and keep the value in the
 *    environment (see CLAUDE.md "Private data").
 *  - Never delete an id that has been used; mark it `retired: true` instead, so old generated
 *    text can still be traced.
 */

import { PRIVATE_PROFILE_KEYS, type PrivateProfileKey } from "@/lib/env";

export type Visibility = "public" | "private";
export type FactStatus = "confirmed" | "needs_confirmation";
export type EmploymentType = "full_time" | "part_time" | "unknown";

export type FactKind =
  | "identity"
  | "positioning"
  | "interest"
  | "education"
  | "experience"
  | "project"
  | "skill"
  | "certification"
  | "language"
  | "service"
  | "gap";

/** A quantitative claim and whether anything backs it up. */
export interface MetricClaim {
  claim: string;
  evidence: string | null;
}

export interface Fact {
  id: string;
  kind: FactKind;
  /** The canonical sentence. A generator may shorten or rephrase it, never extend it. */
  text: string;
  visibility: Visibility;
  status: FactStatus;
  /** What to confirm, or the caveat a reader should know. */
  note?: string;
  /** Where this can be checked: a URL, a document, or a person. */
  evidence?: string;
  metrics?: MetricClaim[];
  tags?: string[];
  /** Sensitive values live in the environment, not in git. */
  valueFrom?: PrivateProfileKey;
  retired?: boolean;
}

export interface EducationRecord {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  /** YYYY-MM */
  start: string;
  /** YYYY-MM, or null while in progress. */
  end: string | null;
  headline: Fact;
  details: Fact[];
}

export interface ExperienceRecord {
  id: string;
  organization: string;
  unit?: string;
  role: string;
  location: string;
  start: string;
  end: string | null;
  employmentType: EmploymentType;
  headline: Fact;
  bullets: Fact[];
}

export interface ProjectLink {
  label: string;
  url: string;
  status: FactStatus;
}

export type ProjectEmphasis = "machine-learning" | "geospatial" | "policy";

export interface ProjectRecord {
  id: string;
  name: string;
  context: string;
  year: string;
  /** Drives ordering: machine-learning work leads, since that is what the PhD is for. */
  emphasis: ProjectEmphasis;
  tools: string[];
  headline: Fact;
  details: Fact[];
  links: ProjectLink[];
}

/** A question only Rami can answer, mirrored from docs/plan/open-questions.md. */
export interface OpenConfirmation {
  id: string;
  question: string;
  /**
   * Facts that cannot ship until this is answered — every id here must be `needs_confirmation`,
   * and a test enforces it. A question that would *add* a fact rather than release one lists
   * nothing, or the dashboard shows a resolved item as still open.
   */
  blocks: string[];
}

export interface Profile {
  identity: Fact[];
  positioning: Fact[];
  interests: Fact[];
  education: EducationRecord[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  skills: Fact[];
  certifications: Fact[];
  languages: Fact[];
  service: Fact[];
  gaps: Fact[];
  openConfirmations: OpenConfirmation[];
}

const CONFIRM_PERMANENT_EMAIL =
  "The LAU address may stop working after graduation in Feb 2027, after replies would arrive. Confirm a permanent address before it is published or used in outreach.";

export const profile: Profile = {
  identity: [
    {
      id: "identity.name",
      kind: "identity",
      text: "Rami El Khatib",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "identity.location",
      kind: "identity",
      text: "Based in Beirut, Lebanon.",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "identity.email.lau",
      kind: "identity",
      text: "ramielkhatib02@lau.edu",
      visibility: "private",
      status: "needs_confirmation",
      note: CONFIRM_PERMANENT_EMAIL,
      tags: ["contact"],
    },
    {
      id: "identity.phone",
      kind: "identity",
      text: "Phone number (withheld)",
      visibility: "private",
      status: "confirmed",
      valueFrom: "PROFILE_PHONE",
      note: "Never published. Resolved from the environment so it is not stored in git.",
      tags: ["contact"],
    },
    {
      id: "identity.target",
      kind: "identity",
      text: "Applying for a fully funded PhD in AI and machine learning, starting Fall 2027.",
      visibility: "public",
      status: "confirmed",
    },
  ],

  positioning: [
    {
      id: "positioning.surveying-to-modelling",
      kind: "positioning",
      text: "A surveying engineer and data scientist who moved from measuring the physical world to modelling it, combining geospatial data, public-sector analytics at the UN, and machine learning.",
      visibility: "public",
      status: "needs_confirmation",
      note: "PROMPT.md §2.2 offers this as a positioning idea for review. Approve or rewrite it before it appears on the site — it is the first sentence every professor will read.",
    },
  ],

  interests: [
    {
      id: "interest.llm-nlp",
      kind: "interest",
      text: "Large language models and natural language processing.",
      visibility: "public",
      status: "confirmed",
      note: "Stated priority 1. See gap.nlp-portfolio: there is no NLP work in the record yet.",
      tags: ["rank:1"],
    },
    {
      id: "interest.geoai",
      kind: "interest",
      text: "GeoAI and remote sensing: learning from satellite imagery and spatial data.",
      visibility: "public",
      status: "confirmed",
      tags: ["rank:2"],
    },
    {
      id: "interest.applied-ml",
      kind: "interest",
      text: "Applied machine learning and data science on messy, real-world data.",
      visibility: "public",
      status: "confirmed",
      tags: ["rank:3"],
    },
    {
      id: "interest.ai-for-development",
      kind: "interest",
      text: "AI for humanitarian and development work.",
      visibility: "public",
      status: "confirmed",
      tags: ["rank:4"],
    },
  ],

  education: [
    {
      id: "edu.msc.lau",
      institution: "Lebanese American University",
      degree: "M.Sc.",
      field: "Data Science",
      location: "Lebanon",
      start: "2025-02",
      end: "2027-02",
      headline: {
        id: "edu.msc.lau.headline",
        kind: "education",
        text: "M.Sc. in Data Science, Lebanese American University, Feb 2025 – Feb 2027 (in progress).",
        visibility: "public",
        status: "confirmed",
      },
      details: [
        {
          id: "edu.msc.lau.gpa",
          kind: "education",
          text: "GPA in the 3.8–4.0 range.",
          visibility: "private",
          status: "needs_confirmation",
          note: "Confirm the exact GPA and whether it may be shown publicly. Several programs set a minimum (MBZUAI 3.0–3.5, AUB ECE ≥85/3.7), so the exact number matters.",
        },
        {
          id: "edu.msc.lau.thesis",
          kind: "education",
          text: "Thesis or capstone project (title and advisor to be confirmed).",
          visibility: "public",
          status: "needs_confirmation",
          note: "Confirm title, advisor, and expected completion date. The advisor is the likely first referee.",
        },
      ],
    },
    {
      id: "edu.bsc.liu",
      institution: "Lebanese International University",
      degree: "B.Sc.",
      field: "Surveying Engineering",
      location: "Lebanon",
      start: "2019-09",
      end: "2023-06",
      headline: {
        id: "edu.bsc.liu.headline",
        kind: "education",
        text: "B.Sc. in Surveying Engineering, Lebanese International University, Sep 2019 – Jun 2023.",
        visibility: "public",
        status: "confirmed",
      },
      details: [],
    },
  ],

  experience: [
    {
      id: "exp.aub",
      organization: "American University of Beirut",
      unit: "Financial & Administrative Support Unit",
      role: "Data Scientist & Contract Officer",
      location: "Beirut, Lebanon",
      start: "2025-11",
      end: null,
      employmentType: "full_time",
      headline: {
        id: "exp.aub.headline",
        kind: "experience",
        text: "Data Scientist & Contract Officer, American University of Beirut, Financial & Administrative Support Unit, Nov 2025 – present.",
        visibility: "public",
        status: "needs_confirmation",
        note: "Confirm the official title exactly as AUB HR records it. A title that does not match HR is the kind of thing a reference check surfaces.",
      },
      bullets: [
        {
          id: "exp.aub.b1",
          kind: "experience",
          text: "Built Power BI dashboards tracking more than 100 research personnel, including research associates, research assistants, and academic staff, reducing manual reporting effort by about 40 percent.",
          visibility: "public",
          status: "needs_confirmation",
          note: "The 40 percent figure has no cited basis. Provide the before/after (hours per reporting cycle) or drop the number and keep the mechanism.",
          metrics: [{ claim: "~40% reduction in manual reporting effort", evidence: null }],
          tags: ["bi", "data"],
        },
        {
          id: "exp.aub.b2",
          kind: "experience",
          text: "Built data pipelines for personnel records management aligned with AUB data governance and audit standards.",
          visibility: "public",
          status: "confirmed",
          tags: ["data-engineering"],
        },
        {
          id: "exp.aub.b2-metric",
          kind: "experience",
          text: "Maintained 100 percent data accuracy in personnel records.",
          visibility: "public",
          status: "needs_confirmation",
          note: "Weakest of the three metrics: unfalsifiable as written. If an audit or reconciliation backs it, name that basis; otherwise recommend removing it.",
          metrics: [{ claim: "100% data accuracy", evidence: null }],
        },
        {
          id: "exp.aub.b3",
          kind: "experience",
          text: "Improved time-reporting and attendance workflows in People365 for more than 100 staff.",
          visibility: "public",
          status: "confirmed",
        },
        {
          id: "exp.aub.b4",
          kind: "experience",
          text: "Designed automated academic recruitment tracking covering contracts, renewals, and staffing cycles.",
          visibility: "public",
          status: "confirmed",
        },
        {
          id: "exp.aub.b5",
          kind: "experience",
          text: "Produced analytical reports and visualisations for senior administrators.",
          visibility: "public",
          status: "confirmed",
        },
        {
          id: "exp.aub.b6",
          kind: "experience",
          text: "Coordinated faculty, HR, and finance units to resolve data discrepancies.",
          visibility: "public",
          status: "confirmed",
        },
      ],
    },
    {
      id: "exp.escwa",
      organization: "United Nations ESCWA",
      role: "Data Analyst",
      location: "Beirut, Lebanon",
      start: "2024-10",
      end: "2025-10",
      employmentType: "full_time",
      headline: {
        id: "exp.escwa.headline",
        kind: "experience",
        text: "Data Analyst, United Nations ESCWA, Oct 2024 – Oct 2025.",
        visibility: "public",
        status: "confirmed",
      },
      bullets: [
        {
          id: "exp.escwa.b1",
          kind: "experience",
          text: "Co-developed the Public Administration Index, a governance measurement framework assessing public-sector performance across more than 20 Arab member states, covering digital transformation, governance effectiveness, and social equity.",
          visibility: "public",
          status: "confirmed",
          tags: ["research", "index-design"],
        },
        {
          id: "exp.escwa.b2",
          kind: "experience",
          text: "Authored the Public Administration Index project document, aligning the instrument with SDG 16 and digital governance targets.",
          visibility: "public",
          status: "confirmed",
          note: "Confirm whether this document is public and citable. If it is, it belongs in a research-outputs section, which would partly answer the 'no publications' gap.",
          tags: ["research", "writing"],
        },
        {
          id: "exp.escwa.b3",
          kind: "experience",
          text: "Ran data collection, statistical analysis, and visualisation, producing policy briefs and analytical reports for UN senior management and member-state delegations.",
          visibility: "public",
          status: "confirmed",
          tags: ["statistics"],
        },
        {
          id: "exp.escwa.b4",
          kind: "experience",
          text: "Contributed to digital transformation advisory work with a cross-cutting focus on gender equality and women's empowerment in digital ecosystems.",
          visibility: "public",
          status: "confirmed",
        },
        {
          id: "exp.escwa.b5",
          kind: "experience",
          text: "Integrated multi-source data for the Amman project across dispersed teams.",
          visibility: "public",
          status: "confirmed",
        },
      ],
    },
    {
      id: "exp.unhabitat",
      organization: "UN-Habitat",
      role: "GIS & Information Management Specialist",
      location: "Beirut, Lebanon",
      start: "2024-06",
      end: "2024-10",
      employmentType: "full_time",
      headline: {
        id: "exp.unhabitat.headline",
        kind: "experience",
        text: "GIS & Information Management Specialist, UN-Habitat, Jun 2024 – Oct 2024.",
        visibility: "public",
        status: "confirmed",
      },
      bullets: [
        {
          id: "exp.unhabitat.b1",
          kind: "experience",
          text: "Built ArcGIS Online web maps and dashboards covering more than 8,000 locations across Lebanon with the Global Land Tool Network.",
          visibility: "public",
          status: "confirmed",
          tags: ["gis"],
        },
        {
          id: "exp.unhabitat.b2",
          kind: "experience",
          text: "Designed field survey instruments in Kobo Toolbox and Survey123.",
          visibility: "public",
          status: "confirmed",
          tags: ["gis", "data-collection"],
        },
        {
          id: "exp.unhabitat.b3",
          kind: "experience",
          text: "Worked on the STDM/GIZ Phase 3 land tenure project: georeferencing satellite imagery, resolving raster gaps, and validating data weekly.",
          visibility: "public",
          status: "confirmed",
          tags: ["remote-sensing", "gis"],
        },
        {
          id: "exp.unhabitat.b4",
          kind: "experience",
          text: "Produced neighbourhood profiles, land cover and land use maps, and urban farming spatial analyses.",
          visibility: "public",
          status: "confirmed",
          tags: ["remote-sensing"],
        },
        {
          id: "exp.unhabitat.b5",
          kind: "experience",
          text: "Reorganised ArcGIS Online storage to improve performance and data access.",
          visibility: "public",
          status: "confirmed",
        },
      ],
    },
    {
      id: "exp.destination",
      organization: "Destination Trading & Contracting",
      role: "GIS Engineer & Data Scientist",
      location: "Mount Lebanon, Lebanon",
      start: "2023-12",
      end: "2024-06",
      employmentType: "full_time",
      headline: {
        id: "exp.destination.headline",
        kind: "experience",
        text: "GIS Engineer & Data Scientist, Destination Trading & Contracting, Dec 2023 – Jun 2024.",
        visibility: "public",
        status: "confirmed",
      },
      bullets: [
        {
          id: "exp.destination.b1",
          kind: "experience",
          text: "Automated geospatial data processing pipelines with Python and SQL.",
          visibility: "public",
          status: "confirmed",
          tags: ["python", "data-engineering"],
        },
        {
          id: "exp.destination.b2",
          kind: "experience",
          text: "Built Power BI and Tableau dashboards integrating satellite imagery, GPS telemetry, and statistical data.",
          visibility: "public",
          status: "confirmed",
          tags: ["bi", "remote-sensing"],
        },
        {
          id: "exp.destination.b3",
          kind: "experience",
          text: "Designed and managed geospatial databases for large infrastructure projects.",
          visibility: "public",
          status: "confirmed",
          tags: ["gis"],
        },
      ],
    },
    {
      id: "exp.navleb",
      organization: "NavLeb",
      role: "GIS & Geospatial Engineering Analyst",
      location: "Beirut, Lebanon",
      start: "2019-06",
      end: "2020-05",
      employmentType: "unknown",
      headline: {
        id: "exp.navleb.headline",
        kind: "experience",
        text: "GIS & Geospatial Engineering Analyst, NavLeb, Jun 2019 – May 2020.",
        visibility: "public",
        status: "needs_confirmation",
        note: "Starts three months before the B.Sc. began in Sep 2019 and overlaps the OMT role. Confirm the months and whether this was full-time.",
      },
      bullets: [
        {
          id: "exp.navleb.b1",
          kind: "experience",
          text: "Carried out field surveys and GPS/ArcGIS analysis, producing digital maps and spatial databases for infrastructure planning.",
          visibility: "public",
          status: "confirmed",
          tags: ["gis", "surveying"],
        },
        {
          id: "exp.navleb.b2",
          kind: "experience",
          text: "Delivered GIS training to colleagues.",
          visibility: "public",
          status: "confirmed",
          tags: ["teaching"],
        },
      ],
    },
    {
      id: "exp.omt",
      organization: "OMT & Western Union",
      role: "Senior Project Coordinator",
      location: "Hammana, Lebanon",
      start: "2018-09",
      end: "2024-04",
      employmentType: "unknown",
      headline: {
        id: "exp.omt.headline",
        kind: "experience",
        text: "Senior Project Coordinator, OMT & Western Union, Sep 2018 – Apr 2024.",
        visibility: "public",
        status: "needs_confirmation",
        note: "Overlaps the entire B.Sc., the NavLeb role (11 months), and the Destination role (5 months). Read literally it means two full-time jobs at once. Confirm part-time or concurrent status — the integrity checker blocks export until this is set.",
      },
      bullets: [
        {
          id: "exp.omt.b1",
          kind: "experience",
          text: "Coordinated financial and operational projects, producing performance reports and risk analyses for leadership.",
          visibility: "public",
          status: "confirmed",
        },
      ],
    },
  ],

  // Within an emphasis, this order is the order they appear in: the modelling study leads.
  projects: [
    {
      id: "proj.pa-index",
      name: "Public Administration Index",
      context: "UN ESCWA",
      year: "2024–2025",
      emphasis: "policy",
      tools: ["Python", "Excel", "Power BI"],
      headline: {
        id: "proj.pa-index.headline",
        kind: "project",
        text: "A multi-dimensional index measuring public-sector performance across more than 20 Arab states.",
        visibility: "public",
        status: "confirmed",
      },
      details: [
        {
          id: "proj.pa-index.d1",
          kind: "project",
          text: "Designed the indicator framework, collected and cleaned the underlying data, and produced the analysis behind the published briefs.",
          visibility: "public",
          status: "confirmed",
        },
      ],
      links: [],
    },
    {
      id: "proj.tour-in-sour",
      name: "A Tour in Sour",
      context: "UN-Habitat Sustainable Cities Initiative",
      year: "2024",
      emphasis: "geospatial",
      tools: ["ArcGIS Online", "Survey123"],
      headline: {
        id: "proj.tour-in-sour.headline",
        kind: "project",
        text: "ArcGIS Online web maps profiling more than 8,000 urban locations in Tyre.",
        visibility: "public",
        status: "confirmed",
      },
      details: [],
      links: [],
    },
    {
      id: "proj.neighbourhood-profiles",
      name: "Neighbourhood profiles of disadvantaged areas",
      context: "UN-Habitat",
      year: "2024",
      emphasis: "geospatial",
      tools: ["ArcGIS Pro", "Kobo Toolbox"],
      headline: {
        id: "proj.neighbourhood-profiles.headline",
        kind: "project",
        text: "Municipal data, field surveys, and satellite imagery combined into dashboards and written profiles.",
        visibility: "public",
        status: "confirmed",
      },
      details: [],
      links: [],
    },
    {
      id: "proj.stdm-giz",
      name: "STDM/GIZ Phase 3 land tenure mapping",
      context: "UN-Habitat with GIZ",
      year: "2024",
      emphasis: "geospatial",
      tools: ["ArcGIS Pro", "QGIS"],
      headline: {
        id: "proj.stdm-giz.headline",
        kind: "project",
        text: "Georeferencing, spatial database optimisation, and weekly validation for a land tenure mapping programme.",
        visibility: "public",
        status: "confirmed",
      },
      details: [],
      links: [],
    },
    {
      id: "proj.civil-defense",
      name: "Civil defense location optimisation",
      context: "Academic project",
      year: "2023",
      emphasis: "geospatial",
      tools: ["ArcGIS Pro", "Network Analyst"],
      headline: {
        id: "proj.civil-defense.headline",
        kind: "project",
        text: "Network analysis and coverage modelling to site emergency response stations.",
        visibility: "public",
        status: "confirmed",
      },
      details: [],
      links: [],
    },
    {
      id: "proj.fraud-detection",
      name: "Fraud detection on imbalanced transaction data",
      context: "MSc coursework, Lebanese American University",
      year: "2026",
      emphasis: "machine-learning",
      tools: ["Python", "scikit-learn", "Pandas", "Matplotlib"],
      headline: {
        id: "proj.fraud-detection.headline",
        kind: "project",
        text: "An end-to-end study on 284,807 card transactions, of which 0.17 percent are fraudulent, comparing unsupervised anomaly detection with supervised classification under delayed-label and cost-sensitive constraints.",
        visibility: "public",
        status: "confirmed",
        note: "Coursework, and labelled as such wherever it appears.",
        evidence:
          "https://github.com/Ramikhatib615/AAI614_Rami_ElKhatib — End_to_End_Credit_Card_Fraud_Detection_Unsupervised_and_Supervised_Learning_on_Imbalanced_Data.ipynb",
        tags: ["machine-learning", "python", "statistics"],
      },
      details: [
        {
          id: "proj.fraud-detection.d1",
          kind: "project",
          text: "Set a rule-based baseline that flagged the top one percent of transaction amounts; it recovered 2.8 percent of fraud, establishing that magnitude alone is not a signal.",
          visibility: "public",
          status: "confirmed",
          metrics: [
            { claim: "baseline recall 0.028", evidence: "Notebook classification report." },
          ],
          evidence: "Notebook cell output: baseline classification report.",
          tags: ["machine-learning"],
        },
        {
          id: "proj.fraud-detection.d2",
          kind: "project",
          text: "An Isolation Forest trained without labels reached 0.26 recall at 0.22 precision, average precision 0.11 — the signal available when fraud labels have not arrived yet.",
          visibility: "public",
          status: "confirmed",
          metrics: [
            {
              claim: "recall 0.261, precision 0.222, AP 0.108",
              evidence: "Notebook model comparison table.",
            },
          ],
          evidence: "Notebook cell output: model comparison table.",
          tags: ["machine-learning"],
        },
        {
          id: "proj.fraud-detection.d3",
          kind: "project",
          text: "Class-weighted logistic regression reached 0.89 recall at 0.05 precision, average precision 0.69, trading a heavy false-positive load for missing few frauds.",
          visibility: "public",
          status: "confirmed",
          metrics: [
            {
              claim: "recall 0.887, precision 0.053, AP 0.688",
              evidence: "Notebook classification report.",
            },
          ],
          evidence: "Notebook cell output: supervised logistic regression results.",
          tags: ["machine-learning", "statistics"],
        },
        {
          id: "proj.fraud-detection.d4",
          kind: "project",
          text: "A random forest reached 0.96 precision at 0.71 recall, F1 0.82, the strongest balance of the three models.",
          visibility: "public",
          status: "confirmed",
          metrics: [
            {
              claim: "precision 0.962, recall 0.711, F1 0.818",
              evidence: "Notebook classification report.",
            },
          ],
          evidence: "Notebook cell output: random forest results.",
          tags: ["machine-learning"],
        },
        {
          id: "proj.fraud-detection.d5",
          kind: "project",
          text: "Selecting the decision threshold on the precision–recall curve rather than accepting 0.5 moved logistic regression to F1 0.81, and Platt calibration made its probabilities usable for cost-based decisions.",
          visibility: "public",
          status: "confirmed",
          metrics: [
            {
              claim: "tuned F1 0.807 at precision 0.852 and recall 0.768; calibrated AP 0.689",
              evidence: "Notebook cell outputs: threshold optimisation and calibration.",
            },
          ],
          evidence: "Notebook cell outputs: threshold optimisation and model calibration.",
          tags: ["machine-learning", "statistics"],
        },
        {
          id: "proj.fraud-detection.d6",
          kind: "project",
          text: "Removed 1,081 duplicate transactions before splitting and stratified the split, so the 473 remaining fraud cases stayed represented in both halves.",
          visibility: "public",
          status: "confirmed",
          evidence: "Notebook cell outputs: duplicate removal and class counts.",
          tags: ["machine-learning", "data-engineering"],
        },
      ],
      links: [
        {
          label: "Notebook: end-to-end fraud detection",
          url: "https://github.com/Ramikhatib615/AAI614_Rami_ElKhatib/blob/main/End_to_End_Credit_Card_Fraud_Detection_Unsupervised_and_Supervised_Learning_on_Imbalanced_Data.ipynb",
          status: "confirmed",
        },
      ],
    },
    {
      id: "proj.lulc",
      name: "Land cover and land use mapping, South Lebanon",
      context: "UN-Habitat urban farming initiative",
      year: "2024",
      emphasis: "machine-learning",
      tools: ["Landsat 8", "ArcGIS Pro", "Supervised classification"],
      headline: {
        id: "proj.lulc.headline",
        kind: "project",
        text: "A supervised classification of 2024 Landsat 8 imagery across the South Lebanon Governorate into eight land cover and land use classes.",
        visibility: "public",
        status: "confirmed",
        evidence:
          "https://github.com/Ramikhatib615/land-use-land-cover-mapping-south-Lebanon-2024 — methodology document, classified outputs, and area analysis",
        tags: ["remote-sensing", "machine-learning", "gis"],
      },
      details: [
        {
          id: "proj.lulc.d1",
          kind: "project",
          text: "Classified urban areas, agricultural units, field crops, permanent crops, artificial vegetation, wooded land, bare soil, and water bodies from training samples drawn on clipped imagery.",
          visibility: "public",
          status: "confirmed",
          evidence: "Repository methodology document and classified outputs.",
          tags: ["remote-sensing", "machine-learning"],
        },
        {
          id: "proj.lulc.d2",
          kind: "project",
          text: "Converted the classified raster to vector and computed class areas, publishing the result as shapefiles, maps, and a tabulated area analysis.",
          visibility: "public",
          status: "confirmed",
          evidence: "Repository outputs: shapefiles, Excel area analysis, PDF maps, KML.",
          tags: ["remote-sensing", "gis"],
        },
      ],
      links: [
        {
          label: "Repository: land-use-land-cover-mapping-south-Lebanon-2024",
          url: "https://github.com/Ramikhatib615/land-use-land-cover-mapping-south-Lebanon-2024",
          status: "confirmed",
        },
      ],
    },
  ],

  skills: [
    {
      id: "skill.python",
      kind: "skill",
      text: "Python, including Pandas, NumPy, scikit-learn, and GeoPandas.",
      visibility: "public",
      status: "confirmed",
    },
    { id: "skill.sql", kind: "skill", text: "SQL", visibility: "public", status: "confirmed" },
    { id: "skill.r", kind: "skill", text: "R", visibility: "public", status: "confirmed" },
    {
      id: "skill.bi",
      kind: "skill",
      text: "Power BI, Tableau, ArcGIS Online dashboards, Matplotlib, and Plotly.",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "skill.geospatial",
      kind: "skill",
      text: "ArcGIS Pro, ArcGIS Online, QGIS, Survey123, Kobo Toolbox, and SWAT.",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "skill.data-engineering",
      kind: "skill",
      text: "ETL design, database architecture, data validation and cleaning, and People365.",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "skill.ml.imbalanced",
      kind: "skill",
      text: "Imbalanced classification: anomaly detection, class weighting, precision–recall analysis, threshold selection, and probability calibration.",
      visibility: "public",
      status: "confirmed",
      evidence: "Demonstrated in proj.fraud-detection.",
      tags: ["machine-learning"],
    },
    {
      id: "skill.ml",
      kind: "skill",
      text: "Machine learning, statistical modelling, spatial analysis, predictive analytics, and regression.",
      visibility: "public",
      status: "confirmed",
    },
  ],

  certifications: [
    {
      id: "cert.esri",
      kind: "certification",
      text: "ESRI ArcGIS certifications.",
      visibility: "public",
      status: "needs_confirmation",
      note: "Confirm the exact certificate names and dates. An academic CV lists them precisely or not at all.",
    },
    {
      id: "cert.linkedin-learning",
      kind: "certification",
      text: "LinkedIn Learning certificates.",
      visibility: "public",
      status: "needs_confirmation",
      note: "Confirm which ones. Recommend listing only those relevant to ML or data engineering, if any.",
    },
  ],

  languages: [
    {
      id: "lang.arabic",
      kind: "language",
      text: "Arabic (native)",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "lang.english",
      kind: "language",
      text: "English (full professional)",
      visibility: "public",
      status: "confirmed",
      note: "Self-assessed. Programs require a TOEFL or IELTS score, which is not yet booked — see gap.english-test.",
    },
    {
      id: "lang.french",
      kind: "language",
      text: "French (full professional)",
      visibility: "public",
      status: "confirmed",
    },
  ],

  service: [
    {
      id: "service.lrc.roles",
      kind: "service",
      text: "Lebanese Red Cross: emergency response team member and youth leader. Vice President of the Youth Department (2022–2023), Treasurer (2019–2021), and General Assembly member since 2018.",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "service.lrc.work",
      kind: "service",
      text: "Delivered psychological first aid, emergency logistics, and disaster risk reduction workshops across Beirut and Mount Lebanon.",
      visibility: "public",
      status: "confirmed",
    },
    {
      id: "service.scouts",
      kind: "service",
      text: "Scout leader.",
      visibility: "public",
      status: "confirmed",
    },
  ],

  gaps: [
    {
      id: "gap.publications",
      kind: "gap",
      text: "No peer-reviewed publications yet.",
      visibility: "private",
      status: "confirmed",
      note: "The ESCWA project document may be citable work — see exp.escwa.b2.",
    },
    {
      id: "gap.english-test",
      kind: "gap",
      text: "No TOEFL or IELTS score yet.",
      visibility: "private",
      status: "confirmed",
      note: "Binding constraint. Nearly every program on the seed list requires it, and Fall 2027 deadlines start in December 2026.",
    },
    {
      id: "gap.gre",
      kind: "gap",
      text: "No GRE score or test date.",
      visibility: "private",
      status: "confirmed",
      note: "Required by AUB ECE and used by several US programs.",
    },
    {
      id: "gap.nlp-portfolio",
      kind: "gap",
      text: "Little visible NLP or LLM work, although that is the stated first research priority.",
      visibility: "private",
      status: "confirmed",
      note: "Either lead with GeoAI, which the record supports strongly, or build one real NLP artefact before outreach.",
    },
    {
      id: "gap.referees",
      kind: "gap",
      text: "Referees not yet identified.",
      visibility: "private",
      status: "confirmed",
      note: "Three are needed by almost every program on the seed list.",
    },
  ],

  openConfirmations: [
    {
      id: "confirm.aub-title",
      question: "What is the official AUB job title exactly as HR records it?",
      blocks: ["exp.aub.headline"],
    },
    {
      id: "confirm.msc-gpa",
      question: "What is the exact MSc GPA, and may it appear publicly?",
      blocks: ["edu.msc.lau.gpa"],
    },
    {
      id: "confirm.msc-thesis",
      question: "What is the MSc thesis or capstone title, advisor, and completion date?",
      blocks: ["edu.msc.lau.thesis"],
    },
    {
      id: "confirm.permanent-email",
      question: "Which permanent email address should be used for outreach and on the site?",
      blocks: ["identity.email.lau"],
    },
    {
      id: "confirm.public-links",
      question:
        "What are the LinkedIn, GitHub, and ORCID URLs? (Create an ORCID if there is none.) This also confirms the land-cover repository link on proj.lulc.",
      blocks: [],
    },
    {
      id: "confirm.omt-employment-type",
      question: "Was the OMT & Western Union role part-time or concurrent with the other roles?",
      blocks: ["exp.omt.headline"],
    },
    {
      id: "confirm.years-of-experience",
      question:
        "How should years of data and GIS experience be stated? The roles sum to about four years with a 3.5-year gap, not the 5+ on the CV — so no such fact exists here yet.",
      blocks: [],
    },
    {
      id: "confirm.metrics-evidence",
      question:
        "What evidence backs the 40 percent reporting reduction and the 100 percent data accuracy, or may they be removed?",
      blocks: ["exp.aub.b1", "exp.aub.b2-metric"],
    },
    {
      id: "confirm.referees",
      question: "Who are the three referees (name, title, relationship)? Private, never published.",
      blocks: [],
    },
    {
      id: "confirm.english-gre",
      question: "When are the IELTS or TOEFL and, if needed, the GRE booked?",
      blocks: [],
    },
    {
      id: "confirm.research-outputs",
      question:
        "Are there preprints, UN reports, or theses that can be listed as research outputs? The ESCWA project document (exp.escwa.b2) is the likeliest candidate — is it public and citable?",
      // Nothing is blocked: answering this adds a research output, it does not release a held fact.
      blocks: [],
    },
    {
      id: "confirm.nlp-projects",
      question:
        "The machine-learning projects are confirmed and now lead the site and the CV. NLP is still the gap: is there any text work to show, or should the next two months produce one NLP artefact?",
      blocks: [],
    },
    {
      id: "confirm.constraints",
      question:
        "Which countries are excluded, what is the minimum stipend, and are there family or visa constraints?",
      blocks: [],
    },
    {
      id: "confirm.positioning",
      question: "Is the positioning sentence right, or should it be rewritten?",
      blocks: ["positioning.surveying-to-modelling"],
    },
  ],
};

/** Every fact in the profile, flattened. This is what generators and the integrity checker use. */
export function allFacts(source: Profile = profile): Fact[] {
  return [
    ...source.identity,
    ...source.positioning,
    ...source.interests,
    ...source.education.flatMap((record) => [record.headline, ...record.details]),
    ...source.experience.flatMap((record) => [record.headline, ...record.bullets]),
    ...source.projects.flatMap((record) => [record.headline, ...record.details]),
    ...source.skills,
    ...source.certifications,
    ...source.languages,
    ...source.service,
    ...source.gaps,
  ];
}

/** Facts that may appear on the public site: public AND confirmed (CLAUDE.md rule 8). */
export function publicFacts(source: Profile = profile): Fact[] {
  return allFacts(source).filter(
    (fact) => fact.visibility === "public" && fact.status === "confirmed" && !fact.retired,
  );
}

export function factById(id: string, source: Profile = profile): Fact | undefined {
  return allFacts(source).find((fact) => fact.id === id);
}

/** Ids referenced by `valueFrom`, for the env-key validity test. */
export function privateValueKeys(source: Profile = profile): PrivateProfileKey[] {
  return allFacts(source)
    .map((fact) => fact.valueFrom)
    .filter(
      (key): key is PrivateProfileKey => key !== undefined && PRIVATE_PROFILE_KEYS.includes(key),
    );
}
