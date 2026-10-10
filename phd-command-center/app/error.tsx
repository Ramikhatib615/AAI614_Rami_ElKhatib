"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
      <div className="plate plate-ticks p-8">
        <h1 className="font-display text-2xl">Something went wrong</h1>
        <p className="measure mt-3 text-sm text-ink-soft">
          The page could not be built. Nothing was changed or sent.
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
          className="plate mt-6 bg-ground px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
