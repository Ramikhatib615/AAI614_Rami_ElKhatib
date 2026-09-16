import Link from "next/link";
import { revalidatePath } from "next/cache";

import { listStatements } from "@/lib/applications/store";
import { requireViewer } from "@/lib/guard";
import { enqueue } from "@/lib/jobs/queue";
import { listPrograms } from "@/lib/programs/store";
import { DEFAULT_WORD_LIMITS } from "@/lib/statements/rules";

export const metadata = { title: "Statements", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function queueStatement(formData: FormData) {
  "use server";
  await requireViewer();
  const kind = String(formData.get("kind") ?? "sop");
  const programId = String(formData.get("programId") ?? "");
  const wordLimit = Number(formData.get("wordLimit") || DEFAULT_WORD_LIMITS[kind] || 1000);
  await enqueue({
    type: "statement.draft",
    payload: { kind, wordLimit, ...(programId ? { programId } : {}) },
    dedupeKey: `statement.draft:${kind}:${programId || "general"}`,
  });
  revalidatePath("/dashboard/statements");
}

export default async function StatementsPage() {
  const [rows, programs] = await Promise.all([listStatements(), listPrograms()]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl">Statements</h1>
        <p className="measure mt-1 text-sm text-ink-soft">
          Every draft is marked as needing your edits until you approve it. Nothing here is ready to
          submit as written.
        </p>
      </header>

      <section className="plate plate-ticks p-5">
        <form action={queueStatement} className="flex flex-wrap items-end gap-3">
          <label>
            <span className="block text-sm">Type</span>
            <select
              name="kind"
              className="mt-1 border border-contour/70 bg-ground px-3 py-2 text-sm"
            >
              {Object.keys(DEFAULT_WORD_LIMITS).map((kind) => (
                <option key={kind} value={kind}>
                  {kind.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-sm">Word limit</span>
            <input
              name="wordLimit"
              type="number"
              min={200}
              max={3000}
              placeholder="1000"
              className="mt-1 w-28 border border-contour/70 bg-ground px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="block text-sm">For a program (optional)</span>
            <select
              name="programId"
              className="mt-1 w-full border border-contour/70 bg-ground px-3 py-2 text-sm"
            >
              <option value="">General version</option>
              {programs.map((program) => (
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
            Queue a draft
          </button>
        </form>
      </section>

      <table className="w-full text-sm">
        <caption className="sr-only">Statements</caption>
        <thead className="text-left text-xs text-ink-soft">
          <tr>
            <th scope="col" className="py-2">
              Title
            </th>
            <th scope="col">Type</th>
            <th scope="col">Words</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-contour/40">
              <td className="py-2">
                <Link href={`/dashboard/statements/${row.id}`} className="link">
                  {row.title}
                </Link>
              </td>
              <td className="text-ink-soft">{row.type.replace(/_/g, " ")}</td>
              <td className="font-mono text-xs">
                {row.wordCount}
                {row.wordLimit ? ` / ${row.wordLimit}` : ""}
              </td>
              <td className={row.status === "approved" ? "status-verified" : "status-unverified"}>
                {row.status === "approved" ? "approved" : "AI draft — needs your edits"}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr className="border-t border-contour/40">
              <td colSpan={4} className="py-3 text-ink-soft">
                Nothing drafted yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
