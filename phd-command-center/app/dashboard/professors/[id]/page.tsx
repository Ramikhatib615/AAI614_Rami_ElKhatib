import { notFound } from "next/navigation";

import type { FitComponent } from "@/lib/scoring/professor-fit";
import { getProfessor } from "@/lib/professors/store";

export const metadata = { title: "Professor", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface Rationale {
  components?: FitComponent[];
  warnings?: string[];
  notFound?: string[];
}

export default async function ProfessorPage({ params }: PageProps<"/dashboard/professors/[id]">) {
  const { id } = await params;
  const professor = await getProfessor(id);
  if (!professor) notFound();

  const rationale = (professor.fitRationale ?? {}) as Rationale;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl">{professor.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {[professor.title, professor.department, professor.labName].filter(Boolean).join(" — ") ||
            "Position not verified yet"}
        </p>
      </header>

      {professor.whyNotContact ? (
        <section className="plate plate-ticks border-warn/60 p-5">
          <h2 className="font-display text-lg status-warn">Do not contact</h2>
          <p className="measure mt-2 text-sm">{professor.whyNotContact}</p>
        </section>
      ) : null}

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-lg">Fit {professor.fitScore ?? "—"}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(rationale.components ?? []).map((component) => (
            <li key={component.key} className="measure">
              <span className="font-mono text-xs text-ink-soft">
                {component.points}/{component.max}
              </span>{" "}
              {component.label} — <span className="text-ink-soft">{component.reason}</span>
            </li>
          ))}
        </ul>
        {rationale.warnings?.length ? (
          <ul className="mt-4 space-y-1 text-sm status-warn">
            {rationale.warnings.map((warning) => (
              <li key={warning} className="measure">
                {warning}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-lg">Contact</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-mono text-xs text-ink-soft">Email</dt>
            <dd>
              {professor.officialEmail ? (
                <>
                  {professor.officialEmail}
                  {professor.emailSourceUrl ? (
                    <a
                      className="link ml-3 text-xs"
                      href={professor.emailSourceUrl}
                      rel="noreferrer"
                    >
                      source
                    </a>
                  ) : null}
                </>
              ) : (
                <span className="text-ink-soft">
                  Not published on their page, or obfuscated. Read it there yourself — nothing here
                  reconstructs an address.
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs text-ink-soft">Recruiting</dt>
            <dd>
              {professor.recruitingSignal ? (
                <>
                  “{professor.recruitingSignal.text}”
                  <a
                    className="link ml-3 text-xs"
                    href={professor.recruitingSignal.url}
                    rel="noreferrer"
                  >
                    source
                  </a>
                </>
              ) : (
                <span className="text-ink-soft">No published statement.</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-lg">Papers</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {professor.recentPapers.map((paper) => (
            <li key={paper.openAlexId ?? paper.url ?? paper.title} className="measure">
              <a className="link" href={paper.url ?? undefined} rel="noreferrer">
                {paper.title}
              </a>
              <span className="block font-mono text-xs text-ink-soft">
                {[paper.year, paper.venue].filter(Boolean).join("  ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {professor.sources.length > 0 ? (
        <section className="plate plate-ticks p-5">
          <h2 className="font-display text-lg">Sources</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {professor.sources.map((source) => (
              <li key={source.url} className="measure">
                <a className="link" href={source.url} rel="noreferrer">
                  {source.url}
                </a>
                <span className="block text-ink-soft">“{source.evidenceSnippet}”</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
