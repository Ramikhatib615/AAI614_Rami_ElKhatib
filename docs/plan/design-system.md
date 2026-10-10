# Design system — token plan (two passes)

Brief (PROMPT.md §5.2): a surveying engineer becoming an AI researcher. The identity should come
from his working world — survey control points, contour lines, coordinate grids, map legends,
precise measurement — with **one** element carrying the boldness and everything else quiet,
precise, academic.

The through-line chosen: **the topographic quad sheet**. A printed survey sheet is exactly the
object where measurement becomes a legible document, which is also the story of the career move.
Concretely that gives us a neatline (the ruled border with graticule ticks), hairline contours,
a legend that explains every symbol, and control-point marks. Each of those maps onto a real UI
job, which is the test of whether a motif is design or decoration:

| Map element | UI job |
|---|---|
| Neatline + corner ticks | Panel/plate boundaries (replaces the shadowed card) |
| Graticule ticks in the margin | Section markers and scroll position |
| Contour hairlines | The hero field; sparingly, section dividers |
| Control point (triangle + dot) | List marker, and the `verified` badge in the dashboard |
| Map legend | The fit-score rubric, shown literally as a legend (PROMPT.md §6.2 wants it visible) |
| Revision overprint (magenta) | Interactive accent; in the dashboard, "changed since last check" |

That last one is the palette's origin: on USGS quadrangles, areas revised from aerial photography
without field check are overprinted in magenta. An accent colour that literally means "revised,
not yet field-verified" is the right colour for a product whose core rule is that data starts
`unverified` until Rami checks it.

---

## Pass 1 — first token plan

- Colours: paper `#F4F1EA`, ink `#1A1A1A`, contour brown `#A0703A`, magenta `#8C2A66`,
  hydrography blue `#1B5E7E`.
- Type: Newsreader for headings, IBM Plex Sans for body, IBM Plex Mono for all data.
- Layout: 12-column grid, hero with animated contour canvas, cards for projects, sections fade in
  as they scroll into view, section headings preceded by a small label.

### Critique against the brief and the banned list

1. **Paper `#F4F1EA` + brown is cream-and-terracotta**, the first banned default, arriving through
   the back door. Fix: cool the ground to a paper white with a green-grey cast (`#F5F4F0`), and
   demote brown to a **line-only** role — contours are hairlines on a real sheet, never fills, so
   the rule is authentic rather than a dodge. Brown never colours a button, a heading, or a badge.
2. **Mono for all data is banned** ("monospace data labels everywhere"). Fix: mono is reserved for
   things that are literally coordinates or fixed-width measurements — grid references, the hero
   readout, deadline countdowns. Table numbers use Plex Sans with tabular figures
   (`font-variant-numeric: tabular-nums`), which aligns without the technical costume.
3. **Cards with soft grey shadows are banned**, and a shadow is wrong for a printed sheet anyway.
   Fix: **plates** — 1px neatline, 0 radius, no shadow. Emphasis comes from a second hairline
   offset 3px down-right, like a registration offset in printing.
4. **Fade-and-slide on every section is banned.** Fix: one orchestrated load moment in the hero and
   nothing else. Below the fold, motion exists only in hover/focus states and live countdowns.
5. **Ink `#1A1A1A` is a neutral default.** Fix: `#12161A`, very slightly blue-black, so it sits
   with the hydrography blue rather than floating on top of it.
6. **"A small label above each heading" drifts into the banned all-caps eyebrow.** Fix: a
   sentence-case station number in the left margin (`01 Research`), set in ink-soft at the same
   size as body text — a survey station mark, not a category tag. No middle dots anywhere.
7. **Newsreader + 12-column grid risks the banned newspaper hairline layout.** Fix: an 8-column
   grid with one wide measure (max 68ch) and a persistent left margin column for station marks and
   metadata. Rules appear only at the neatline, never between columns of text.
8. Missing from pass 1: a dark mode, a verified/unverified colour language (which this product
   needs more than most), and focus-visible styling. Added below.

---

## Pass 2 — final tokens

### Colour (6 named roles, light and dark)

| Token | Light | Dark | Role | Contrast on ground (light / dark) |
|---|---|---|---|---|
| `--ground` | `#F5F4F0` | `#0D1114` | Page ground | — |
| `--ground-sunk` | `#EBE9E3` | `#161C20` | Plate fill, table stripe | — |
| `--ink` | `#12161A` | `#E8E9E4` | Primary text | 16.5 / 15.5 |
| `--ink-soft` | `#4A5158` | `#9BA4AA` | Secondary text, station marks | 7.3 / 7.5 |
| `--contour` | `#A67A46` | `#8A6538` | **Hairlines only** — contours, neatline, rules | 3.5 / 3.6 (graphics-only, AA 3:1 ✓) |
| `--accent` | `#8C2A66` | `#EE8FC4` | Links, focus, primary action, "revised/unverified" | 7.2 / 8.5 |
| `--hydro` | `#1B5E7E` | `#7BC0DE` | Secondary/visited links, informational badges | 6.5 / 9.4 |
| `--verify` | `#3F6B45` | `#89BE93` | `verified` status only | 5.6 / 8.9 |
| `--warn` | `#9A4A12` | `#E0A05C` | Integrity warnings, missing evidence | 5.7 / 8.5 |

