# MASTER PROMPT — PhD Application Website + AI Command Center (Claude Code → Vercel)

> Canonical project brief. Sections 1 and 2 are binding: §1 are the integrity rules, §2 is the
> **only** source of truth for facts about Rami. Do not edit §2 except to record confirmations.

---

## 0. Role and mission

You are a senior full-stack engineer, product designer, and applied-AI engineer working inside Claude Code. Build and deploy two connected products for **Rami El Khatib**, who is applying to fully funded PhD programs in AI/ML for a **Fall 2027** start:

- **A. Public academic website.** A distinctive personal research site that professors and admission committees will visit from his emails and CV.
- **B. Private PhD Command Center** behind authentication. It is an AI-assisted workspace that:
  1. discovers PhD programs worldwide with requirements, funding, and deadlines, each with a source link;
  2. discovers professors whose research matches Rami's interests;
  3. drafts personalised outreach emails for Rami to review and send himself;
  4. tailors his CV (and statements) to each program or professor using only true facts;
  5. tracks every university, professor, document, and deadline in one place.

Deploy everything to **Vercel** from a GitHub repository.

---

## 1. Non-negotiable rules

### 1.1 Integrity (highest priority)
- **Never invent facts about Rami.** Every CV bullet, website claim, email sentence, or statement must trace to a record in `data/profile.ts` (each fact has an `id`). Generated text stores the fact IDs it used.
- **CV tailoring may only select, reorder, shorten, or rephrase existing facts.** It must never add skills, metrics, titles, dates, publications, or outcomes that are not in the profile.
- **Flag, don't fix silently.** If a claim is inconsistent or unverifiable (overlapping dates, inflated years of experience, unofficial job titles, metrics without evidence), add a warning in the UI and leave the decision to Rami.
- **Never fabricate program or professor data.** Every requirement, deadline, email address, stipend, or "recruiting" signal must come from a fetched source. Store the source URL, the quoted evidence snippet (short), and `lastVerifiedAt`. If it cannot be found, store `null` with status `not_found`. Never guess.
- **Never guess professor email addresses** from name patterns. Use only addresses published on official university or lab pages.
- Every paper cited in an outreach email must be verified to exist through OpenAlex, DOI, or the publisher page, with the URL stored.

### 1.2 Human-in-the-loop (no silent automation of consequential actions)
- **Emails are never sent automatically.** The system creates drafts only. Rami reviews, edits, and sends them himself (copy, `mailto:`, or an optional Outlook/Gmail *draft* via API, never a send call).
- Program and deadline records start as `unverified`. Rami marks them `verified` after checking the official page. The dashboard shows unverified deadlines with a clear warning.
- Applications are submitted manually on official portals. The app only tracks them.

### 1.3 Scraping and APIs
- Prefer official APIs: **OpenAlex** (authors, works, institutions, topics) and **Semantic Scholar Academic Graph API** (optional key). Use the **Claude API web search and web fetch server tools** for program pages and faculty pages.
- **Do not scrape Google Scholar** or any site whose terms or robots.txt forbid it. Link to Scholar profiles only when they are listed on the professor's own page.
- Respect rate limits, cache responses, set a descriptive User-Agent/contact email for OpenAlex's polite pool.

### 1.4 Security and privacy
- All `/dashboard/**` pages and all `/api/**` routes except public ones require authentication, restricted to Rami's email allowlist.
- API keys live only in server environment variables. Nothing secret reaches the client bundle.
- The public site never shows the phone number, GPA details beyond what Rami approves, referee names, or application status.
- Dashboard routes send `noindex` headers. Add rate limiting to AI endpoints and a monthly AI-spend counter with a configurable hard cap.

### 1.5 Quality
- TypeScript `strict`, no `any` in app code, Zod validation on every API boundary and every AI JSON output.
- No phase is complete until its verification gate passes (§9). If something fails, fix the root cause; do not disable tests or lint rules.
- Do not claim something works without running it. Report actual command output.

---

## 2. Candidate profile (source of truth)

