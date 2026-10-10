import {
  profile as defaultProfile,
  type EducationRecord,
  type ExperienceRecord,
  type Fact,
  type Profile,
  type ProjectRecord,
} from "@/data/profile";
import type { CvDocument, CvEntry, CvLine, CvSection } from "./types";

export interface MasterCvOptions {
  /**
   * When true, facts that still need confirmation are included. This projection is never
   * exported — it exists so the dashboard can diff it against the real CV and show exactly what
   * answering the open questions would add.
   */
  includeUnconfirmed?: boolean;
  /** Resolved sensitive values (see CLAUDE.md "Private data"). */
  privateValues?: Partial<Record<string, string>>;
  /** Private facts such as the GPA appear on the CV only when Rami asks for them. */
  includePrivate?: boolean;
}

function admits(fact: Fact, options: MasterCvOptions): boolean {
  if (fact.retired) return false;
  if (fact.status !== "confirmed" && !options.includeUnconfirmed) return false;
  if (fact.visibility === "private" && !options.includePrivate) return false;
  return true;
}

function monthLabel(value: string): string {
  const [year, month] = value.split("-");
  const name = new Date(Number(year), Number(month) - 1, 1).toLocaleString("en", {
    month: "short",
  });
  return `${name} ${year}`;
}

function range(start: string, end: string | null): string {
  return `${monthLabel(start)} – ${end ? monthLabel(end) : "present"}`;
}

function factLine(fact: Fact, value?: string): CvLine {
  return { id: fact.id, text: value ?? fact.text, factIds: [fact.id] };
}

function educationEntry(record: EducationRecord, options: MasterCvOptions): CvEntry {
  return {
    id: record.id,
    heading: `${record.degree} ${record.field}`,
    meta: `${record.institution} — ${range(record.start, record.end)}`,
    factIds: [record.headline.id],
    lines: record.details.filter((fact) => admits(fact, options)).map((fact) => factLine(fact)),
  };
}

function experienceEntry(record: ExperienceRecord, options: MasterCvOptions): CvEntry {
  const partTime = record.employmentType === "part_time" ? " (part-time)" : "";
  return {
    id: record.id,
    heading: `${record.role}, ${record.organization}${partTime}`,
    meta: `${range(record.start, record.end)} — ${record.location}`,
    factIds: [record.headline.id],
    // An academic CV keeps professional experience condensed: the research-relevant bullets only.
    lines: record.bullets
      .filter((fact) => admits(fact, options))
      .filter((fact) => (fact.tags?.length ?? 0) > 0)
      .slice(0, MAX_EXPERIENCE_BULLETS)
      .map((fact) => factLine(fact)),
  };
}

/**
 * The master CV is capped at two pages (PROMPT.md §6.5), so detail is spent where it earns the
 * most: the machine-learning work carries its findings, the rest carry one line each.
 */
const ML_DETAIL_LINES = 2;
const MAX_PROJECTS = 5;
const MAX_EXPERIENCE_BULLETS = 2;

function projectEntry(record: ProjectRecord, options: MasterCvOptions): CvEntry {
  const detailBudget = record.emphasis === "machine-learning" ? ML_DETAIL_LINES : 0;
  return {
    id: record.id,
    heading: record.name,
    meta: `${record.context}, ${record.year}${record.tools.length ? ` — ${record.tools.join(", ")}` : ""}`,
    factIds: [record.headline.id],
    lines: [
      factLine(record.headline),
      ...record.details
        .filter((fact) => admits(fact, options))
        .slice(0, detailBudget)
        .map((fact) => factLine(fact)),
    ],
  };
}

function listSection(
  id: string,
  heading: string,
  facts: Fact[],
  options: MasterCvOptions,
  /**
   * Short facts are joined into one paragraph that cites all of their ids — the usual academic CV
   * treatment for skills and languages, and it keeps the fact trail intact.
   */
  join = false,
): CvSection {
  const admitted = facts.filter((fact) => admits(fact, options));
  if (admitted.length === 0) return { id, heading, entries: [] };

  const lines: CvLine[] = join
    ? [
        {
          id: `${id}.joined`,
          text: admitted.map((fact) => fact.text.replace(/\.$/, "")).join("; ") + ".",
          factIds: admitted.map((fact) => fact.id),
        },
      ]
    : admitted.map((fact) => factLine(fact));

  return { id, heading, entries: [{ id: `${id}.all`, heading: "", factIds: [], lines }] };
}

/**
 * Builds the master academic CV in the order PROMPT.md §6.5 specifies, with machine-learning work
 * ahead of the geospatial work it grew out of.
 */
export function buildMasterCv(
  source: Profile = defaultProfile,
  options: MasterCvOptions = {},
): CvDocument {
  const emphasisRank: Record<ProjectRecord["emphasis"], number> = {
    "machine-learning": 0,
    geospatial: 1,
    policy: 2,
  };

  const contact: CvLine[] = [];
  for (const fact of source.identity) {
    if (!fact.tags?.includes("contact")) continue;
    if (!admits(fact, options)) continue;
    const value = fact.valueFrom ? options.privateValues?.[fact.valueFrom] : fact.text;
    if (!value) continue;
    contact.push(factLine(fact, value));
  }
  const location = source.identity.find((fact) => fact.id === "identity.location");
  if (location && admits(location, options)) {
    contact.push(
      factLine(location, `${location.text.replace(/^Based in /, "").replace(/\.$/, "")}`),
    );
  }

  const education = source.education.filter((record) => admits(record.headline, options));
  const experience = source.experience.filter((record) => admits(record.headline, options));
  const projects = source.projects
    .filter((record) => admits(record.headline, options))
    .sort((a, b) => emphasisRank[a.emphasis] - emphasisRank[b.emphasis])
    // The rest stay on the website rather than pushing the CV to a third page.
    .slice(0, MAX_PROJECTS);

  const sections: CvSection[] = [
    listSection("interests", "Research interests", source.interests, options),
    {
      id: "education",
      heading: "Education",
      entries: education.map((record) => educationEntry(record, options)),
    },
    {
      id: "projects",
      heading: "Research and technical projects",
      entries: projects.map((record) => projectEntry(record, options)),
    },
    {
      id: "experience",
      heading: "Professional experience",
      entries: experience.map((record) => experienceEntry(record, options)),
    },
    listSection("skills", "Skills", source.skills, options, true),
    listSection("certifications", "Certifications", source.certifications, options, true),
    listSection("languages", "Languages", source.languages, options, true),
    listSection("service", "Leadership and service", source.service, options),
  ].filter((section) => section.entries.length > 0);

  const omissions = options.includeUnconfirmed
    ? []
    : [
        ...source.experience.map((record) => record.headline),
        ...source.projects.map((record) => record.headline),
        ...source.identity,
        ...source.education.flatMap((record) => record.details),
        ...source.certifications,
        ...source.positioning,
      ]
        .filter((fact) => fact.status === "needs_confirmation")
        .map((fact) => ({
          factId: fact.id,
          label: fact.text.length > 90 ? `${fact.text.slice(0, 90)}…` : fact.text,
          reason: fact.note ?? "Not confirmed yet.",
        }));

  return {
    label: options.includeUnconfirmed
      ? "Master CV, if everything were confirmed"
      : "Master academic CV",
    contact,
    sections,
    omissions,
  };
}
