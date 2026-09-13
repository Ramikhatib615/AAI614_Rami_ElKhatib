# Phase 0 — plan

Companion docs: `docs/plan/design-system.md` (tokens, wireframes),
`docs/plan/open-questions.md` (the `[CONFIRM]` list and integrity flags found in the CV data).
Brief: `PROMPT.md`. Rules for future sessions: `CLAUDE.md`.

---

## 1. Where the code lives

This repository is Rami's AAI614 coursework repo (four notebooks and two text files at the root).
Dropping a Next.js app at the root would bury that work under `package.json`, `app/`, `node_modules/`.

**Proposal:** the app lives in `phd-command-center/`, and Vercel's project **Root Directory** is set
to that folder. Vercel supports this natively; nothing else changes. The coursework at the root is
untouched, and `git log` keeps one history.

**Worth a decision from Rami (see §8):** `PROMPT.md` §10 says "private GitHub repository", but this
repo is a course repo and likely public. No secret ever enters git either way (`.env.example` only),
so a public repo is safe — but the dashboard's *purpose* (which professors he is contacting, which
programs he is chasing) becomes readable from the code and seed data. A separate private repo is the
cleaner home; this session is scoped to this repo, so the default below is the subdirectory.

```
AAI614_Rami_ElKhatib/
├─ PROMPT.md                    ← canonical brief
├─ CLAUDE.md                    ← rules for future Claude sessions
├─ docs/plan/                   ← this plan, design system, open questions
├─ *.ipynb, notes.txt, …        ← AAI614 coursework, untouched
└─ phd-command-center/          ← Vercel Root Directory
   ├─ app/
   │  ├─ (public)/              page.tsx · research · projects · experience · cv · contact
   │  ├─ dashboard/             layout.tsx (auth guard + noindex) · page.tsx
   │  │                         programs · professors · outreach · cv · statements ·
   │  │                         applications · jobs · settings
   │  ├─ api/
   │  │  ├─ auth/[...nextauth]/
   │  │  ├─ jobs/               POST enqueue · GET status · POST drain (user-triggered worker)
   │  │  ├─ programs/ professors/ outreach/ cv/ statements/ applications/
   │  │  ├─ export/             csv · ics · backup.json
   │  │  └─ cron/               worker · refresh · digest   (CRON_SECRET required)
   │  ├─ opengraph-image.tsx    next/og
   │  ├─ sitemap.ts  robots.ts
   │  └─ globals.css            design tokens as CSS custom properties
   ├─ components/
   │  ├─ sheet/                 Plate, Neatline, StationMark, Legend, StatusMark, ContourField
   │  ├─ public/                Hero, ProjectCase, Timeline, CvEmbed
   │  └─ dashboard/             DeadlineList, FitBar, ProvenancePanel, JobProgress, DiffView
   ├─ lib/
   │  ├─ ai/                    client · budget · structured (tool + Zod) · websearch ·
   │  │                         prompts/ · usage
   │  ├─ jobs/                  queue · worker · handlers/{program,professor,outreach,cv,…}
   │  ├─ sources/               openalex · semanticscholar · fetch (cache, UA, rate limit)
   │  ├─ scoring/               program-fit · professor-fit  (pure, unit-tested)
   │  ├─ integrity/             checker · similarity · facts (fact-id resolution)
   │  ├─ pdf/                   cv-document · render
   │  ├─ calendar/              ics
   │  ├─ auth.ts  env.ts  db.ts
   ├─ db/                       schema.ts · migrations/ · seed.ts
   ├─ data/                     profile.ts · seed-programs.ts
   ├─ tests/                    unit/ · e2e/
   └─ vercel.json  drizzle.config.ts  playwright.config.ts  vitest.config.ts
```

Pure logic (`scoring/`, `integrity/`, `calendar/`, fact resolution) is deliberately free of I/O so
the rules that matter most are unit-testable without mocking a database or an API.

---

## 2. Job architecture

Verified platform limits (Vercel docs, fetched 11 Sep 2026):

| | Cron minimum interval | Cron precision | Function max duration |
|---|---|---|---|
| Hobby | **once per day** | ±59 min | 300s (default and max) |
| Pro | once per minute | per-minute | 300s default, 800s max |

A daily-only cron on Hobby is the single biggest architectural constraint, and it is why the queue
below is driven by **both** cron and the dashboard: Rami presses "Run queue", the browser holds a
`POST /api/jobs/drain` open while the worker drains for up to ~240s, and the UI polls for progress.
Cron then only has to catch scheduled maintenance (refresh, digest, follow-up reminders).

### Table

