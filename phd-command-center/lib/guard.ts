import "server-only";

import { redirect } from "next/navigation";

import { isAllowedEmail } from "@/lib/allowlist";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

export interface Viewer {
  email: string;
}

function isFrameworkSignal(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  );
}

/**
 * The data access layer check (Next.js authentication guide): every dashboard page and every
 * private route handler calls this, close to the data, rather than trusting the proxy redirect.
 */
export async function currentViewer(): Promise<Viewer | null> {
  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    if (!isAllowedEmail(email, serverEnv().AUTH_ALLOWED_EMAILS)) return null;
    return { email: email as string };
  } catch (error: unknown) {
    // Next.js signals control flow with thrown errors carrying a `digest` — bailing out of static
    // rendering, redirects, not-found. Swallowing those would break rendering and could let a
    // private page be prerendered, so they are re-thrown untouched.
    if (isFrameworkSignal(error)) throw error;

    // A genuine failure to resolve the session or the environment means no viewer is established.
    // Answering "not authorised" is both truthful and safe: throwing would return a 500 carrying
    // configuration detail to an anonymous caller. The cause is still logged.
    console.error("Could not establish a viewer:", error);
    return null;
  }
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
