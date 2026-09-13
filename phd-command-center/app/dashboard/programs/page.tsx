import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/guard";
import { enqueue } from "@/lib/jobs/queue";
import { listPrograms, upcomingDeadlines } from "@/lib/programs/store";

export const metadata = { title: "Programs", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const REGIONS = ["Europe", "UK", "US", "Canada", "Gulf/MENA", "Asia-Pacific"];

async function startDiscovery(formData: FormData) {
  "use server";
  await requireViewer();
  const region = String(formData.get("region") ?? "");
  const interest = String(formData.get("interest") ?? "").trim();
  if (!region || !interest) return;
  await enqueue({
    type: "program.discover",
    payload: { region, interest },
    dedupeKey: `program.discover:${region}:${interest.toLowerCase()}`,
  });
  revalidatePath("/dashboard/programs");
}

export default async function ProgramsPage() {
  const rows = await listPrograms();
  const today = new Date().toISOString().slice(0, 10);
  const deadlines = upcomingDeadlines(rows, today);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Programs</h1>
          <p className="measure mt-1 text-sm text-ink-soft">
            Every row starts unverified. Check the official page, then mark it verified — the
            calendar export says so on each entry until you do.
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/api/export/programs.csv" className="plate bg-ground px-3 py-1.5 text-sm">
            CSV
          </a>
          <a href="/api/export/deadlines.ics" className="plate bg-ground px-3 py-1.5 text-sm">
            Calendar
          </a>
        </div>
      </header>

      <section className="plate plate-ticks p-5">
        <form action={startDiscovery} className="flex flex-wrap items-end gap-3">
          <label>
            <span className="block text-sm">Region</span>
            <select
              name="region"
              className="mt-1 border border-contour/70 bg-ground px-3 py-2 text-sm"
            >
              {REGIONS.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="block text-sm">Research interest</span>
            <input
              name="interest"
              required
              placeholder="language models"
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
      </section>

      <section>
        <h2 className="font-display text-lg">Next deadlines</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {deadlines.slice(0, 10).map((entry) => (
            <li key={`${entry.programId}-${entry.deadline.label}`} className="flex gap-3">
              <span
                aria-hidden
                className={
                  entry.verification === "verified" ? "status-verified" : "status-unverified"
                }
              >
                {entry.verification === "verified" ? "▲" : "○"}
              </span>
              <span>
                <span className="font-mono">{entry.deadline.date}</span> {entry.university}{" "}
                <span className="text-ink-soft">({entry.deadline.label})</span>
              </span>
            </li>
          ))}
          {deadlines.length === 0 ? (
            <li className="text-ink-soft">No dated deadlines yet.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg">All programs</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Programs, best fit first</caption>
          <thead className="text-left text-xs text-ink-soft">
            <tr>
              <th scope="col" className="py-2">
                Fit
              </th>
              <th scope="col">Program</th>
              <th scope="col">Country</th>
              <th scope="col">Funding</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-contour/40">
                <td className="py-2 font-mono">{row.fitScore ?? "—"}</td>
                <td>
                  <Link href={`/dashboard/programs/${row.id}`} className="link">
                    {row.university}
                  </Link>
                  <span className="block text-xs text-ink-soft">{row.programName}</span>
                </td>
                <td className="text-ink-soft">{row.country}</td>
                <td className="text-ink-soft">{row.fundingType ?? "not recorded"}</td>
                <td
                  className={
                    row.verificationStatus === "verified" ? "status-verified" : "status-unverified"
                  }
                >
                  {row.verificationStatus}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr className="border-t border-contour/40">
                <td colSpan={5} className="py-3 text-ink-soft">
                  Nothing yet. Run `pnpm db:seed` for the eight programs in the brief, or queue a
                  discovery above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
