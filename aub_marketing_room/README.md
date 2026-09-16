# AUB Marketing Room

Six specialist AI managers, briefed on AUB's real enrollment and affordability
situation. A chair routes each question to the two or three who actually own it,
then adjudicates where they disagree.

**Live (no setup, no API key):** https://claude.ai/artifact/GiwGdBFsfdsG6vpxhAb2EW

## The room

| Manager | Owns |
|---|---|
| **RIMA** | Undergraduate recruitment — Lebanese school market, feeder schools, inquiry→deposit funnel |
| **KARIM** | Digital & paid media — channel mix, creative, budget, cost per enrolled student |
| **NOUR** | Graduate & research recruitment — MSFEA pipelines, GA/GRA/Fellowship funding as the real lever |
| **TAREK** | Regional & diaspora — Gulf, Arab world, full-tuition international students |
| **MAYA** | Affordability messaging — net price vs list price, aid nobody hears about |
| **SAMI** | Brand, reputation & risk — the counterweight to short-term enrollment tactics |

`CHAIR` orchestrates: routes, then synthesises.

## How it works

```
  your question
       │
       ▼   stage 1 — CHAIR routes (JSON, fast tier)
   picks 2-3 managers and writes each a self-contained brief
       │
       ├──▶ RIMA   ─┐
       ├──▶ KARIM  ─┤  stage 2 — parallel, each blind to the others
       └──▶ MAYA   ─┘
       │
       ▼   stage 3 — CHAIR adjudicates
  Read · Recommendation · Tensions · Open questions
```

Three design decisions carry it:

1. **Agents as tools.** Routing is the chair selecting from a roster, so adding a
   manager to `roster.js` is the only change needed to extend the room.
2. **Context isolation.** Each manager answers in a fresh call and never sees the
   others. That is the feature — it keeps contexts small, lets them run in
   parallel, and produces *real* disagreement because nobody is anchored.
3. **Preserved disagreement.** The chair is instructed that conflict between
   managers IS the finding. The lazy version averages everyone into consensus,
   which is what makes most multi-agent demos useless.

## Grounded, not improvised

The managers are briefed with sourced figures (`AUB_CONTEXT` in `roster.js`) and
told to label anything else as an estimate: AUB's ~8,000 students from 90+
countries and 50-59% acceptance band; 37% of undergraduates on aid; the 2020-21
dollarization at 3,900 vs 1,515 LBP (~260% increase) and the ~5,000-student shift
to the Lebanese University that followed; MSFEA's PhD programs and GA/GRA/Fellowship
support; and 2026 higher-ed marketing benchmarks (TikTok at 18-28% of 18-24
awareness, 0.89% education CTR, 15-25% inquiry-to-application, 7.7% email-to-
application, ~$2,849 cost per enrolled student).

Sources: AUB registrar/admissions pages; L'Orient Today, LCPS and Xinhua on
Lebanon's higher-education funding crisis; Search Influence, RC Strategies and
KEG/UCAS on 2026 benchmarks.

## Files

| File | Purpose |
|---|---|
| `roster.js` | The six managers and all three prompt builders. **Start here.** |
| `index.html` | The whole app. Detects its host and picks a transport. |
| `api/ask.js` | Vercel serverless function — the only place the API key lives. |
| `build.mjs` | Wraps `index.html` into a complete document for static hosting. |

One page, two hosts. On claude.ai it calls `claude.use("sample")` and the viewer's
own Claude account answers. Anywhere else it POSTs to `/api/ask`. Same prompts,
same flow, no duplicated logic.

## Deploy to Vercel

```bash
cd aub_marketing_room
npm install
npm i -g vercel          # once
vercel login
vercel --prod
```

Then set the key and redeploy so the function picks it up:

```bash
vercel env add ANTHROPIC_API_KEY production   # paste sk-ant-...
vercel --prod
```

Or through the dashboard: import the repo, set **Root Directory** to
`aub_marketing_room`, add `ANTHROPIC_API_KEY` under Settings → Environment
Variables, deploy. `vercel.json` already sets the build command and output
directory.

Check it locally first with `vercel dev` — `npm run build` alone produces the
static page but not the function, so the button will correctly report no model
access.

## Things that will bite you

- **Function timeout.** `api/ask.js` sets `maxDuration: 60`, the Hobby ceiling.
  The `default` tier runs at `medium` effort to stay inside it. If you raise
  effort or the prompts grow, calls start hitting the wall — lower the effort in
  `EFFORT` or move to a paid plan.
- **Cost is per manager, per run.** Three managers plus routing plus synthesis is
  five model calls. The chair is capped at three managers for exactly this reason.
- **The key never goes in the browser.** It is read from `process.env` inside the
  function only. Anything in client-side JavaScript is public.
- **Visitor input is untrusted.** It goes into a prompt, so someone can try to
  steer the chair. It stays in the user turn and the managers have no tools.
- **Rate limiting is not implemented.** Before this faces anyone outside your
  team, add per-IP limiting — one visitor in a loop is how the budget actually
  disappears.

## What this is not

It cannot check its own work. Six confident managers can be wrong together and
the brief will still read as authoritative. Personas change framing, not
knowledge — the real gains here are context isolation, parallelism, and forced
disagreement. Treat the brief as a structured starting argument, and verify any
number before it reaches a budget.