Create `data/profile.ts` exporting a typed profile where **every fact has a stable `id`, a `visibility` (`public` | `private`), and a `status` (`confirmed` | `needs_confirmation`)**.

### 2.1 Data to confirm before build
| Item | Value |
|---|---|
| Official AUB job title as it appears in HR records (the CV says "Data Scientist & Contract Officer") | [CONFIRM] |
| Exact MSc GPA (currently known as 3.8–4.0 range) and whether it may appear publicly | [CONFIRM] |
| MSc thesis/capstone title, advisor, expected completion date (CV says Feb 2027) | [CONFIRM] |
| Permanent email for PhD outreach (LAU student email may expire after graduation) | [CONFIRM] |
| LinkedIn URL, GitHub URL, Google Scholar/ORCID (create ORCID if none) | [CONFIRM] |
| Whether OMT & Western Union role (Sep 2018 – Apr 2024) was part-time, given overlap with BSc and other roles | [CONFIRM] |
| Years of data/GIS experience to state (the CV says 5+; data/GIS roles listed sum to about 3.5–4 years) | [CONFIRM] |
| Evidence for metrics (~40% reporting reduction, 100% data accuracy, response-time reduction) or permission to remove them | [CONFIRM] |
| Referees (name, title, relationship) — private | [CONFIRM] |
| English test (IELTS/TOEFL) date and score; GRE plan | [CONFIRM] |
| Any preprints, reports, or theses to list as research outputs | [CONFIRM] |
| Any NLP/LLM projects (code, notebooks, repos) to showcase — needed because LLMs/NLP are research priority #1 | [CONFIRM] |
| Countries to exclude, funding minimum, family/visa constraints | [CONFIRM] |
| Professional headshot (optional) | [CONFIRM] |

### 2.2 Identity
- **Name:** Rami El Khatib
- **Location:** Beirut, Lebanon
- **Email (CV):** ramielkhatib02@lau.edu — public-use status [CONFIRM]
- **Phone:** +961 81 122 771 — `private`
- **Languages:** Arabic (native), English (full professional), French (full professional)
- **Target:** Fully funded PhD in AI/ML, Fall 2027 start
- **Research interests (ranked):** 1) LLMs / NLP; 2) GeoAI & remote sensing; 3) applied ML / data science; 4) AI for humanitarian & development work
- **Positioning idea (for review):** a surveying engineer and data scientist who moved from measuring the physical world to modelling it, combining geospatial data, public-sector analytics at the UN, and machine learning.

### 2.3 Education
1. **M.Sc. Data Science** — Lebanese American University (LAU), Lebanon — Feb 2025 – Feb 2027 (in progress). GPA 3.8–4.0 [CONFIRM exact].
2. **B.Sc. Surveying Engineering** — Lebanese International University (LIU), Lebanon — Sep 2019 – Jun 2023.

### 2.4 Experience
1. **[CONFIRM official title]** (CV: Data Scientist & Contract Officer) — American University of Beirut (AUB), Financial & Administrative Support Unit — Beirut — Nov 2025 – present
   - Built Power BI dashboards tracking 100+ research personnel (Research Associates, Assistants, academic staff); reduced manual reporting effort by ~40% [evidence CONFIRM].
   - Built data pipelines for personnel records management aligned with AUB data governance and audit standards (CV states 100% data accuracy [evidence CONFIRM]).
   - Improved time-reporting and attendance workflows in People365 for 100+ staff.
   - Designed automated academic recruitment tracking covering contracts, renewals, and staffing cycles.
   - Produced analytical reports and visualisations for senior administrators.
   - Coordinated faculty, HR, and finance units to resolve data discrepancies.
2. **Data Analyst** — United Nations ESCWA — Beirut — Oct 2024 – Oct 2025
   - Co-developed the Public Administration (PA) Index, a governance measurement framework assessing public-sector performance across 20+ Arab member states (digital transformation, governance effectiveness, social equity).
   - Authored the PA Index Project Document aligning the instrument with SDG 16 and digital governance targets.
   - Ran data collection, statistical analysis, and visualisation; produced policy briefs and analytical reports for UN senior management and member-state delegations.
   - Contributed to digital transformation advisory with a cross-cutting focus on gender equality and women's empowerment in digital ecosystems.
   - Integrated multi-source data for the Amman project across dispersed teams.
