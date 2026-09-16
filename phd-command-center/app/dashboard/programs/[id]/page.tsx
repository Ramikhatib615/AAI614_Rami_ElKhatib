import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/guard";
import { enqueue } from "@/lib/jobs/queue";
import { getProgram, setVerification } from "@/lib/programs/store";
import type { ProgramFitComponent } from "@/lib/scoring/program-fit";

export const metadata = { title: "Program", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function verify(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "unverified" | "verified" | "outdated";
  await setVerification(id, status);
  revalidatePath(`/dashboard/programs/${id}`);
}

async function refresh(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  await enqueue({
    type: "program.refresh",
    payload: { programId: id },
    dedupeKey: `program.refresh:${id}:${new Date().toISOString().slice(0, 10)}`,
  });
  revalidatePath(`/dashboard/programs/${id}`);
}

export default async function ProgramPage({ params }: PageProps<"/dashboard/programs/[id]">) {
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();

  const rationale = (program.fitRationale ?? {}) as { components?: ProgramFitComponent[] };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{program.university}</h1>
          <p className="mt-1 text-sm text-ink-soft">{program.programName}</p>
        </div>
        <p
          className={
            program.verificationStatus === "verified" ? "status-verified" : "status-unverified"
          }
        >
          {program.verificationStatus}
          {program.lastVerifiedAt ? ` on ${program.lastVerifiedAt.toISOString().slice(0, 10)}` : ""}
        </p>
      </header>

      {program.provenance === "prompt_seed" ? (
        <p className="plate border-warn/60 p-4 text-sm status-warn">
          This row came from the brief, not from a page anything read. Several of its dates are from
          cycles that have already closed. Re-read the source before relying on it.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="plate plate-ticks p-5">
          <h2 className="font-display text-lg">Requirements</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {[
              ["Degree", program.degreeRequirement],
              ["Minimum GPA", program.minGpa],
              [
                "English",
                program.englishTests
                  ? Object.entries(program.englishTests)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("; ")
                  : null,
              ],
              ["GRE", program.greRequired],
              ["Interview", program.interview],
              ["Documents", program.documents.length ? program.documents.join("; ") : null],
              ["Funding", program.fundingType],
              ["Stipend", program.stipend],
              ["International applicants", program.internationalEligibility],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="font-mono text-xs text-ink-soft">{label}</dt>
                <dd>
                  {value ? String(value) : <span className="text-ink-soft">not recorded</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="plate plate-ticks p-5">
          <h2 className="font-display text-lg">Fit {program.fitScore ?? "—"}</h2>
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

          <h3 className="mt-5 font-display text-base">Deadlines</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {program.deadlines.map((deadline) => (
              <li key={`${deadline.label}-${deadline.cycle}`}>
                <span className="font-mono">{deadline.date ?? "no date published"}</span>{" "}
                {deadline.label}
                <span className="block text-xs text-ink-soft">
                  {deadline.cycle}
                  {deadline.note ? ` — ${deadline.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-lg">Sources</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {program.sources.map((source) => (
            <li key={source.url + source.evidenceSnippet} className="measure">
              <a className="link" href={source.url} rel="noreferrer">
                {source.url}
              </a>
              <span className="block text-ink-soft">“{source.evidenceSnippet}”</span>
            </li>
          ))}
          {program.sources.length === 0 ? (
            <li className="text-ink-soft">No sources recorded.</li>
          ) : null}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <form action={verify}>
          <input type="hidden" name="id" value={program.id} />
          <input type="hidden" name="status" value="verified" />
          <button
            type="submit"
            className="plate plate-raised bg-ground px-4 py-2 text-sm font-medium"
          >
            I checked the official page — mark verified
          </button>
        </form>
        <form action={refresh}>
          <input type="hidden" name="id" value={program.id} />
          <button type="submit" className="plate bg-ground px-4 py-2 text-sm">
            Re-read the source
          </button>
        </form>
        {program.applicationUrl ? (
          <a
            className="plate bg-ground px-4 py-2 text-sm"
            href={program.applicationUrl}
            rel="noreferrer"
          >
            Open the official page
          </a>
        ) : null}
      </div>
    </div>
  );
}
