import type { Metadata } from "next";

import { signIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  async function startSignIn() {
    "use server";
    await signIn("github", { redirectTo: "/dashboard" });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <div className="plate p-8">
        <h1 className="font-display text-2xl">Command center</h1>
        <p className="measure mt-3 text-sm text-ink-soft">
          Private. Sign in with the GitHub account whose email is on the allowlist.
        </p>
        <form action={startSignIn} className="mt-6">
          <button
            type="submit"
            className="plate plate-raised w-full px-4 py-2 text-sm font-medium hover:text-accent"
          >
            Continue with GitHub
          </button>
        </form>
      </div>
    </main>
  );
}