3. **GIS & Information Management Specialist** — UN-Habitat — Beirut — Jun 2024 – Oct 2024
   - Built ArcGIS Online web maps and dashboards covering 8,000+ locations across Lebanon with the Global Land Tool Network (GLTN).
   - Designed field survey instruments in Kobo Toolbox and Survey123.
   - STDM/GIZ Phase 3 land tenure project: satellite image georeferencing, raster gap resolution, weekly data validation.
   - Produced Neighbourhood Profiles, Land Cover Land Use maps, and urban farming spatial analyses.
   - Reorganised ArcGIS Online storage to improve performance and data access.
4. **GIS Engineer & Data Scientist** — Destination Trading & Contracting — Mount Lebanon — Dec 2023 – Jun 2024
   - Automated geospatial data processing pipelines with Python and SQL.
   - Built Power BI and Tableau dashboards integrating satellite imagery, GPS telemetry, and statistical data.
   - Designed and managed geospatial databases for large infrastructure projects.
5. **GIS & Geospatial Engineering Analyst** — NavLeb — Beirut — Jun 2019 – May 2020
   - Field surveys and GPS/ArcGIS analysis producing digital maps and spatial databases for infrastructure planning.
   - Delivered GIS training to colleagues.
6. **Senior Project Coordinator** — OMT & Western Union — Hammana — Sep 2018 – Apr 2024 [part-time? CONFIRM]
   - Coordinated financial and operational projects; produced performance reports and risk analyses for leadership.

### 2.5 Projects
- **Public Administration Index (UN ESCWA)** — multi-dimensional KPI framework across 20+ Arab states; Python, Excel, Power BI.
- **A Tour in Sour (UN-Habitat Sustainable Cities Initiative)** — ArcGIS Online web maps profiling 8,000+ urban locations.
- **Neighbourhood Profiles of Disadvantaged Areas** — municipal data, field surveys, and satellite imagery integrated into dashboards and reports.
- **STDM/GIZ Phase 3 — Land Tenure Mapping** — georeferencing, spatial database optimisation, weekly validation.
- **Civil Defense Location Optimization** — network analysis and coverage modelling for emergency response.
- **Land Cover Land Use (LULC) & Urban Farming Initiative** — satellite-based LULC classification and spatial analysis.
- **MSc projects / NLP projects** — [CONFIRM; add repos].

### 2.6 Skills and certifications
- **Programming & data:** Python (Pandas, NumPy, scikit-learn, GeoPandas), SQL, R
- **BI & visualisation:** Power BI, Tableau, ArcGIS Online Dashboards, Matplotlib, Plotly
- **Geospatial:** ArcGIS Pro, ArcGIS Online, QGIS, Survey123, Kobo Toolbox, SWAT
- **Data engineering:** ETL design, database architecture, data validation and cleaning, People365
- **ML & analytics:** machine learning, statistical modelling, spatial analysis, predictive analytics, regression
- **Certifications:** ESRI ArcGIS certifications; LinkedIn Learning certificates [CONFIRM names]

### 2.7 Volunteering and leadership
- **Lebanese Red Cross** — Emergency Response Team & Youth Leader. Vice President, Youth Department (2022–23); Treasurer (2019–21); General Assembly Member (2018–present). Psychological First Aid, emergency logistics, disaster risk reduction workshops in Beirut and Mount Lebanon. Scout leader.

### 2.8 Known gaps (show in dashboard "Readiness" panel, private)
- No publications yet.
- English proficiency test not yet taken.
- GRE needed for AUB ECE, many US programs, and possibly MBZUAI.
- Little visible NLP/LLM work despite that being research priority #1.

---

## 3. Tech stack

