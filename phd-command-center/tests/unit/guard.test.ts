import { describe, expect, it } from "vitest";

/**
 * The guard must never swallow a Next.js control-flow error. Those are thrown to bail out of
 * static rendering or to redirect, and catching one would break rendering — or let a private page
 * be prerendered. This checks the predicate the guard uses.
 */
function isFrameworkSignal(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  );
}

describe("framework signal detection", () => {
  it("recognises a dynamic-usage bailout", () => {
    const error = Object.assign(new Error("Dynamic server usage"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    expect(isFrameworkSignal(error)).toBe(true);
  });

  it("recognises a redirect", () => {
    expect(
      isFrameworkSignal(
        Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;replace;/signin" }),
      ),
    ).toBe(true);
  });

  it("does not mistake an ordinary failure for one", () => {
    expect(isFrameworkSignal(new Error("DATABASE_URL is not set"))).toBe(false);
    expect(isFrameworkSignal(null)).toBe(false);
    expect(isFrameworkSignal({ digest: 42 })).toBe(false);
  });
});
