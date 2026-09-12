# Open questions and integrity flags

Two lists. **Part A** is what only Rami can answer (`PROMPT.md` §2.1). **Part B** is what I can
already see in the profile data that will need a decision — raised, not silently fixed, per §1.1.

How to answer: edit the `ANSWER:` lines below and commit, or reply in chat and I will fill them in.
Until an item is answered, its facts carry `status: needs_confirmation`, which means they are
**blocked from the public site and blocked from CV/PDF export**. That is the designed behaviour,
not a bug — it is what stops an unverified claim reaching an admissions committee.

---

## Part A — needs Rami

### Identity and contact
1. **Permanent email for outreach.** The CV uses `ramielkhatib02@lau.edu`, which may stop working
   after graduation in Feb 2027 — after most replies would arrive. A permanent address is needed
   for every outreach email and for the public site.
   `ANSWER:`
2. **Public links:** LinkedIn URL, GitHub URL, ORCID (free, 2 minutes, and it is the standard
   identifier on application forms — create one if there is none), Google Scholar if it exists.
   `ANSWER:`
3. **Headshot** for the public site (optional — the design works without one).
   `ANSWER:`

### Education
4. **Exact MSc GPA**, and whether it may appear publicly (it is an asset if it is ≥3.8, and several
   programs list a minimum: MBZUAI 3.0–3.5, AUB ECE ≥85/3.7).
   `ANSWER:`
5. **MSc thesis or capstone:** title, advisor, expected completion date (CV says Feb 2027).
   The advisor matters: they are the likely first referee.
   `ANSWER:`

