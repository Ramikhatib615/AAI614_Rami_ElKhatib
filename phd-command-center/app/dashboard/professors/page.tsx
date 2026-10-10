import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/guard";
import { enqueue } from "@/lib/jobs/queue";
import { institutionNames, listProfessors } from "@/lib/professors/store";
import { INTEREST_RULES, RANK_POINTS } from "@/lib/scoring/interests";

export const metadata = { title: "Professors", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function startDiscovery(formData: FormData) {
  "use server";
  await requireViewer();
  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) return;
  await enqueue({
    type: "professor.discover",
    payload: { topic },
    dedupeKey: `professor.discover:${topic.toLowerCase()}`,
  });
  revalidatePath("/dashboard/professors");
}

export default async function ProfessorsPage() {
  const [rows, institutions] = await Promise.all([listProfessors(), institutionNames()]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl">Professors</h1>
        <p className="measure mt-1 text-sm text-ink-soft">
          Candidates come from OpenAlex; everything beyond their papers is read from the person’s
          own page. An address appears here only if it was printed there.
        </p>
      </header>

      <section className="plate plate-ticks p-5">
        <form action={startDiscovery} className="flex flex-wrap items-end gap-3">
          <label className="flex-1">
            <span className="block text-sm">Search a topic</span>
            <input
              name="topic"
              required
              placeholder="Arabic natural language processing"
              className="mt-1 w-full border border-contour/70 bg-ground px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="plate plate-raised bg-ground px-4 py-2 text-sm font-medium"
          >
            Queue discovery
          </button>
        </form>
        <p className="mt-3 text-sm text-ink-soft">
          Queuing adds the job; press “Run queue” on the{" "}
          <Link href="/dashboard/jobs" className="link">
            queue page
          </Link>{" "}
          to work it.
        </p>
      </section>

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-lg">Legend</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-mono text-xs text-ink-soft">Research overlap, up to 50</dt>
            <dd>
              {INTEREST_RULES.map((rule) => `${rule.label} (${RANK_POINTS[rule.rank]})`).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs text-ink-soft">Recent activity, up to 15</dt>
            <dd>Published this year 15, last year 10, three years back 5.</dd>
          </div>
          <div>
            <dt className="font-mono text-xs text-ink-soft">Recruiting signal, up to 15</dt>
            <dd>Only an explicit, quoted statement on their page scores.</dd>
          </div>
          <div>
            <dt className="font-mono text-xs text-ink-soft">Crossover 10, funding 10</dt>
            <dd>Machine learning plus geospatial or development work; a linked funded program.</dd>
          </div>
        </dl>
      </section>

      <section>
        <table className="w-full text-sm">
          <caption className="sr-only">Professors, best fit first</caption>
          <thead className="text-left text-xs text-ink-soft">
            <tr>
              <th scope="col" className="py-2">
                Fit
              </th>
              <th scope="col">Name</th>
              <th scope="col">Institution</th>
              <th scope="col">Email</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-contour/40">
                <td className="py-2 font-mono">{row.fitScore ?? "—"}</td>
                <td>
                  <Link href={`/dashboard/professors/${row.id}`} className="link">
                    {row.name}
                  </Link>
                </td>
                <td className="text-ink-soft">
                  {row.institutionId ? (institutions.get(row.institutionId) ?? "—") : "—"}
                </td>
                <td className="font-mono text-xs">
                  {row.officialEmail ?? <span className="text-ink-soft">not published</span>}
                </td>
                <td>
                  <span
                    aria-hidden
                    className={row.status === "verified" ? "status-verified" : "status-unverified"}
                  >
                    {row.status === "verified" ? "▲" : "○"}
                  </span>{" "}
                  {row.status}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr className="border-t border-contour/40">
                <td colSpan={5} className="py-3 text-ink-soft">
                  No candidates yet. Queue a topic above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