- **Framework:** Next.js (App Router) + TypeScript strict, React Server Components where suitable
- **Styling/UI:** Tailwind CSS; headless accessible primitives (Radix or shadcn/ui) restyled to the custom design system in §5 — no default component look
- **Database:** Postgres (Neon via the Vercel Marketplace) + Drizzle ORM + migrations
- **Auth:** Auth.js (email magic link or GitHub) with a single-email allowlist
- **AI:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`)
- **Validation:** Zod
- **Files:** Vercel Blob for generated PDFs
- **PDF generation:** `@react-pdf/renderer` (or Typst if justified) for CV and letters
- **Email (optional digests to Rami only):** Resend
- **Jobs:** job table in Postgres + Vercel Cron to process queued steps
- **Testing:** Vitest (unit), Playwright (end-to-end, screenshots at 390px and 1440px)
- **Tooling:** ESLint, Prettier, pnpm

### 3.1 Claude API usage
- Before writing AI code, read the current docs at `https://platform.claude.com/docs` (models overview, web search tool, web fetch tool, structured outputs/tool use, prompt caching, errors). Confirm model IDs and tool version strings from the docs rather than memory.
- Configure models via env: `ANTHROPIC_MODEL_RESEARCH` (default `claude-sonnet-5`), `ANTHROPIC_MODEL_WRITING` (default `claude-opus-5`), `ANTHROPIC_MODEL_FAST` (default `claude-haiku-4-5-20251001`).
- Web search: `{"type": "web_search_20250305", "name": "web_search", "max_uses": N}` for basic search, or the newer dynamic-filtering version (`web_search_20260318` at time of writing) if supported by the chosen model. Use `allowed_domains` when targeting a specific university.
- Handle `pause_turn` stop reasons by continuing the turn. Web search errors return inside a 200 response body (`web_search_tool_result_error`) — detect and record them.
- Force structured output: a tool with a Zod-derived JSON schema, then validate with Zod. On validation failure, retry once with the error message, then mark the record `needs_review`.
- Use prompt caching for the long static system prompt and profile.
- Log tokens and estimated cost per job to the `ai_usage` table; enforce `AI_MONTHLY_BUDGET_USD`.

### 3.2 Long-running work on Vercel
- Never run a whole "search the world" task in one request. Break it into small jobs (one region, one university, or one professor per step), persist job state in Postgres, and process steps through a cron-triggered worker route and/or user-triggered calls.
- Check current Vercel function duration limits for the plan and set `maxDuration` accordingly.
- Stream progress to the UI (polling or server-sent events).

---

## 4. Data model (Drizzle + Zod)

All tables have `id`, `createdAt`, `updatedAt`.

- **programs:** `university`, `country`, `region`, `department`, `programName`, `degreeType`, `researchAreas[]`, `admissionRoute` (`central_program` | `direct_supervisor` | `cohort_cdt` | `employment_position`), `degreeRequirement`, `minGpa`, `englishTests` (JSON: test → minimum), `greRequired` (`required` | `optional` | `not_required` | `unknown`), `documents[]`, `interview`, `fundingType`, `stipend` (text + currency + year), `internationalEligibility`, `deadlines` (JSON array: label, date, timezone, cycle), `startTerm`, `applicationUrl`, `sources` (JSON array: url, evidenceSnippet ≤ 25 words, fetchedAt), `lastVerifiedAt`, `verificationStatus` (`unverified` | `verified` | `outdated`), `confidence` (0–1), `fitScore`, `fitRationale`, `notes`.
- **professors:** `name`, `title`, `institutionId`, `department`, `labName`, `homepageUrl`, `officialEmail` (nullable), `emailSourceUrl`, `openAlexId`, `semanticScholarId`, `orcid`, `topics[]`, `recentPapers` (JSON: title, year, venue, url, doi, verified), `recruitingSignal` (text, url, date, or null), `fitScore`, `fitRationale`, `linkedProgramIds[]`, `status`.
- **institutions:** `name`, `country`, `city`, `openAlexId`, `website`.
- **outreach_drafts:** `professorId`, `subjectOptions[]`, `body`, `factIdsUsed[]`, `paperIdsReferenced[]`, `wordCount`, `status` (`draft` | `reviewed` | `approved` | `sent_manually` | `follow_up_due` | `replied` | `closed`), `sentAt`, `followUpAt`, `replySummary`.
- **applications:** `programId`, `professorIds[]`, `stage` (`researching` | `preparing` | `submitted` | `interview` | `offer` | `rejected` | `withdrawn`), `checklist` (JSON: item, done, dueDate), `refereeStatus` (JSON), `cvVariantId`, `statementIds[]`, `portalUrl`, `notes`.
- **cv_variants:** `targetType` (`master` | `program` | `professor`), `targetId`, `sections` (JSON with fact IDs per section), `emphasis`, `pdfBlobUrl`, `warnings[]`, `approved`.
- **statements:** `type` (`sop` | `research_statement` | `motivation_letter` | `cover_letter`), `targetId`, `body`, `factIdsUsed[]`, `wordLimit`, `status`.
- **jobs:** `type`, `payload`, `status`, `step`, `progress`, `error`, `attempts`.
- **ai_usage:** `jobId`, `model`, `inputTokens`, `outputTokens`, `searchCount`, `estimatedCostUsd`.
- **audit_log:** every AI write and every status change.

