import { profile } from "@/data/profile";
import { isPublishable } from "@/lib/integrity/facts";
import { publishableEducation, publishableFacts, siteConfig } from "@/lib/site";

/**
 * JSON-LD Person (PROMPT.md §5.3). `sameAs` is deliberately absent: the LinkedIn, GitHub and ORCID
 * URLs are not confirmed yet, and a structured-data claim is a claim like any other.
 */
export function PersonJsonLd() {
  const education = publishableEducation();
  const knowsAbout = [
    ...publishableFacts(profile.interests).map((fact) => fact.text.replace(/\.$/, "")),
    "Geographic information systems",
    "Remote sensing",
    "Data science",
  ];

  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.location.city,
      addressCountry: siteConfig.location.country,
    },
    alumniOf: education.map((record) => ({
      "@type": "CollegeOrUniversity",
      name: record.institution,
    })),
    knowsAbout,
    knowsLanguage: publishableFacts(profile.languages).map((fact) => fact.text),
  };

  return (
    <script
      type="application/ld+json"
      // The payload is built from vetted profile facts, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function hasPublishableContactLink(): boolean {
  return profile.identity.some((fact) => fact.tags?.includes("contact") && isPublishable(fact));
}
