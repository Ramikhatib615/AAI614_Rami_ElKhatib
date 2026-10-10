import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

import { isAllowedEmail } from "@/lib/allowlist";
import { serverEnv } from "@/lib/env";

/**
 * Single-user auth: GitHub OAuth, then an email allowlist. Sessions are JWTs, so there is no
 * database dependency on the login path.
 *
 * The config is a function so `serverEnv()` runs per request rather than at import time — that
 * keeps `next build` working without secrets.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = serverEnv();
  const allowed = env.AUTH_ALLOWED_EMAILS;

  return {
    providers: [
      GitHub({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
      }),
    ],
    secret: env.AUTH_SECRET,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
    pages: { signIn: "/signin", error: "/signin" },
    callbacks: {
      signIn({ user }) {
        // No email, or an address that is not Rami's, never gets a session.
        return isAllowedEmail(user.email, allowed);
      },
      jwt({ token, user }) {
        if (user?.email) token.email = user.email.toLowerCase();
        return token;
      },
      session({ session, token }) {
        if (token.email) session.user.email = token.email;
        return session;
      },
    },
  };
});