`jobs`: `id, type, payload jsonb, status (queued|running|succeeded|failed|paused|cancelled),
step, totalSteps, progress, result jsonb, error, attempts, maxAttempts (3), priority,
dedupeKey, runAfter, lockedAt, lockedBy, parentJobId, createdAt, updatedAt`.

- Unique partial index on `dedupeKey` where `status in ('queued','running')` — enqueueing the same
  work twice is a no-op rather than a double spend.
- Claim with `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1` inside a transaction, so two workers (cron
  and a browser drain) can never run the same job.
- A handler does **one step** and returns `{ status: 'continue' | 'done', patch, children[] }`.
  The worker loops while `elapsed < 240s`, then returns; anything left stays `queued`.
- Retry: `runAfter = now() + 2^attempts minutes`, up to 3 attempts, then `failed` with the error
  visible in `/dashboard/jobs`.
- Stale lock recovery: `running` with `lockedAt < now() - 10 min` → back to `queued`.
- Every step is idempotent (upsert by natural key), because a timeout can replay a step.

### Job types and fan-out

```
program.discover   {region, interest}      → n × program.extract {url}
program.extract    {url}                   → upsert program (dedupe: university+program+cycle)
                                           → program.score {programId}
program.refresh    {programId}             → re-fetch sources, diff, mark outdated if changed
professor.discover {topic, institutionId?} → n × professor.enrich {openAlexAuthorId}
professor.enrich   {openAlexAuthorId}      → professor.verify_page {professorId}
professor.verify_page {professorId}        → confirm post, official email (only if published),
                                             recruiting signal → professor.score
outreach.draft     {professorId}           → requires ≥1 verified paper; similarity check
cv.tailor          {targetType, targetId}  → integrity check → pdf render → Blob
statement.draft    {type, targetId, wordLimit}
maintenance.weekly {}                      → enqueues refresh/digest/follow-up work
```

### Cost control (every AI step)

1. Read month-to-date `sum(estimatedCostUsd)` from `ai_usage`.
2. If `>= AI_MONTHLY_BUDGET_USD`, the job goes to `paused` with reason `budget_exceeded` and the
   dashboard shows it; nothing is silently dropped and nothing is silently spent.
3. After the call, write `{jobId, model, inputTokens, outputTokens, cacheRead/Write, searchCount,
   estimatedCostUsd}`. Prices live in one table in `lib/ai/usage.ts` so they are easy to correct.
4. Prompt caching on the static system prompt + profile block, which is the bulk of every request.

### `vercel.json` crons

```
Pro:    */5 * * * *  /api/cron/worker      0 4 * * 1  /api/cron/refresh   0 6 * * 1 /api/cron/digest
Hobby:  0 4 * * *    /api/cron/worker      (worker enqueues refresh + digest when due)
```
All cron routes verify `CRON_SECRET`; `maxDuration = 300`.

---

## 3. Data flow for the two rules that matter

**Provenance.** Nothing reaches a `programs` or `professors` column unless the extraction tool
returned `{value, sourceUrl, evidenceSnippet, fetchedAt}` for it. The Zod schema enforces this
shape, so a field without a source cannot type-check its way into the database; missing values are
`null` + `not_found`. The UI renders the snippet and the link next to every value.

**Fact IDs.** `data/profile.ts` is the only fact store. Generation prompts receive the profile as a
list of `{id, text, visibility, status}` and the output schema demands `factIds` per sentence.
`lib/integrity/checker.ts` then re-validates server-side: unknown ID, empty ID list, or a
`needs_confirmation` fact → export blocked; unevidenced metric or overlapping dates without a
part-time flag → warning. The checker runs on save *and* again before PDF render, so a hand-edit in
the browser cannot bypass it.

---

## 4. Phase schedule (same as `PROMPT.md` §9)

Each phase ends with `pnpm verify` output shown, a commit, and a pause for approval.

| Phase | Delivers | Depends on |
|---|---|---|
| 1 Foundation | app skeleton, tokens, Drizzle schema + migrations, Auth.js allowlist, Zod env, profile + seed | DB URL, auth provider |
| 2 Public site | six public pages, hero, OG, sitemap, JSON-LD | confirmed public facts |
| 3 CV engine | master CV, PDF, integrity checker, diff | §2.1 answers to be *useful*; buildable without them |
| 4 AI core | client, structured output, web search/fetch, `pause_turn`, budget, job runner | `ANTHROPIC_API_KEY` |
| 5 Program finder | discovery → extraction → dedupe → score → refresh, table/map/calendar, CSV + ICS | 4 |
| 6 Professor finder | OpenAlex + S2, page verification, scoring, detail pages | 4 |
| 7 Outreach | drafts, similarity, workflow, follow-ups, optional Outlook *draft* | 3, 6 |
| 8 Statements + tracker | SoP/research/motivation, Kanban, checklists, referees, digest | 3, 5 |
| 9 Hardening | rate limits, headers, error/empty states, axe, JSON backup | all |
| 10 Deploy | Vercel + Neon + env + cron + smoke test | all |