---

## 5. Part A — Public academic website

### 5.1 Pages
- **Home:** name, one-sentence research positioning, research interests, primary actions ("Download CV", "Email Rami"), selected projects.
- **Research:** interests in order, why each matters, how his geospatial and public-sector background feeds them, current MSc work. Include an honest "in progress" note instead of an empty publications list.
- **Projects:** case studies (problem → data → method → result → tools) for the six projects in §2.5 plus NLP projects once confirmed. Use maps or figures Rami owns or generates; no copyrighted images.
- **Experience & education:** timeline.
- **CV:** embedded preview and PDF download of the approved master academic CV.
- **Contact:** permanent email, LinkedIn, GitHub, ORCID. No phone number. No contact form storing data unless Rami asks.

### 5.2 Design direction
Run the two-pass design process: write a token plan (4–6 named hex colours, typefaces and roles, layout wireframes in ASCII, principles), review it against this brief, revise anything generic, then build.

Brief to design from: the subject is a surveying engineer becoming an AI researcher. Draw the visual identity from his world — survey control points, contour lines, coordinate grids, map legends, precise measurement — and let one element carry the boldness (for example, a hero where a subtle contour or coordinate motif responds to the cursor, with a single orchestrated load moment). Keep everything else quiet, precise, and academic.

Avoid these generic defaults unless justified by the brief: cream background with terracotta accent; near-black with acid-green accent; newspaper hairline layout; identical rounded SaaS cards with soft grey shadows and gradient washes; ALL-CAPS eyebrow labels over every heading; middle-dot meta strings; monospace data labels everywhere; "→" appended to every link; one italicised word in the headline; fade-and-slide on every section.

Quality floor: responsive to 360px, visible keyboard focus, `prefers-reduced-motion` respected, WCAG AA contrast, line length under ~80 characters, sentence-case copy in active voice.

### 5.3 SEO and sharing
Metadata per page, Open Graph image generated with `next/og`, `sitemap.xml`, `robots.txt` (disallow `/dashboard`), JSON-LD `Person` schema with `alumniOf`, `knowsAbout`, and `sameAs` links. Lighthouse target: 95+ for Accessibility, Best Practices, and SEO; 90+ Performance.

---

## 6. Part B — Private PhD Command Center (`/dashboard`)

### 6.1 Home
- Next 10 deadlines with countdowns; unverified deadlines shown with a warning badge.
- "This week" actions: drafts to review, follow-ups due, checklist items due.
- Readiness panel: English test, GRE, referees, research statement, CV approval, NLP portfolio.
- AI spend this month vs cap.

