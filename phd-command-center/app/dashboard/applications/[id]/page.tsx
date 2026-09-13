import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { STAGES, getApplication, setStage, toggleChecklistItem } from "@/lib/applications/store";
import { completion } from "@/lib/applications/checklist";
import { requireViewer } from "@/lib/guard";
import { getProgram } from "@/lib/programs/store";

export const metadata = { title: "Application", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function toggle(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  await toggleChecklistItem(id, Number(formData.get("index")));
  revalidatePath(`/dashboard/applications/${id}`);
}

async function moveStage(formData: FormData) {
  "use server";
  await requireViewer();
  const id = String(formData.get("id"));
  const stage = String(formData.get("stage")) as (typeof STAGES)[number];
  if (!STAGES.includes(stage)) return;
  await setStage(id, stage);
  revalidatePath(`/dashboard/applications/${id}`);
}

export default async function ApplicationPage({
  params,
}: PageProps<"/dashboard/applications/[id]">) {
  const { id } = await params;
  const application = await getApplication(id);
  if (!application) notFound();
  const program = await getProgram(application.programId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{program?.university ?? "Application"}</h1>
          <p className="mt-1 text-sm text-ink-soft">{program?.programName}</p>
        </div>
        <p className="font-mono text-xs text-ink-soft">
          {Math.round(completion(application.checklist) * 100)}% complete
        </p>
      </header>

      <form action={moveStage} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={application.id} />
        {STAGES.map((stage) => (
          <button
            key={stage}
            type="submit"
            name="stage"
            value={stage}
            className={`plate px-3 py-1.5 text-sm ${stage === application.stage ? "plate-raised bg-sunk" : "bg-ground"}`}
          >
            {stage}
          </button>
        ))}
      </form>

      <section className="plate plate-ticks p-5">
        <h2 className="font-display text-lg">Checklist</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {application.checklist.map((item, index) => (
            <li key={item.item} className="flex items-baseline gap-3">
              <form action={toggle}>
                <input type="hidden" name="id" value={application.id} />
                <input type="hidden" name="index" value={index} />
                <button
                  type="submit"
                  aria-label={item.done ? "Mark not done" : "Mark done"}
                  className="font-mono"
                >
                  {item.done ? "▲" : "○"}
                </button>
              </form>
              <span className={item.done ? "text-ink-soft line-through" : ""}>
                {item.item}
                {item.dueDate ? (
                  <span className="ml-3 font-mono text-xs text-ink-soft">by {item.dueDate}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {program?.applicationUrl ? (
        <a
          className="plate bg-ground px-4 py-2 text-sm"
          href={program.applicationUrl}
          rel="noreferrer"
        >
          Open the official portal
        </a>
      ) : null}
    </div>
  );
}