Ratios computed, not estimated (see `docs/plan/contrast.py`). Every text role clears WCAG AA at
body size in both themes; `--contour` is restricted to 1px graphics, where it clears the 3:1
non-text minimum. Dark mode is the "field night" sheet, not an inverted copy: the contour brown
darkens rather than lightens, because a lit contour on black reads as neon.

Status colour is a three-way language used identically on the public site and the dashboard:
`--accent` = unverified/AI-drafted, `--verify` = verified by Rami, `--warn` = integrity problem.
Colour is never the only signal — each pairs with a glyph (open circle, control-point triangle,
half-filled square) and a text label.

### Type

| Role | Face | Notes |
|---|---|---|
| Display / h1–h3 | **Newsreader** (variable, optical sizing) | Scholarly, high contrast at large sizes. `opsz` bound to size; h1 at 44–64px, tight leading (1.05), no italics in headlines. |
| Body / UI | **IBM Plex Sans** | Drawn for technical documentation; keeps the instrument feel without costume. Tabular figures on in tables. |
| Coordinates / measurement | **IBM Plex Mono** | **Only** for grid references, the hero readout, countdown timers, and fact IDs. Never for ordinary metadata. |

Self-hosted through `next/font` (no external font requests). Scale: 13 / 15 / 17 / 20 / 25 / 32 /
44 / 64 px, 1.5 body leading, measure capped at 68ch (brief says under ~80).

### Space and line

4px base. Plates: 1px `--contour` border, radius 0, no shadow; "raised" = second 1px border offset
3px right and down at 40% opacity. Corner ticks: 8px L-marks inset 6px from each plate corner,
drawn with pseudo-elements — the neatline detail that makes a plain rectangle read as a map sheet.
Focus: 2px `--accent` outline with 2px offset, on every interactive element, never removed.
Links: 1px underline at 0.16em offset; on hover/focus the underline thickens to 2px and shifts to
`--accent`. No arrow glyphs appended. External source links carry a 6px tick mark, matching the
graticule, with a `sr-only` "opens the source page".

### Motion — one moment, then stillness

Hero load (once, ~1.2s total, `prefers-reduced-motion: reduce` → final frame immediately, no
cursor response):
1. 0–250ms: neatline draws from the top-left corner clockwise.
2. 200–500ms: graticule ticks appear along the margin, staggered 12ms.
3. 350–1100ms: the contour field rises from a flat plane to the terrain, outer contours first.
4. 900–1200ms: name and positioning sentence fade in at the control point.

After load, the only hero motion is the cursor behaviour: within ~180px of the pointer the contour
interval halves, so the terrain resolves in finer detail where he is "surveying" — a levelling
instrument, not a spotlight. Implemented on `<canvas>` with a cheap value-noise field, capped at
30fps, paused when off-screen (`IntersectionObserver`), and disabled entirely on coarse pointers
(touch gets the static final frame). Nothing else on any page animates on scroll.

### Principles

1. Every ornament must do a job (the table above). If it has no job, it is deleted.
2. Provenance is visible. Any claim, score, or date shows where it came from, in the same visual
   grammar everywhere.
3. Unverified must look unverified — at a glance, from across the room.
4. One bold thing per screen. On the home page that budget is spent on the hero.
5. Precision over softness: hairlines, exact alignment, no blur, no gradient washes.

---

## Wireframes (ASCII)

### Public home (1440px). `·` = faint graticule tick, `─│` = neatline hairlines