### 6.2 Program Finder
- **Seed** the database with the programs in §7 (status `unverified`).
- **Discovery job:** for each region (Europe, UK, US, Canada, Gulf/MENA, Asia-Pacific) and each research interest, run searches such as "PhD position LLM NLP funded 2027", "doctoral program machine learning international applicants", "remote sensing deep learning PhD funded". Also crawl known aggregators' listings only through official links (e.g., ELLIS, UKRI CDT lists, FindAPhD listings leading to official pages) and always store the official university URL as the primary source.
- **Extraction job:** for each candidate page, use web fetch plus a structured-output tool to fill the `programs` schema. Every non-null field needs a source and evidence snippet.
- **Deduplication:** by normalised university + program + cycle.
- **Fit scoring (transparent rubric, shown in UI):** research-area match to ranked interests (40), eligibility match with his degrees/GPA/English status (20), funding for international students (20), deadline feasibility for Fall 2027 (10), region preferences from §2.1 (10). Show the rationale and never hide low-scoring programs silently.
- **Refresh:** weekly cron re-fetches sources of programs with deadlines in the next 120 days; if content changes, mark `outdated` and show a diff.
- **Views:** filterable table, map by country, calendar; export CSV and `.ics` calendar of deadlines.

### 6.3 Professor Finder
- **Inputs:** research topic(s), region/institution filters, linked programs.
- **Pipeline:**
  1. OpenAlex: find recent works (last 3 years) matching topics; aggregate authors; filter to those at universities offering relevant PhDs; fetch author profiles, institutions, and counts.
  2. Semantic Scholar (optional): enrich with paper abstracts and links.
  3. Web fetch the official faculty or lab page: confirm current position, extract official email only if published, and look for explicit "open PhD positions / prospective students" text with URL and date.
  4. Fit score with rationale: topical overlap with Rami's interests (50), recent activity (15), explicit recruiting signal (15), GeoAI/humanitarian bonus overlap (10), program funding availability (10).
- **Output:** ranked list per university and per topic; professor detail page with papers, signals, sources, and linked programs.
- Include a "Why not contact" field for mismatches (for example, a page saying "I am not taking students").

### 6.4 Outreach Email Drafts
- One draft per professor, generated only after the professor record has at least one verified recent paper.
- **Structure (150–220 words):** subject line (3 options); who Rami is in one sentence; one specific, accurate observation about a named recent paper; two or three relevant facts from his profile connected to that work; the concrete ask (whether they are recruiting for Fall 2027 and through which program); CV link to the public site; polite close.
- **Rules:** no flattery clichés, no generic "your esteemed research", no claims beyond the profile, no identical bodies across professors (similarity check; warn above a threshold), respect any "do not email" instructions found on the professor's page.
- **Workflow:** Draft → Reviewed → Approved → "Copy" / "Open in email" (`mailto:`) / optional "Create Outlook draft" via Microsoft Graph `messages` create (draft only) → Rami marks Sent → follow-up reminder after 14 days (editable) → one polite follow-up draft at most.
- Keep an outreach log to avoid contacting the same professor twice or several professors in the same lab at once without Rami choosing to.

### 6.5 CV and Statement Tailoring
- **Master academic CV** (2 pages max): Contact → Research interests → Education (with GPA once approved, thesis) → Research & technical projects → Professional experience (condensed, research-relevant bullets) → Skills → Certifications → Languages → Leadership & service. Academic tone; remove corporate phrases like "results-driven".
- **Tailored variants:** given a program or professor, select and reorder facts by relevance, adjust the research-interests paragraph, and highlight matching projects. Show a side-by-side diff against the master and the list of fact IDs used.
- **Integrity checker:** blocks export if any sentence lacks a fact ID, if a `needs_confirmation` fact is used, or if dates overlap without a part-time flag. Warns on metrics without evidence.
- **Statements:** statement of purpose, research statement, and ELLIS/IMPRS-style two-page motivation letters, with word limits per program and the same fact-ID rules. Rami must edit and approve; the UI shows "AI draft — requires your edits" until he does.
- Export PDF (and optional DOCX) to Vercel Blob; name files `ElKhatib_Rami_CV_<University>_<Program>.pdf`.

### 6.6 Application Tracker
- Kanban by stage plus table view.
- Per-application checklist auto-generated from the program's `documents[]`, English/GRE requirements, referees, and deadlines, with due dates set a configurable number of days before the official deadline.
- Referee tracker (private): requested date, reminder, submitted.
- Weekly digest email to Rami (optional, Resend): deadlines, follow-ups, stale drafts.

