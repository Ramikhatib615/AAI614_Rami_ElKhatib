import "server-only";

import { redirect } from "next/navigation";

import { isAllowedEmail } from "@/lib/allowlist";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

export interface Viewer {
  email: string;
}

/**
 * The data access layer check (Next.js authentication guide): every dashboard page and every
 * private route handler calls this, close to the data, rather than trusting the proxy redirect.
 */
export async function currentViewer(): Promise<Viewer | null> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!isAllowedEmail(email, serverEnv().AUTH_ALLOWED_EMAILS)) return null;
  return { email: email as string };
}

/** For pages: redirects to sign-in when there is no allowed viewer. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await currentViewer();
  if (!viewer) redirect("/signin");
  return viewer;
}

/** For route handlers: returns a 401 instead of a redirect. */
export async function requireViewerApi(): Promise<{ viewer: Viewer } | { response: Response }> {
  const viewer = await currentViewer();
  if (!viewer) {
    return {
      response: Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow" } },
      ),
    };
  }
  return { viewer };
}
