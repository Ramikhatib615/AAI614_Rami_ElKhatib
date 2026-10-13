/**
 * Pure allowlist check, kept out of `lib/auth.ts` so it can be unit tested without loading the
 * Next.js server runtime.
 */
export function isAllowedEmail(
  email: string | null | undefined,
  allowed: readonly string[],
): boolean {
  if (!email) return false;
  return allowed.includes(email.toLowerCase());
}