---

## 7. Seed data (compiled 11 September 2026 — all `unverified`, re-verify before use)

| Program | Country | Key requirements | Funding | Deadline (cycle) | Source |
|---|---|---|---|---|---|
| ELLIS Institute Finland — doctoral student positions | Finland | Master's (held or expected soon) in CS, statistics, EE, math or related; ML/AI experience; excellent English; cover letter ≤2 pages, CV, BSc+MSc transcripts, degree certificate or completion plan, 2–3 senior referees | Fully funded salaried, 4-year contracts | 21 Sep 2026, 23:59 EEST | https://www.ellisinstitute.fi/postdoc-and-phd-recruit-autumn-2026 |
| ELLIS PhD Program (central call) | Europe (multi-country) | Portal application, two-page motivational letter with research statement, referees via portal; joint supervision, ≥6-month exchange | Via advisor's institution; ELLIS provides none | Last cycle 31 Oct 2025 (expect Oct–Nov 2026) | https://ellis.eu/news/ellis-phd-program-call-for-applications-2025 |
| IMPRS-IS (Max Planck, Stuttgart/Tübingen) | Germany | Master's in engineering, CS, math, physics or related; CV, transcripts, two-page motivation letter, 3 referees, English proof; GRE optional | Employment contract, initial 3 years | Last known 15 Nov 2024 — confirm current cycle | https://imprs.is.mpg.de/application |
| UKRI AI Centres for Doctoral Training | UK | First/2:1 bachelor's or relevant master's; limited international studentships | UKRI stipend + fees (international fee coverage varies by CDT) | Varies by CDT (e.g., Surrey opens Dec 2026) | https://www.ukri.org/who-we-are/our-vision-and-strategy/tomorrows-technologies/how-we-work-in-ai/ukri-artificial-intelligence-centres-for-doctoral-training/ |
| Carnegie Mellon — Machine Learning PhD (US example) | USA | GRE used for quantitative skills; TOEFL/IELTS/Duolingo required for non-native speakers, no waivers | Typically funded | Usually early–mid Dec | https://ml.cmu.edu/academics/machine-learning-phd |
| Mila (with UdeM, McGill, Polytechnique) | Canada | Supervision request + parallel university application; PhD normally after master's; no French exam at UdeM DIRO | Via supervisor/university | 15 Oct – 1 Dec 2026 | https://mila.quebec/en/prospective-students-and-postdocs/research-programs/request-supervisor |
| MBZUAI | UAE | STEM bachelor's + master's; min CGPA 3.0/3.5 by program; research statement, SoP, ≥3 referees, English certificate; screening exam + interview; GRE status conflicting — confirm | Full scholarship for admitted full-time students | Last cycle priority 15 Nov, final 15 Dec 2025 | https://mbzuai.ac.ae/study/graduate-admission-process/ |
| AUB — PhD in Electrical & Computer Engineering | Lebanon | Master's in ECE or related, average ≥85 (3.7); transcripts, GRE, SoP, 3 letters, portfolio, interview; graduation needs 1 journal + 2 conference papers | Confirm with department | See AUB Graduate Council FAQ | https://www.aub.edu.lb/msfea/ece/ECE-PHD/Pages/admissions.aspx |

---

## 8. Repository structure (proposal — refined in `docs/plan/phase-0-plan.md`)

```
/app
  /(public)/page.tsx, research/, projects/, experience/, cv/, contact/
  /dashboard/ (layout with auth guard) home, programs/, professors/, outreach/, cv/, statements/, applications/, settings/
  /api/ jobs/, programs/, professors/, outreach/, cv/, cron/
/lib
  ai/ (client, prompts, tools, schemas, cost)
  sources/ (openalex.ts, semanticscholar.ts, fetch.ts)
  scoring/ integrity/ pdf/ calendar/
/db (schema.ts, migrations/)
/data (profile.ts, seed-programs.ts)
/tests (unit/, e2e/)
CLAUDE.md
```

---

## 9. Build phases and verification gates

**Standard gate (every phase):** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass, zero new warnings, no `TODO` left in delivered paths.

