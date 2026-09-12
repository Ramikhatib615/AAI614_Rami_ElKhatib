import { requireViewerApi } from "@/lib/guard";
import { handlers } from "@/lib/jobs/handlers";
import { drainQueue } from "@/lib/jobs/worker";

/**
 * The primary worker path on the Hobby plan, where cron fires only once a day: Rami presses "Run
 * queue" and this drains for up to four minutes while the dashboard polls.
 */
export const maxDuration = 300;

export async function POST(): Promise<Response> {
  const guard = await requireViewerApi();
  if ("response" in guard) return guard.response;

  const summary = await drainQueue(handlers);
  return Response.json(summary, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
}
