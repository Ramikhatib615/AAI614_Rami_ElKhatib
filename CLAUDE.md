# CLAUDE.md — PhD Application Website + Command Center

Project brief: `PROMPT.md` (canonical). Plan: `docs/plan/`. Read both before changing anything.

The app lives in `phd-command-center/` (subdirectory of this course repo; Vercel Root Directory
points at it). The notebooks at the repo root are unrelated AAI614 coursework — do not touch them.

## Commands

Run from `phd-command-center/`:

| Command | Purpose |
|---|---|
| `pnpm dev` | Local dev server |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (flat config) |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright (uses preinstalled Chromium; never run `playwright install`) |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply migrations (never auto-drop, never `push` against production) |
| `pnpm db:seed` | Seed profile-derived data and the §7 programs as `unverified` |
| `pnpm verify` | The gate: typecheck + lint + test + build |

## Verification gate

No phase is done until `pnpm verify` passes with zero new warnings and no `TODO` in delivered
paths, plus that phase's extra criteria in `PROMPT.md` §9. Show real command output. Never
disable a test, a lint rule, or a type check to get green — fix the cause. Commit at the end of
each phase and wait for Rami's approval before starting the next one.

## Integrity rules (highest priority — these override convenience)

1. **Facts about Rami come only from `data/profile.ts`.** Every fact has a stable `id`,
   `visibility` (`public` | `private`) and `status` (`confirmed` | `needs_confirmation`).
   Any generated sentence stores the `factIds` it used. No fact ID → the sentence cannot ship.
2. **Tailoring selects, reorders, shortens, or rephrases. It never adds.** No new skill, metric,
   title, date, publication, or outcome may appear that is not already a fact.
3. **Never invent program or professor data.** Every non-null field carries `{url, evidenceSnippet
   (≤25 words), fetchedAt}`. Unknown → `null` with status `not_found`. Never guess.
4. **Never guess an email address** from a name pattern. Only addresses published on an official
   university or lab page, with `emailSourceUrl` stored.
5. **Every cited paper must be verified** through OpenAlex, a DOI, or the publisher page.
6. **Flag, don't fix silently.** Inconsistencies (overlapping dates, unevidenced metrics, inflated
   experience totals) surface as UI warnings for Rami to decide on.
7. **Nothing consequential is automated.** Emails are drafts only — no code path may call a send
   endpoint (Microsoft Graph `sendMail`, Gmail `send`, Resend to a third party). Resend is only
   for digests to Rami's own address. Applications are submitted by Rami, on the official portal.
8. **Public site shows only facts with `visibility: public` AND `status: confirmed`.** Never the
   phone number, referees, GPA (until approved), or application status.

## Conventions

- TypeScript `strict`, no `any` in app code (`@typescript-eslint/no-explicit-any` is an error).
- Zod at every boundary: env, route handlers, external API responses, and all AI JSON output.
- Server Components by default; `"use client"` only for interactive leaves.
- Secrets are server-only. Nothing secret may be read in a client component or `NEXT_PUBLIC_*`.
- Dates stored as UTC timestamps; deadlines keep their source timezone string alongside.
- Design tokens live in `app/globals.css` as CSS custom properties, mapped into Tailwind theme.
  Use token names (`--ink`, `--accent`, …), never raw hex in components. See
  `docs/plan/design-system.md` — including the list of generic patterns that are banned here.
- Long AI work is split into small jobs; a single request never does a whole sweep.
- Before writing AI code, check the current Claude docs for model IDs and tool version strings
  (`https://platform.claude.com/docs`) instead of relying on memory.

## Git

- Branch: `claude/phd-app-command-center-0maw1c`. Push with `git push -u origin <branch>`.
- Do not open a pull request unless Rami asks.
- Never commit `.env*` (except `.env.example`), generated PDFs, or `node_modules/`.