```
┌────────────────────────────────────────────────────────────────────────┐
│ ┌─ Rami El Khatib            Research  Projects  Experience  CV  Contact│
│ ·                                                                      │
│ ·   ╭ contour field (canvas, hairline --contour, responds to cursor) ╮ │
│ ·   │        ⌒⌒⌒⌒⌒⌒⌒                                  ⌒⌒⌒⌒⌒         │ │
│ ·   │     ⌒⌒        ⌒⌒⌒      I measure the world, now I model it.  │ │
│ ·   │   ⌒   ▲ 33.89 N        ─────────────────────────────────────  │ │
│ ·   │  ⌒  35.50 E  ⌒⌒        Surveying engineer and data scientist  │ │
│ ·   │    ⌒⌒     ⌒⌒⌒          in Beirut. I work on language models,  │ │
│ ·   │       ⌒⌒⌒⌒             GeoAI, and applied ML for public data. │ │
│ ·   ╰──────────────────────────────────────────────────────────────╯ │
│ ·      Download CV (plate button)    Email Rami (underlined link)      │
│ ·                                                                      │
│ 01  Research interests                                                 │
│ ·   ▲ Language models and NLP ....... why it matters, 2 lines          │
│ ·   ▲ GeoAI and remote sensing ...... why it matters, 2 lines          │
│ ·   ▲ Applied ML for public data .... why it matters, 2 lines          │
│ ·                                                                      │
│ 02  Selected work                                                      │
│ ·   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   (plates, 0 radius│
│ ·   │└ PA Index  ┘│ │└ Tour in   ┘│ │└ Land      ┘│    corner ticks,   │
│ ·   │ 20+ states  │ │  Sour       │ │  tenure     │    no shadow)      │
│ ·   │ Python, BI  │ │  8,000 pts  │ │  STDM/GIZ   │                    │
│ ·   └─────────────┘ └─────────────┘ └─────────────┘                    │
└────────────────────────────────────────────────────────────────────────┘
```

At 390px: nav collapses to a single row of 3 items plus a "More" disclosure; the hero canvas keeps
its aspect but drops to the static final frame (coarse pointer); plates stack to one column.

### Project case study

```
│ 03  A Tour in Sour                          UN-Habitat · 2024          │
│     ┌──────────────────────────────────────────────────────┐          │
│     │  figure: map or chart Rami owns                       │          │
│     └──────────────────────────────────────────────────────┘          │
│     Problem   two sentences, 68ch measure                              │
│     Data      what, how much, where from                               │
│     Method    tools and technique                                      │
│     Result    what changed, no unevidenced numbers                     │
│     Tools     ArcGIS Online · Survey123 · Python      [fact ids: …]    │
```

### Dashboard home (auth required, `noindex`)

```
┌── Command center ─────────────────────── AI spend  $4.20 / $25.00 ─────┐
│ ┌ Next deadlines ───────────────┐ ┌ This week ────────────────────────┐│
│ │ ○ ELLIS Finland    10d  21 Sep│ │ 3 drafts to review                ││
│ │   unverified — check source   │ │ 1 follow-up due (Prof. …)         ││
│ │ ▲ IMPRS-IS         65d  15 Nov│ │ 2 checklist items due             ││
│ │   verified 2 Sep by you       │ └───────────────────────────────────┘│
│ │ ○ MBZUAI priority  65d  15 Nov│ ┌ Readiness ────────────────────────┐│
│ └───────────────────────────────┘ │ English test   ▢ not booked       ││
│                                   │ GRE            ▢ not planned      ││
│ ┌ Legend ───────────────────────┐ │ Referees       ▢ 0 of 3           ││
│ │ ○ unverified  ▲ verified      │ │ Master CV      ▢ awaiting approval││
│ │ ◧ outdated    ! integrity flag│ │ NLP portfolio  ! thin — priority 1││
│ └───────────────────────────────┘ └───────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

### Program finder (table view)

```
│ Filters: region ▾  funding ▾  deadline ▾  status ▾        [CSV] [.ics] │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Fit  Program                 Country  Deadline    Funding   Status │ │
│ │ ▮▮▮▮▯ 82  ELLIS Institute FI  Finland  21 Sep 26  salaried  ○      │ │
│ │   why: LLM match 34/40 · eligibility 16/20 · funding 20/20  [open] │ │
│ │ ▮▮▮▯▯ 71  IMPRS-IS            Germany  confirm    contract  ○      │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ Rubric legend: research 40 · eligibility 20 · funding 20 · timing 10   │
│                · region 10   (shown, not hidden behind a tooltip)      │
```

### Outreach draft editor

```
│ Prof. <name>, <university>                         status: draft ○     │
│ ┌ Draft (AI — requires your edits) ──────┐ ┌ Provenance ─────────────┐ │
│ │ Subject: three options, radio-selected │ │ Facts used:             │ │
│ │ ─────────────────────────────────────  │ │  exp.escwa.pa-index     │ │
│ │ body, 150–220 words, editable          │ │  edu.msc.lau            │ │
│ │                                        │ │ Paper cited:            │ │
│ │                                        │ │  doi:10.… ▲ verified    │ │
│ │ words 187 ✓   similarity to others 0.31│ │ Email source: dept page │ │
│ └────────────────────────────────────────┘ └─────────────────────────┘ │
│ [Copy]  [Open in mail]  [Create Outlook draft]   — no send button ever │
```
