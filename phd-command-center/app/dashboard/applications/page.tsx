import Link from "next/link";
import { revalidatePath } from "next/cache";

import { STAGES, listApplications, startApplication } from "@/lib/applications/store";
import { addDays, completion, dueBy } from "@/lib/applications/checklist";
import { requireViewer } from "@/lib/guard";
import { listPrograms } from "@/lib/programs/store";

export const metadata = { title: "Applications", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function track(formData: FormData) {
  "use server";
  await requireViewer();
  const programId = String(formData.get("programId") ?? "");
  if (!programId) return;
  await startApplication(programId, {
    englishTestTaken: false,
    greTaken: false,
    refereesConfirmed: 0,
  });
  revalidatePath("/dashboard/applications");
}

export default async function ApplicationsPage() {
  const [rows, programs] = await Promise.all([listApplications(), listPrograms()]);
  const tracked = new Set(rows.map((row) => row.application.programId));
  const untracked = programs.filter((program) => !tracked.has(program.id));
  const today = new Date().toISOString().slice(0, 10);
  const soon = addDays(today, 30);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl">Applications</h1>
        <p className="measure mt-1 text-sm text-ink-soft">
          Tracking only. Every application is submitted by you, on the official portal.
        </p>
      </header>

      {untracked.length > 0 ? (
        <section className="plate plate-ticks p-5">
          <form action={track} className="flex flex-wrap items-end gap-3">
            <label className="flex-1">
              <span className="block text-sm">Start tracking a program</span>
              <select
                name="programId"
                className="mt-1 w-full border border-contour/70 bg-ground px-3 py-2 text-sm"
              >
                {untracked.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.university} — {program.programName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="plate plate-raised bg-ground px-4 py-2 text-sm font-medium"
            >
              Track it
            </button>
          </form>
          <p className="mt-3 text-sm text-ink-soft">
            The checklist is built from what that program actually asks for.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {STAGES.filter((stage) => stage !== "withdrawn").map((stage) => {
          const inStage = rows.filter((row) => row.application.stage === stage);
          return (
            <div key={stage} className="plate plate-ticks p-4">
              <h2 className="font-mono text-xs text-ink-soft">{stage}</h2>
              <ul className="mt-3 space-y-3">
                {inStage.map((row) => {
                  const overdue = dueBy(row.application.checklist, soon);
                  return (
                    <li key={row.application.id} className="text-sm">
                      <Link href={`/dashboard/applications/${row.application.id}`} className="link">
                        {row.university ?? "Program"}
                      </Link>
                      <span className="block font-mono text-xs text-ink-soft">
                        {Math.round(completion(row.application.checklist) * 100)}% done
                        {overdue.length > 0 ? ` · ${overdue.length} due soon` : ""}
                      </span>
                    </li>
                  );
                })}
                {inStage.length === 0 ? <li className="text-xs text-ink-soft">—</li> : null}
              </ul>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="font-display text-lg">Everything due in the next month</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {rows.flatMap((row) =>
            dueBy(row.application.checklist, soon).map((item) => (
              <li key={`${row.application.id}-${item.item}`} className="flex gap-3">
                <span
                  aria-hidden
                  className={
                    item.dueDate && item.dueDate < today ? "status-warn" : "status-unverified"
                  }
                >
                  {item.dueDate && item.dueDate < today ? "!" : "○"}
                </span>
                <span>
                  <span className="font-mono">{item.dueDate}</span> {item.item}
                  <span className="text-ink-soft"> — {row.university}</span>
                </span>
              </li>
            )),
          )}
          {rows.length === 0 ? <li className="text-ink-soft">Nothing tracked yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
