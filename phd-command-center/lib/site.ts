import {
  profile,
  type EducationRecord,
  type ExperienceRecord,
  type Fact,
  type Profile,
  type ProjectRecord,
} from "@/data/profile";
import { isPublishable } from "@/lib/integrity/facts";

export const siteConfig = {
  name: "Rami El Khatib",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description:
    "Surveying engineer and data scientist in Beirut, working on machine learning, GeoAI, and applied data science, and applying for a PhD for Fall 2027.",
  location: { city: "Beirut", country: "Lebanon", lat: 33.8938, lon: 35.5018 },
} as const;

/**
 * A record is shown only when its own headline may be published. Showing the bullets of a role
 * whose title is still unconfirmed would put an unverified job on the site by the back door, so
 * the whole record is withheld instead (CLAUDE.md rule 8).
 */
export function publishableExperience(): ExperienceRecord[] {
  return profile.experience
    .filter((record) => isPublishable(record.headline))
    .map((record) => ({ ...record, bullets: record.bullets.filter(isPublishable) }));
}

export function publishableEducation(): EducationRecord[] {
  return profile.education
    .filter((record) => isPublishable(record.headline))
    .map((record) => ({ ...record, details: record.details.filter(isPublishable) }));
}

const EMPHASIS_ORDER: Record<ProjectRecord["emphasis"], number> = {
  "machine-learning": 0,
  geospatial: 1,
  policy: 2,
};

export function publishableProjects(): ProjectRecord[] {
  return publishableProjectsFrom(profile);
}

export function publishableProjectsFrom(source: Profile): ProjectRecord[] {
  return source.projects
    .filter((record) => isPublishable(record.headline))
    .sort((a, b) => EMPHASIS_ORDER[a.emphasis] - EMPHASIS_ORDER[b.emphasis])
    .map((record) => ({
      ...record,
      details: record.details.filter(isPublishable),
      // A link whose target Rami has not confirmed is not published either.
      links: record.links.filter((link) => link.status === "confirmed"),
    }));
}

export function publishableFacts(facts: Fact[]): Fact[] {
  return facts.filter(isPublishable);
}

/** What the site is currently withholding, and the question that would release it. */
export interface WithheldItem {
  id: string;
  label: string;
  reason: string;
}

export function withheldFromPublicSite(): WithheldItem[] {
  const items: WithheldItem[] = [];

  for (const record of profile.experience) {
    if (!isPublishable(record.headline)) {
      items.push({
        id: record.id,
        label: `${record.role}, ${record.organization}`,
        reason: record.headline.note ?? "Not confirmed yet.",
      });
    }
  }

  for (const record of profile.projects) {
    if (!isPublishable(record.headline)) {
      items.push({
        id: record.id,
        label: record.name,
        reason: record.headline.note ?? "Not confirmed yet.",
      });
    }
  }

  for (const fact of [...profile.positioning, ...profile.identity, ...profile.certifications]) {
    if (fact.visibility === "public" && !isPublishable(fact)) {
      items.push({ id: fact.id, label: fact.text, reason: fact.note ?? "Not confirmed yet." });
    }
  }

  const emailFact = profile.identity.find((fact) => fact.id === "identity.email.lau");
  if (emailFact && !isPublishable(emailFact)) {
    items.push({
      id: emailFact.id,
      label: "A contact address on the site",
      reason: emailFact.note ?? "No permanent address confirmed.",
    });
  }

  return items;
}

/** Contact channels that may be shown. Empty until a permanent address is confirmed. */
export function publishableContacts(): Fact[] {
  return profile.identity.filter((fact) => fact.tags?.includes("contact") && isPublishable(fact));
}