Phases 5 and 6 are independent of each other and both depend only on 4; if Rami wants the professor
side sooner (it feeds outreach, which is the time-sensitive part), they can swap.

---

## 5. Testing

- **Unit (Vitest):** scoring rubrics, integrity checker, fact resolution, ICS output, dedupe keys,
  cost maths, env parsing, job state machine, AI structured-output handling against recorded
  fixtures (success, schema-invalid retry, `pause_turn`, `web_search_tool_result_error`, budget cap).
- **E2E (Playwright, preinstalled Chromium):** `/dashboard` redirects when signed out; public pages
  at 390px and 1440px with screenshots; CV PDF downloads; outreach draft cannot be sent.
- **Guard tests:** grep the bundle for the phone number; grep the source for any mail-send endpoint;
  assert every public-page fact is `public` + `confirmed`.

---

## 6. Risks

| Risk | Handling |
|---|---|
| **ELLIS Institute Finland closes 21 Sep 2026 — 10 days away** | This is the one deadline the software cannot help with in time. If it is a real target, verify and apply manually this week; the app tracks it afterwards. |
| Hobby cron runs once a day | Browser-driven "Run queue" drain is the primary path; cron is maintenance only. |
| AI cost drift on wide sweeps | Hard monthly cap, per-job estimate shown before running a sweep, `max_uses` on web search. |
| Extraction quality on messy admissions pages | Structured output + one retry, then `needs_review`; no guessing, `null` + `not_found` instead. |
| Seed data is a year old (cycles have moved) | Every seed row ships `unverified` with `lastVerifiedAt = null`; the refresh job re-fetches before any of it is used. |
| Public repo exposes outreach targets | Decision in §8; otherwise keep professor/program data out of git (DB only) and commit no personal seed. |
| Auth.js magic link needs an email sender | Recommend GitHub OAuth for a single-user app: no email infrastructure, and Rami already has an account. |

---

## 7. What Phase 0 delivered

- `PROMPT.md` — brief preserved in-repo as the source of truth.
- `CLAUDE.md` — commands, conventions, integrity rules, the gate.
- `docs/plan/design-system.md` — two-pass token plan, contrast ratios computed, wireframes.
- `docs/plan/contrast.py` — the script behind those ratios, re-runnable.
- `docs/plan/open-questions.md` — the `[CONFIRM]` list plus the integrity flags already visible in
  the CV data.
- This plan.

No application code yet, per the brief.

---

## 8. Decisions — answered 12 Sep 2026

1. **Repo home: a separate private repo** (`Ramikhatib615/phd-command-center`). Rami creates it;
   this session's GitHub app cannot (`403 Resource not accessible by integration`). Until it
   exists, work is committed to the `claude/phd-app-command-center-0maw1c` branch of this **public**
   course repo so nothing is lost — which is why Rami's one sensitive value (the phone number) is
   never written to a file in git. See §9.
2. **Auth: GitHub OAuth** with an email allowlist. No email sender needed.
3. **Vercel plan: Hobby.** Confirms the design above — the browser-driven `POST /api/jobs/drain` is
   the primary worker path and the daily cron is maintenance only. `maxDuration = 300`, the Hobby
   ceiling. This design runs unchanged on Pro later, just with a more frequent cron.
4. **Professor finder before program finder.** Phase 6 moves ahead of Phase 5, because outreach is
   the time-critical path (emails should go out Sep–Nov 2026). Both depend only on Phase 4, so the
   swap costs nothing. Revised order: 1 → 2 → 3 → 4 → **6** → 7 → **5** → 8 → 9 → 10.
5. The `[CONFIRM]` answers in `docs/plan/open-questions.md` are still open. Phases 1–4 proceed
   without them; Phase 2's public pages and Phase 3's CV approval cannot finish without them, since
   unconfirmed facts are blocked from both by design.

---

## 9. Private data in a public repo (interim)

Until `phd-command-center` exists, code lands in a public repo. The rule applied:

- Facts already on Rami's CV and LinkedIn (employers, titles, dates, education, skills) are
  committed normally — he sends them to strangers by design.
- A fact whose value is genuinely sensitive is **never written to a file in git**. It is declared in
  `data/profile.ts` with `valueFrom: 'PROFILE_PHONE'` instead of `value`, and resolved at runtime,
  server-side only, from the environment. Today that is the phone number; referees (third-party
  personal data) will use the same mechanism when they arrive, as will the GPA if Rami wants it
  kept out of git.
- Nothing about which professors or programs he is targeting is committed: that data lives only in
  the database.
