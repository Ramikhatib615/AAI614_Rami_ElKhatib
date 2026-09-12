import type { Metadata } from "next";

import { StationHeading } from "@/components/sheet";
import { allFacts, profile } from "@/data/profile";
import { interestEvidenceTags, siteCopy } from "@/lib/copy";
import { isPublishable } from "@/lib/integrity/facts";
import { publishableFacts } from "@/lib/site";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Research interests: language models and NLP, GeoAI and remote sensing, applied machine learning, and AI for humanitarian and development work.",
};

export default function ResearchPage() {
  const interests = publishableFacts(profile.interests);
  const facts = allFacts().filter(isPublishable);

  return (
    <div className="space-y-14">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Research</h1>
        <p className="measure mt-4">{siteCopy.researchIntro.text}</p>
      </header>

      {interests.map((interest, index) => {
        const tags = interestEvidenceTags[interest.id] ?? [];
        const evidence = tags.length
          ? facts.filter((fact) => fact.tags?.some((tag) => tags.includes(tag)))
          : [];

        return (
          <section key={interest.id}>
            <StationHeading number={String(index + 1).padStart(2, "0")}>
              {interest.text}
            </StationHeading>
            {evidence.length > 0 ? (
              <ul className="mt-4 space-y-3 border-l border-contour/50 pl-5">
                {evidence.map((fact) => (
                  <li key={fact.id} className="measure text-sm">
                    {fact.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}

      <section>
        <StationHeading number="05">Status</StationHeading>
        <p className="measure mt-4">{siteCopy.researchStatus.text}</p>
      </section>
    </div>
  );
}
