import { profile } from "@/data/profile";
import { diffCvDocuments } from "@/lib/cv/diff";
import { buildMasterCv } from "@/lib/cv/master";
import { privateProfileValue } from "@/lib/env";
import { checkCvDocument } from "@/lib/integrity/cv";

export const metadata = { title: "CV", robots: { index: false, follow: false } };

export default function DashboardCvPage() {
  const master = buildMasterCv(profile, {
    includePrivate: true,
    privateValues: { PROFILE_PHONE: privateProfileValue("PROFILE_PHONE") ?? undefined },
  });
  const report = checkCvDocument(master, profile);
  const potential = buildMasterCv(profile, { includeUnconfirmed: true, includePrivate: true });
  const diff = diffCvDocuments(master, potential);
  const added = diff.reduce(
    (count, section) => count + section.lines.filter((line) => line.change === "added").length,
    0,
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Master academic CV</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Built from {report.factIds.length} confirmed facts. Every line traces to one.
          </p>
        </div>
        {report.exportable ? (
          <a
            href="/api/cv/export"
            className="plate plate-raised bg-ground px-4 py-2 text-sm font-medium"
          >
            Download PDF
          </a>
        ) : (
          <p className="plate border-warn/60 px-4 py-2 text-sm status-warn">
            Export blocked — {report.errors.length} issue{report.errors.length === 1 ? "" : "s"}
          </p>
        )}
      </header>

      {report.errors.length > 0 ? (
        <section className="plate plate-ticks border-warn/60 p-5">
          <h2 className="font-display text-lg">What blocks the export</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.errors.map((issue) => (
              <li
                key={`${issue.code}-${issue.lineId ?? issue.factId ?? issue.message}`}
                className="measure"
              >
                <span aria-hidden className="status-warn">
                  !
                </span>{" "}
                {issue.message}
                <span className="block pl-4 font-mono text-xs text-ink-soft">{issue.code}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.warnings.length > 0 ? (
        <section className="plate plate-ticks p-5">
          <h2 className="font-display text-lg">Warnings — your call</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.warnings.map((issue) => (
              <li key={`${issue.code}-${issue.factId ?? issue.message}`} className="measure">
                {issue.message}
                {issue.factId ? (
                  <span className="block pl-4 font-mono text-xs text-ink-soft">{issue.factId}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="plate plate-ticks p-6">
        <h2 className="font-display text-lg">Preview</h2>
        <div className="mt-4 space-y-6">
          <div>
            <p className="font-display text-xl">Rami El Khatib</p>
            {master.contact.map((line) => (
              <p key={line.id} className="font-mono text-xs text-ink-soft">
                {line.text}
              </p>
            ))}
          </div>

          {master.sections.map((section) => (
            <div key={section.id}>
              <h3 className="font-mono text-xs tracking-wide text-ink-soft">{section.heading}</h3>
              <div className="mt-2 space-y-3">
                {section.entries.map((entry) => (
                  <div key={entry.id}>
                    {entry.heading ? <p className="font-medium">{entry.heading}</p> : null}
                    {entry.meta ? <p className="text-xs text-ink-soft">{entry.meta}</p> : null}
                    <ul className="mt-1 space-y-1">
                      {entry.lines.map((line) => (
                        <li key={line.id} className="measure text-sm">
                          {line.text}
                          <span className="ml-2 font-mono text-[10px] text-ink-soft">
                            {line.factIds.join(" ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-lg">What confirming everything would add</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {added} lines, held back by {master.omissions.length} unconfirmed facts.
        </p>
        <div className="mt-4 space-y-4">
          {diff.map((section) => (
            <div key={section.heading}>
              <h3 className="font-mono text-xs text-ink-soft">{section.heading}</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {section.lines
                  .filter((line) => line.change !== "unchanged")
                  .map((line) => (
                    <li key={line.id} className="measure flex gap-2">
                      <span
                        aria-hidden
                        className={line.change === "added" ? "status-unverified" : "status-warn"}
                      >
                        {line.change === "added" ? "+" : "−"}
                      </span>
                      <span>{line.text}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
