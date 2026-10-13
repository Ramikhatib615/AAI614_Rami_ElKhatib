import Link from "next/link";

import { allFacts, profile } from "@/data/profile";
import { seedPrograms } from "@/data/seed-programs";
import { withheldFromPublicSite } from "@/lib/site";

/**
 * Phase 1 dashboard home. It reads the profile and the seed list directly — no database yet — so
 * the readiness and confirmation panels are useful from day one.
 */
export default function DashboardHome() {
  const facts = allFacts();
  const needsConfirmation = facts.filter((fact) => fact.status === "needs_confirmation");
  const gaps = profile.gaps;
  const datedDeadlines = seedPrograms
    .flatMap((program) =>
      program.deadlines.map((deadline) => ({ program: program.university, ...deadline })),
    )
    .filter((deadline) => deadline.date !== null)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string));
  const undated = seedPrograms.length - new Set(datedDeadlines.map((d) => d.program)).size;
  const withheld = withheldFromPublicSite();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-xl">Deadlines in the seed list</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Every row is unverified. Check the official page before acting on any of it.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {datedDeadlines.map((deadline) => (
            <li key={`${deadline.program}-${deadline.label}`} className="flex gap-3">
              <span aria-hidden className="status-unverified">
                ○
              </span>
              <span>
                <span className="font-mono">{deadline.date}</span> — {deadline.program}{" "}
                <span className="text-ink-soft">({deadline.label})</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          {undated} more programs have no published date for the next cycle yet.
        </p>
      </section>

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-xl">Readiness</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {gaps.map((gap) => (
            <li key={gap.id}>
              <span aria-hidden className="status-warn">
                !
              </span>{" "}
              {gap.text}
              {gap.note ? <span className="block pl-4 text-ink-soft">{gap.note}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="plate plate-ticks p-5 lg:col-span-2">
        <h2 className="font-display text-xl">What the public site is withholding</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {withheld.length} items are held back because they are not confirmed. The most costly one
          is the AUB role: without a confirmed title, your current job is absent from{" "}
          <Link href="/experience" className="link">
            the experience page
          </Link>
          , so the site reads as though you have not worked since October 2025.
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {withheld.map((item) => (
            <li key={item.id} className="measure">
              <span aria-hidden className="status-unverified">
                ○
              </span>{" "}
              {item.label}
              <span className="block pl-4 text-ink-soft">{item.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="plate plate-ticks p-5 lg:col-span-2">
        <h2 className="font-display text-xl">Waiting on you</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {needsConfirmation.length} facts are blocked from the public site and from CV export until
          these are answered.
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {profile.openConfirmations.map((item) => (
            <li key={item.id} className="measure">
              {item.question}
              {item.blocks.length > 0 ? (
                <span className="block font-mono text-xs text-ink-soft">
                  blocks: {item.blocks.join(", ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
