# PhD command center

Two products in one Next.js app, for Rami El Khatib's Fall 2027 PhD applications:

- **A public academic site** (`/`, `/research`, `/projects`, `/experience`, `/cv`, `/contact`) that
  professors and admissions committees reach from his emails and CV.
- **A private command center** (`/dashboard`) that finds programs and professors, drafts outreach
  emails and tailored CVs for him to edit, and tracks every deadline — behind GitHub sign-in
  restricted to one email address.

The brief is `../PROMPT.md`; the rules every session follows are `../CLAUDE.md`; the plan is
`../docs/plan/`.

## The two rules the code enforces

1. **Nothing is invented about Rami.** Every fact lives in `data/profile.ts` with a stable id.
   Generated text records the ids it used, and `lib/integrity/` re-checks them server-side before
   anything is published or exported. A fact marked `needs_confirmation` is blocked from the public
   site and from PDF export until Rami answers.
2. **Nothing external is guessed.** Every program or professor field carries its source URL and a
   short evidence snippet. Unknown means `null`, never a plausible guess — and no email address is
   ever derived from a name pattern.

## Setup

`SETUP.md` is the full runbook, about 40 minutes. In short:

```bash
pnpm install
cp .env.example .env.local     # then fill it in
pnpm db:migrate                # apply migrations
pnpm db:seed                   # load the §7 programs, all unverified
pnpm dev
```

`AUTH_ALLOWED_EMAILS` is the whole access model: only those addresses can sign in. GitHub OAuth
needs an OAuth app whose callback URL is `<site>/api/auth/callback/github`. If the GitHub account's
email is private, the provider reads the primary address through the API, so the allowlist still
matches.

## Commands

| Command            | Purpose                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `pnpm dev`         | Dev server                                                                 |
| `pnpm verify`      | The gate: typecheck, lint, unit tests, production build                    |
| `pnpm test`        | Vitest unit tests                                                          |
| `pnpm test:e2e`    | Playwright, at 390px and 1440px                                            |
| `pnpm db:generate` | Generate a migration from a schema change                                  |
| `pnpm db:migrate`  | Apply migrations (never drops; `drizzle-kit push` is deliberately unwired) |
| `pnpm db:seed`     | Seed programs idempotently, without resetting anything Rami has verified   |
| `pnpm format`      | Prettier                                                                   |

## Architecture

```
app/(public)      public site, server-rendered, no database dependency
app/dashboard     private; every page calls requireViewer() next to its data
app/api           route handlers; private prefixes return 401, not a redirect
proxy.ts          optimistic cookie redirect + noindex headers (not the security boundary)
lib/env.ts        Zod-validated environment, parsed lazily so the build needs no secrets
lib/integrity/    fact-id checking and employment-date checks — pure, unit tested
data/profile.ts   the only source of facts about Rami
data/seed-programs.ts  PROMPT.md §7, every row unverified
db/               Drizzle schema and migrations
```

**Background work** (from phase 4) runs as small steps in a `jobs` table rather than one long
request. A worker claims a job with `FOR UPDATE SKIP LOCKED`, runs one step, and persists. On
Vercel's Hobby plan cron fires only once a day, so the primary path is the dashboard's "Run queue"
button, which drains the queue for up to ~240s while the UI polls; cron handles maintenance.

**Cost control**: every AI step checks month-to-date spend in `ai_usage` against
`AI_MONTHLY_BUDGET_USD` before calling the model, and pauses the job instead of overspending. Prices
live in one table (`lib/ai/pricing.ts`), taken from the published rates on 12 September 2026; a
model with no price on file raises rather than being costed at zero.

**Two AI rules the code enforces.** A structured call that fails schema validation is retried once
with the error, then marked `needs_review` — it never writes a guess. And no code path may call a
mail-send endpoint: `tests/unit/no-send.test.ts` walks the source and fails if one appears.

## OpenAlex

OpenAlex is metered: about $0.001 per request, $1 of free usage per account per day, and a **free
API key raises that tenfold**. Set `OPENALEX_API_KEY` before running discovery — without it, every
search shares an anonymous budget that is usually already spent, and the job pauses with the retry
time rather than failing. Each response reports `meta.cost_usd`, which discovery records in its
result.

## Private data

Sensitive values are never written to a file in git. A fact declares `valueFrom: "PROFILE_PHONE"`
and the value is read from the environment at request time, server-side only. Program and professor
records live only in the database.

## Status

All ten phases built. Phase 10 is deploy-_ready_: the deploy itself needs Rami's accounts — see `SETUP.md`.

- **Phase 1, foundation**: app, tokens, schema and migrations, auth with allowlist, env validation,
  profile and seed data.
- **Phase 2, public site**: six pages built only from public, confirmed facts; a contour hero that
  responds to the pointer; OG image, sitemap, robots, JSON-LD.
- **Phase 3, CV engine**: the master academic CV as a checkable document model, a two-page PDF, the
  integrity checker that blocks export, and a diff showing what the open confirmations cost.
- **Phase 5, program finder**: extraction with per-field evidence, a shown rubric, refresh with a
  diff, and CSV and calendar exports that carry each deadline's verification status.
- **Phase 8, statements and tracker**: statements under enforced word limits, checklists generated
  from what a program actually asks for, and a Kanban that only ever tracks.
- **Phase 9, hardening**: security headers, rate limits on the endpoints that spend, error
  boundaries, and a full JSON backup.
- **Phase 10, deploy**: CI running the gate on every push, `pnpm preflight`, and `SETUP.md`.
- **Phase 7, outreach**: drafts checked against the profile and the professor's verified papers,
  near-duplicate detection between letters, and a workflow that ends at copy and a mailto link.
- **Phase 6, professor finder**: the OpenAlex client, the transparent fit rubric, and faculty-page
  verification where an email survives only if it appears verbatim in its own supporting quote.
- **Phase 4, AI core**: the Claude client, structured output with one retry, web search and fetch
  with `pause_turn` resumption and in-body error detection, priced usage logging against a hard
  monthly cap, and the Postgres job queue with its worker.

182 unit tests and 59 end-to-end tests pass. `pnpm report` writes the standing status report to `../docs/plan/status-report.md`. Lighthouse on every public page: performance 97–99,
accessibility 100, best practices 100, SEO 100.

**The site is currently withholding Rami's current AUB role, the positioning sentence, the
certifications and any contact address**, because those facts are not confirmed, and **the CV
export is blocked** for the last of those: a CV with no way to reply to it is not exportable. The
dashboard lists each item with the question that would release it. See
`../docs/plan/open-questions.md`.

PDFs are streamed from `/api/cv/export` today. Storing them in Vercel Blob lands with the tailored
variants, which are the first thing that needs a stored file.
