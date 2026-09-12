import { profile, publicFacts } from "@/data/profile";

/**
 * Phase 1 home page: proves the tokens and the fact filter. The contour hero and the full case
 * studies come in phase 2.
 *
 * Only facts that are both public and confirmed appear here (CLAUDE.md rule 8). The page is
 * deliberately sparse until Rami answers the open confirmations — that is the rule working, not a
 * missing feature.
 */
export default function HomePage() {
  const confirmed = new Set(publicFacts().map((fact) => fact.id));
  const interests = profile.interests.filter((fact) => confirmed.has(fact.id));
  const target = profile.identity.find(
    (fact) => fact.id === "identity.target" && confirmed.has(fact.id),
  );

  return (
    <div className="space-y-14">
      <section>
        <h1 className="font-display text-4xl sm:text-5xl">Rami El Khatib</h1>
        <p className="measure mt-4 text-ink-soft">
          Surveying engineer and data scientist in Beirut.
        </p>
        {target ? <p className="measure mt-2">{target.text}</p> : null}
      </section>

      <section>
        <div className="flex items-baseline gap-3">
          <span className="station font-mono text-sm">01</span>
          <h2 className="font-display text-2xl">Research interests</h2>
        </div>
        <ul className="mt-4 space-y-3">
          {interests.map((fact) => (
            <li key={fact.id} className="measure">
              {fact.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
