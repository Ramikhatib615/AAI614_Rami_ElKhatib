import { monthToDateSpendUsd } from "@/lib/ai/usage";
import { serverEnv } from "@/lib/env";
import { requireViewerApi } from "@/lib/guard";
import { enqueueLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { enqueue } from "@/lib/jobs/queue";
import { recentJobs } from "@/lib/jobs/queue";
import { enqueueSchema } from "@/lib/jobs/types";

export async function GET(): Promise<Response> {
  const guard = await requireViewerApi();
  if ("response" in guard) return guard.response;

  const [jobs, spentUsd] = await Promise.all([recentJobs(), monthToDateSpendUsd()]);
  return Response.json(
    { jobs, spend: { spentUsd, capUsd: serverEnv().AI_MONTHLY_BUDGET_USD } },
    { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  const guard = await requireViewerApi();
  if ("response" in guard) return guard.response;

  const limit = enqueueLimiter.check(guard.viewer.email);
  if (!limit.ok) return rateLimitResponse(limit);

  const parsed = enqueueSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400, headers: { "X-Robots-Tag": "noindex, nofollow" } },
    );
  }

  const id = await enqueue(parsed.data);
  return Response.json(
    { id, deduplicated: id === null },
    { status: id ? 201 : 200, headers: { "X-Robots-Tag": "noindex, nofollow" } },
  );
}
