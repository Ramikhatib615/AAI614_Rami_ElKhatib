import { QueueRunner } from "@/components/dashboard/queue-runner";
import { monthToDateSpendUsd } from "@/lib/ai/usage";
import { serverEnv } from "@/lib/env";
import { recentJobs } from "@/lib/jobs/queue";

export const metadata = { title: "Queue", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const [jobs, spentUsd] = await Promise.all([recentJobs(), monthToDateSpendUsd()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl">Queue</h1>
        <p className="measure mt-1 text-sm text-ink-soft">
          Work runs in small steps. On the Hobby plan cron fires once a day, so pressing “Run queue”
          is the usual way to move it along; it drains for up to four minutes per press.
        </p>
      </header>

      <section className="plate plate-ticks p-5">
        <QueueRunner
          initial={{
            jobs: jobs.map((job) => ({
              id: job.id,
              type: job.type,
              status: job.status,
              progress: job.progress,
              error: job.error,
              createdAt: job.createdAt.toISOString(),
            })),
            spend: { spentUsd, capUsd: serverEnv().AI_MONTHLY_BUDGET_USD },
          }}
        />
      </section>
    </div>
  );
}
