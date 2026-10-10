import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { CopyButton } from "@/components/dashboard/copy-button";
import { getStatement, updateStatement } from "@/lib/applications/store";
import { requireViewer } from "@/lib/guard";
import { canTransitionStatement, checkStatement } from "@/lib/statements/rules";

export const metadata = { title: "Statement", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function save(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await updateStatement(id, {
    body,
    wordCount: body.split(/\s+/).filter(Boolean).length,
    status: "edited",
  });
  revalidatePath(`/dashboard/statements/${id}`);
}

async function advance(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  const to = String(formData.get("to"));
  const statement = await getStatement(id);
  if (!statement || !canTransitionStatement(statement.status, to)) return;
  await updateStatement(id, { status: to as typeof statement.status });
  revalidatePath(`/dashboard/statements/${id}`);
}

export default async function StatementPage({ params }: PageProps<"/dashboard/statements/[id]">) {
  const { id } = await params;
  const statement = await getStatement(id);
  if (!statement) notFound();

  const check = checkStatement({
    body: statement.body,
    factIdsUsed: statement.factIdsUsed,
    wordLimit: statement.wordLimit,
    status: statement.status,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{statement.title}</h1>
          <p className="mt-1 font-mono text-xs text-ink-soft">
            {statement.type.replace(/_/g, " ")} · {check.wordCount}
            {statement.wordLimit ? ` of ${statement.wordLimit}` : ""} words
          </p>
        </div>
        {check.requiresEdit ? (
          <p className="text-sm status-unverified">AI draft — requires your edits</p>
        ) : (
          <p className="text-sm status-verified">Approved by you</p>
        )}
      </header>

      {check.errors.length > 0 ? (
        <section className="plate plate-ticks border-warn/60 p-5">
          <h2 className="font-display text-lg status-warn">Blocking</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {check.errors.map((issue) => (
              <li key={issue.message} className="measure">
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="plate plate-ticks p-5">
          <form action={save} className="space-y-3">
            <input type="hidden" name="id" value={statement.id} />
            <textarea
              name="body"
              defaultValue={statement.body}
              rows={24}
              className="w-full border border-contour/70 bg-ground p-3 text-sm leading-relaxed"
            />
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="plate bg-ground px-3 py-1.5 text-sm">
                Save edits
              </button>
              <CopyButton text={statement.body} label="Copy" />
            </div>
          </form>

          <form action={advance} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="id" value={statement.id} />
            {(["needs_review", "edited", "approved"] as const)
              .filter((to) => canTransitionStatement(statement.status, to))
              .filter((to) => to !== "approved" || check.approvable)
              .map((to) => (
                <button
                  key={to}
                  type="submit"
                  name="to"
                  value={to}
                  className="plate bg-ground px-3 py-1.5 text-sm"
                >
                  Mark {to.replace(/_/g, " ")}
                </button>
              ))}
          </form>
        </section>

        <section className="plate plate-ticks p-5">
          <h2 className="font-display text-lg">Provenance</h2>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {statement.factIdsUsed.map((factId) => (
              <li key={factId}>{factId}</li>
            ))}
          </ul>
          {statement.warnings.length > 0 ? (
            <>
              <h3 className="mt-5 font-display text-base">Notes</h3>
              <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                {statement.warnings.map((warning) => (
                  <li key={warning} className="measure">
                    {warning}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