| Phase | Scope | Extra acceptance criteria |
|---|---|---|
| 0. Plan | Read this file, list open questions from §2.1, propose design token plan + wireframes, repo structure, and job architecture | Rami approves plan; `CLAUDE.md` created |
| 1. Foundation | Next.js app, Tailwind tokens, DB + Drizzle migrations, Auth.js allowlist, env validation with Zod, seed profile and programs | Unauthenticated user redirected from `/dashboard`; unit tests for env and profile schema |
| 2. Public site | All pages in §5 using profile facts with `visibility: public` and `status: confirmed` only | Playwright screenshots 390px/1440px reviewed; no phone number in HTML; Lighthouse targets met locally |
| 3. CV engine | Master academic CV, PDF export, integrity checker, diff view | Tests: export blocked when an unconfirmed fact is used; every bullet has a fact ID |
| 4. AI core | Anthropic client, structured-output helper, web search/fetch handling incl. `pause_turn` and in-body errors, cost logging, budget cap, job runner | Tests with mocked API responses for success, validation retry, search error, budget exceeded |
| 5. Program Finder | Discovery, extraction, dedupe, scoring, refresh, table/map/calendar, CSV + ICS export | Every non-null field has a source; seeded records show `unverified`; ICS validates |
| 6. Professor Finder | OpenAlex/Semantic Scholar clients, faculty page verification, scoring, detail pages | No guessed emails (test); papers link to real OpenAlex/DOI URLs |
| 7. Outreach | Draft generation, similarity check, workflow statuses, follow-ups, optional Outlook draft | No code path calls a send endpoint (test/grep); drafts cite only verified papers |
| 8. Statements + Tracker | SoP/research statement/motivation letters, applications Kanban, checklists, referee tracker, digest | Word limits enforced; checklist generated from program requirements |
| 9. Hardening | Rate limiting, security headers, `noindex` on dashboard, error boundaries, empty states, accessibility pass, backups/export of all data as JSON | Playwright e2e for main flows; axe accessibility checks pass |
| 10. Deploy | GitHub repo, Vercel project, Neon integration, env vars, cron in `vercel.json`, custom domain (if purchased), preview then production | Post-deploy smoke test (§10) passes on production URL |

---

## 10. Deployment to Vercel

1. Initialise git, push to a GitHub repository.
2. Import the repo in Vercel. Add the Neon Postgres integration from the Vercel Marketplace.
3. Set environment variables (Production and Preview): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_ALLOWED_EMAILS`, auth provider keys, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_RESEARCH`, `ANTHROPIC_MODEL_WRITING`, `ANTHROPIC_MODEL_FAST`, `AI_MONTHLY_BUDGET_USD`, `OPENALEX_MAILTO`, `SEMANTIC_SCHOLAR_API_KEY` (optional), `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY` (optional), `CRON_SECRET`, Microsoft Graph credentials (optional).
4. Run migrations against production safely (a documented `pnpm db:migrate` step, never auto-drop).
5. Configure cron routes in `vercel.json`, protected by `CRON_SECRET`.
6. Deploy a preview, run the smoke test, then promote to production.
7. Connect a custom domain if purchased. Verify HTTPS and OG previews.

**Smoke test:** public pages load on mobile and desktop; CV PDF downloads; `/dashboard` requires login; seed programs visible; one program extraction job completes with sources; one professor search returns records with OpenAlex links; one outreach draft generates and cannot be sent automatically; ICS export imports into a calendar; AI usage logged.

---

## 11. What stays manual (by design)

- Checking each deadline and requirement on the official page, then marking it `verified`.
- Editing and approving every email, CV variant, and statement.
- Sending emails and submitting applications.
- Booking English tests and GRE, and requesting reference letters.

## 12. Final deliverables

- Production URL and repository link.
- `README.md`: setup, environment variables, commands, architecture diagram, how jobs work, how to add a new program or professor manually, cost controls.
- `CLAUDE.md` with project rules.
- Seeded, verified-ready database; approved master CV PDF.
- A short report listing every `[CONFIRM]` item still open and every integrity warning found in the CV.