### Experience
6. **Official AUB job title** exactly as HR records it (the CV says "Data Scientist & Contract
   Officer"). A title that does not match HR is the kind of thing a reference check surfaces.
   `ANSWER:`
7. **OMT & Western Union, Sep 2018 – Apr 2024:** part-time? See flag B1 — it overlaps the BSc and
   two other roles, so it needs a part-time (or "concurrent") label to be internally consistent.
   `ANSWER:`
8. **Years of data/GIS experience to state.** See flag B2 — "5+" does not reconcile with the dates.
   `ANSWER:`
9. **Evidence for the three metrics** (~40% reporting reduction, 100% data accuracy, response-time
   reduction), or permission to remove them. See flag B3.
   `ANSWER:`

### Applications
10. **Referees** (name, title, relationship) — private, never published. Three are needed by almost
    every program on the seed list.
    `ANSWER:`
11. **English test:** IELTS or TOEFL, booked date, score if taken. **GRE:** needed or not, planned
    date. See flag B5 — this is the binding constraint on the whole Fall 2027 timeline.
    `ANSWER:`
12. **Research outputs:** any preprints, UN reports (the PA Index Project Document is authored work
    — is it public and citable?), theses, or technical reports that can be listed.
    `ANSWER:`
13. **NLP/LLM work to show.** **Partly answered 12 Sep 2026:** Rami asked to lead with the machine
    learning work, so two projects are now confirmed and lead both the site and the CV — the
    fraud-detection study (written up from the notebook's own outputs) and the South Lebanon land
    cover classification (from the public repository). **The NLP half is still open**: nothing in
    the record is text work, and that is research priority #1. Is there any NLP project to show,
    or should the next two months produce one? See flag B6.
    `ANSWER:`
14. **Constraints:** countries to exclude, minimum stipend, family/visa constraints. These feed the
    region component of the fit rubric (10 points) and stop the finder wasting AI budget on places
    that are not options.
    `ANSWER:`

### Project decisions (from `docs/plan/phase-0-plan.md` §8)
15. Repo home: subdirectory here, or a separate private repo? `ANSWER:`
16. Auth: GitHub OAuth (recommended) or email magic link? `ANSWER:`
17. Vercel plan: Hobby or Pro? `ANSWER:`
18. Build the program finder or the professor finder first? `ANSWER:`

---

## Status of the machine-learning work (12 Sep 2026)

Confirmed and now leading the site and the CV, both written only from evidence that exists:

- **Fraud detection on imbalanced transaction data** — every number comes from a stored output in
  `End_to_End_Credit_Card_Fraud_Detection_...ipynb`: 284,807 transactions at 0.17 percent fraud, a
  rule baseline recovering 2.8 percent, Isolation Forest at 0.26 recall / 0.22 precision, a
  class-weighted logistic regression at 0.89 recall, a random forest at 0.96 precision / 0.71
  recall, threshold selection to F1 0.81, and Platt calibration. Labelled as coursework wherever it
  appears.
- **Land cover and land use mapping, South Lebanon** — supervised classification of 2024 Landsat 8
  imagery into eight classes, from the methodology and outputs in the public repository.

Not shown: `regression_ipynb.ipynb` and `github_activity.ipynb` are short course exercises, and
`Anomaly_Detection_Fraud_Project.ipynb` is the earlier unsupervised-only draft of the same study.

---

## Part B — integrity flags I can already see

Raised for a decision, per `PROMPT.md` §1.1. Nothing here is changed without an instruction.

**B1 — Overlapping employment dates.** As written, four roles overlap:

```
2018   2019   2020   2021   2022   2023   2024   2025   2026
 ├─ OMT & Western Union ──────────────────────────┤ (Sep 18 – Apr 24)
       ├─ NavLeb ──┤ (Jun 19 – May 20)
        ├─ BSc Surveying, LIU ───────────┤ (Sep 19 – Jun 23)
                                    ├─ Destination ─┤ (Dec 23 – Jun 24)
                                          ├ UN-Habitat ┤ (Jun – Oct 24)
                                             ├─ UN ESCWA ──┤ (Oct 24 – Oct 25)
                                                  ├ MSc LAU ────────┤ (Feb 25 – Feb 27)
                                                    ├─ AUB ──────────┤ (Nov 25 – now)
```
OMT overlaps NavLeb (11 months), the entire BSc, and Destination (5 months). Reading the CV
literally, he held two full-time jobs at once for a year. A "part-time" or "concurrent" label on OMT
resolves it; without one, the integrity checker will block export (this is the §6.5 rule about
overlapping dates without a part-time flag).

**B2 — "5+ years of data/GIS experience" does not reconcile.** Counting only the data/GIS roles to
today: NavLeb 12m + Destination ~7m + UN-Habitat ~5m + ESCWA ~13m + AUB ~11m ≈ **48 months ≈ 4.0
years**, and there is a 3.5-year gap (May 2020 → Dec 2023) covered by the BSc. The continuous recent
run is Dec 2023 → now ≈ **2.8 years**. Three honest options: state "four years", state "nearly three
years of continuous practice since 2023", or drop the number and let the five roles speak — which is
what I would recommend for an academic CV, where duration claims are unusual anyway.

**B3 — Three metrics with no cited evidence.** "~40% reduction in manual reporting effort", "100%
data accuracy", "response-time reduction". These are the kind of number an interviewer asks you to
reconstruct. "100% data accuracy" is the weakest: it is unfalsifiable and reads as a slogan rather
than a measurement. If there is a before/after — hours per reporting cycle, an audit result, a
ticket log — the numbers stay and get stronger by naming the basis. If not, recommend rephrasing to
the mechanism ("replaced a manual monthly consolidation with an automated pipeline"), which is
verifiable and, for a research application, more informative.

**B4 — NavLeb starts three months before the BSc.** Jun 2019 vs a Sep 2019 degree start. Not a
problem, but a reader will notice; if the months are approximate, better to correct them now than to
be asked about it at interview.

**B5 — The Fall 2027 timeline is much tighter than it looks, and the English test is the blocker.**
For a Fall 2027 start, applications are submitted **between now and roughly February 2027**: US
programs close early-to-mid December 2026 (CMU on the seed list), MBZUAI's priority round was
mid-November in its last cycle, ELLIS's central call ran late October, Mila's window is Oct–Dec.
That is **3 months away**, not a year. A TOEFL/IELTS score is required by essentially all of them
and is not yet booked; slots and score reporting take weeks. **Booking the English test is the
single highest-value action on this list**, ahead of anything the software does. If the GRE is
needed (AUB ECE requires it; several US programs use it), that needs a test date now too.

**B6 — The research story and the evidence point in different directions.** Priority #1 is LLMs and
NLP; the portfolio is geospatial, BI, and governance analytics, with ML coursework in fraud
detection. That is not fatal — GeoAI and remote sensing (priority #2) are a genuinely strong,
differentiated match for his record, and several ELLIS/IMPRS groups work exactly there. Two
honest routes: lead with GeoAI and name LLMs as a direction he is moving toward, or spend the next
two months producing one real NLP artefact (a small, well-documented project on Arabic NLP or on
text from the policy/governance work he already knows) and lead with that. This decision changes the
professor search, the fit rubric weights, and every outreach email, so it is worth settling early.

**B7 — Seed program data is one to two cycles stale.** Of the eight rows in `PROMPT.md` §7, only
ELLIS Institute Finland carries a live date (21 Sep 2026). IMPRS-IS cites Nov 2024, MBZUAI and the
ELLIS central call cite 2025. They all ship as `unverified` and must be re-fetched before use — the
refresh job does this, but no decision should be made on those dates as written.

**B8 — ELLIS Institute Finland closes on 21 September 2026 — ten days from now.** Fully funded,
salaried, four-year contracts, and it accepts a master's "expected soon" (his completes Feb 2027).
It wants a ≤2-page cover letter, CV, BSc and MSc transcripts, a completion plan, and 2–3 senior
referees. If this is a target, it has to be done manually this week; the software will not be
finished in time to help. Flagging it because missing it by default would be the most expensive
outcome of this whole project.
