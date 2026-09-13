"use client";

import { useCallback, useEffect, useState } from "react";

interface JobRow {
  id: string;
  type: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
}

interface JobsPayload {
  jobs: JobRow[];
  spend: { spentUsd: number; capUsd: number };
}

/**
 * On the Hobby plan cron fires once a day, so this button is the main way work runs: it holds a
 * request open while the worker drains, and polls for progress meanwhile.
 */
export function QueueRunner({ initial }: { initial: JobsPayload }) {
  const [data, setData] = useState(initial);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/jobs", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as JobsPayload);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [running, refresh]);

  async function run() {
    setRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/jobs/drain", { method: "POST" });
      const summary = (await response.json()) as {
        claimed: number;
        succeeded: number;
        paused: number;
        failed: number;
        errors: string[];
      };
      setMessage(
        `${summary.claimed} claimed, ${summary.succeeded} finished, ${summary.paused} paused, ${summary.failed} failed.` +
          (summary.errors.length ? ` First error: ${summary.errors[0]}` : ""),
      );
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "The worker could not be reached.");
    } finally {
      setRunning(false);
      await refresh();
    }
  }

  const pct = Math.min(100, Math.round((data.spend.spentUsd / data.spend.capUsd) * 100));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="plate plate-raised bg-ground px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {running ? "Running the queue…" : "Run queue"}
        </button>
        <p className="font-mono text-xs text-ink-soft">
          AI spend this month ${data.spend.spentUsd.toFixed(2)} of ${data.spend.capUsd.toFixed(2)} (
          {pct}%)
        </p>
      </div>

      {message ? <p className="measure text-sm text-ink-soft">{message}</p> : null}

      <table className="w-full text-sm">
        <caption className="sr-only">Recent jobs</caption>
        <thead className="text-left text-xs text-ink-soft">
          <tr>
            <th scope="col" className="py-2">
              Job
            </th>
            <th scope="col">Status</th>
            <th scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {data.jobs.map((job) => (
            <tr key={job.id} className="border-t border-contour/40">
              <td className="py-2 font-mono text-xs">{job.type}</td>
              <td
                className={job.status === "failed" || job.status === "paused" ? "status-warn" : ""}
              >
                {job.status}
                {job.error ? (
                  <span className="block text-xs text-ink-soft">{job.error}</span>
                ) : null}
              </td>
              <td className="font-mono text-xs">{Math.round(job.progress * 100)}%</td>
            </tr>
          ))}
          {data.jobs.length === 0 ? (
            <tr className="border-t border-contour/40">
              <td colSpan={3} className="py-3 text-ink-soft">
                Nothing queued yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
