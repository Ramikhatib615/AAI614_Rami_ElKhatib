import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env";
import { handlers } from "@/lib/jobs/handlers";
import { drainQueue } from "@/lib/jobs/worker";

export const maxDuration = 300;

const DENIED = Response.json(
  { error: "unauthorized" },
  { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow" } },
);

function presentedSecretMatches(provided: string): boolean {
  try {
    const expected = serverEnv().CRON_SECRET;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on a length mismatch, which is itself a failed comparison.
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    // No resolvable secret means nothing can authenticate as cron.
    return false;
  }
}

/** Vercel Cron calls this with the secret as a bearer token. Nothing else may. */
export async function GET(request: Request): Promise<Response> {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided || !presentedSecretMatches(provided)) return DENIED;

  const summary = await drainQueue(handlers);
  return Response.json(summary, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
}
