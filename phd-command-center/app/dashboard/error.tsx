"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const looksLikeConfig = /DATABASE_URL|ANTHROPIC_API_KEY|Invalid environment/i.test(error.message);

  return (
    <div className="plate plate-ticks p-6">
      <h1 className="font-display text-xl">This page could not load</h1>
      <p className="measure mt-3 text-sm text-ink-soft">
        {looksLikeConfig
          ? "It looks like the environment is not fully configured. Run pnpm preflight, or check the variables in SETUP.md."
          : "Nothing was changed or sent. The details are in the server logs."}
        {error.digest ? (
          <>
            {" "}
            Reference <span className="font-mono text-xs">{error.digest}</span>.
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={reset}
        className="plate mt-5 bg-ground px-4 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
