import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { CopyButton } from "@/components/dashboard/copy-button";
import { requireViewer } from "@/lib/guard";
import { getDraft, updateDraft } from "@/lib/outreach/store";
import { canTransition, followUpDate, mailtoLink } from "@/lib/outreach/rules";
import { getProfessor } from "@/lib/professors/store";

export const metadata = { title: "Draft", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function advance(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  const to = String(formData.get("to"));
  const draft = await getDraft(id);
  if (!draft || !canTransition(draft.status, to)) return;

  if (to === "sent_manually") {
    const sentAt = new Date();
    await updateDraft(id, { status: "sent_manually", sentAt, followUpAt: followUpDate(sentAt) });
  } else {
    await updateDraft(id, { status: to as typeof draft.status });
  }
  revalidatePath(`/dashboard/outreach/${id}`);
}

async function saveBody(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await updateDraft(id, { body, wordCount: body.split(/\s+/).filter(Boolean).length });
  revalidatePath(`/dashboard/outreach/${id}`);
}

export default async function DraftPage({ params }: PageProps<"/dashboard/outreach/[id]">) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) notFound();
  const professor = await getProfessor(draft.professorId);

  const subject = draft.selectedSubject ?? draft.subjectOptions[0] ?? "";
  const blocking = draft.warnings.filter((warning) => warning.startsWith("blocking:"));
  const advisory = draft.warnings.filter((warning) => !warning.startsWith("blocking:"));
  const canApprove = blocking.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{professor?.name ?? "Draft"}</h1>
          <p className="mt-1 font-mono text-xs text-ink-soft">
            {draft.status.replace(/_/g, " ")} · {draft.wordCount} words
          </p>
        </div>
        <p className="text-sm status-unverified">AI draft — requires your edits</p>
      </header>

      {blocking.length > 0 ? (
        <section className="plate plate-ticks border-warn/60 p-5">
          <h2 className="font-display text-lg status-warn">Blocking</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {blocking.map((warning) => (
              <li key={warning} className="measure">
                {warning.replace(/^blocking: /, "")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="plate plate-ticks p-5">
          <h2 className="font-display text-lg">Draft</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {draft.subjectOptions.map((option) => (
              <li key={option} className="measure">
                <span className="font-mono text-xs text-ink-soft">subject</span> {option}
              </li>
            ))}
          </ul>

          <form action={saveBody} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={draft.id} />
            <textarea
              name="body"
              defaultValue={draft.body}
              rows={16}
              className="w-full border border-contour/70 bg-ground p-3 text-sm leading-relaxed"
            />
            <button type="submit" className="plate bg-ground px-3 py-1.5 text-sm">
              Save edits
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <CopyButton text={draft.body} label="Copy the letter" />
            {professor?.officialEmail ? (
              <a
                className="plate bg-ground px-4 py-2 text-sm"
                href={mailtoLink({ to: professor.officialEmail, subject, body: draft.body })}
              >
                Open in mail
              </a>
            ) : (
              <span className="text-sm text-ink-soft">
                No published address, so there is no mail link. Copy the letter and address it
                yourself.
              </span>
            )}
          </div>

          <form action={advance} className="mt-5 flex flex-wrap gap-2">
            <input type="hidden" name="id" value={draft.id} />
            {(["reviewed", "approved", "sent_manually", "replied", "closed"] as const)
              .filter((to) => canTransition(draft.status, to))
              .filter((to) => to !== "approved" || canApprove)
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
          <p className="mt-3 text-xs text-ink-soft">
            “Mark sent” records that you sent it and schedules one follow-up in fourteen days. It
            does not send anything.
          </p>
        </section>

        <section className="plate plate-ticks p-5">
          <h2 className="font-display text-lg">Provenance</h2>
          <dl className="mt-3 space-y-4 text-sm">
            <div>
              <dt className="font-mono text-xs text-ink-soft">Facts used</dt>
              <dd>
                <ul className="mt-1 space-y-1 font-mono text-xs">
                  {draft.factIdsUsed.map((factId) => (
                    <li key={factId}>{factId}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-ink-soft">Papers referred to</dt>
              <dd>
                <ul className="mt-1 space-y-1">
                  {draft.paperIdsReferenced.map((paperId) => {
                    const paper = professor?.recentPapers.find(
                      (entry) => entry.openAlexId === paperId,
                    );
                    return (
                      <li key={paperId} className="measure">
                        {paper ? (
                          <a className="link" href={paper.url ?? undefined} rel="noreferrer">
                            {paper.title}
                          </a>
                        ) : (
                          <span className="status-warn">
                            {paperId} is not on this professor&apos;s record
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-ink-soft">Closest other draft</dt>
              <dd>
                {draft.maxSimilarity
                  ? `${Math.round(draft.maxSimilarity * 100)}% overlap`
                  : "no overlap"}
              </dd>
            </div>
            {draft.followUpAt ? (
              <div>
                <dt className="font-mono text-xs text-ink-soft">Follow-up due</dt>
                <dd>{draft.followUpAt.toISOString().slice(0, 10)}</dd>
              </div>
            ) : null}
          </dl>

          {advisory.length > 0 ? (
            <>
              <h3 className="mt-5 font-display text-base">Worth knowing</h3>
              <ul className="mt-2 space-y-2 text-sm status-warn">
                {advisory.map((warning) => (
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
