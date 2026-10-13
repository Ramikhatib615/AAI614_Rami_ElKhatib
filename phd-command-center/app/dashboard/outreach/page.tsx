import Link from "next/link";

import { listDrafts } from "@/lib/outreach/store";
import { listProfessors } from "@/lib/professors/store";

export const metadata = { title: "Outreach", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const [drafts, professors] = await Promise.all([listDrafts(), listProfessors()]);
  const names = new Map(professors.map((professor) => [professor.id, professor.name]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl">Outreach</h1>
        <p className="measure mt-1 text-sm text-ink-soft">
          Drafts only. Nothing here can send an email: when you approve one, you get the text and a
          link that opens your own mail client.
        </p>
      </header>

      <table className="w-full text-sm">
        <caption className="sr-only">Outreach drafts</caption>
        <thead className="text-left text-xs text-ink-soft">
          <tr>
            <th scope="col" className="py-2">
              Professor
            </th>
            <th scope="col">Status</th>
            <th scope="col">Words</th>
            <th scope="col">Overlap</th>
            <th scope="col">Flags</th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => (
            <tr key={draft.id} className="border-t border-contour/40">
              <td className="py-2">
                <Link href={`/dashboard/outreach/${draft.id}`} className="link">
                  {names.get(draft.professorId) ?? draft.professorId}
                </Link>
              </td>
              <td>{draft.status.replace(/_/g, " ")}</td>
              <td className="font-mono text-xs">{draft.wordCount}</td>
              <td className="font-mono text-xs">
                {draft.maxSimilarity ? `${Math.round(draft.maxSimilarity * 100)}%` : "—"}
              </td>
              <td className={draft.warnings.length ? "status-warn" : "text-ink-soft"}>
                {draft.warnings.length || "none"}
              </td>
            </tr>
          ))}
          {drafts.length === 0 ? (
            <tr className="border-t border-contour/40">
              <td colSpan={5} className="py-3 text-ink-soft">
                No drafts yet. Verify a professor first, then queue a draft from their page.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
