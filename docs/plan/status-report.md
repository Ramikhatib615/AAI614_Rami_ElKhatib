# Status report

Generated 2026-09-13 by `pnpm report`. The dashboard shows the same thing live.

## Open confirmations

14 questions only Rami can answer. 11 facts are blocked until he does.

- **confirm.aub-title** — What is the official AUB job title exactly as HR records it? _(blocks exp.aub.headline)_
- **confirm.msc-gpa** — What is the exact MSc GPA, and may it appear publicly? _(blocks edu.msc.lau.gpa)_
- **confirm.msc-thesis** — What is the MSc thesis or capstone title, advisor, and completion date? _(blocks edu.msc.lau.thesis)_
- **confirm.permanent-email** — Which permanent email address should be used for outreach and on the site? _(blocks identity.email.lau)_
- **confirm.public-links** — What are the LinkedIn, GitHub, and ORCID URLs? (Create an ORCID if there is none.) This also confirms the land-cover repository link on proj.lulc.
- **confirm.omt-employment-type** — Was the OMT & Western Union role part-time or concurrent with the other roles? _(blocks exp.omt.headline)_
- **confirm.years-of-experience** — How should years of data and GIS experience be stated? The roles sum to about four years with a 3.5-year gap, not the 5+ on the CV — so no such fact exists here yet.
- **confirm.metrics-evidence** — What evidence backs the 40 percent reporting reduction and the 100 percent data accuracy, or may they be removed? _(blocks exp.aub.b1, exp.aub.b2-metric)_
- **confirm.referees** — Who are the three referees (name, title, relationship)? Private, never published.
- **confirm.english-gre** — When are the IELTS or TOEFL and, if needed, the GRE booked?
- **confirm.research-outputs** — Are there preprints, UN reports, or theses that can be listed as research outputs? The ESCWA project document (exp.escwa.b2) is the likeliest candidate — is it public and citable?
- **confirm.nlp-projects** — The machine-learning projects are confirmed and now lead the site and the CV. NLP is still the gap: is there any text work to show, or should the next two months produce one NLP artefact?
- **confirm.constraints** — Which countries are excluded, what is the minimum stipend, and are there family or visa constraints?
- **confirm.positioning** — Is the positioning sentence right, or should it be rewritten? _(blocks positioning.surveying-to-modelling)_

## What the public site is withholding

- **Data Scientist & Contract Officer, American University of Beirut** — Confirm the official title exactly as AUB HR records it. A title that does not match HR is the kind of thing a reference check surfaces.
- **GIS & Geospatial Engineering Analyst, NavLeb** — Starts three months before the B.Sc. began in Sep 2019 and overlaps the OMT role. Confirm the months and whether this was full-time.
- **Senior Project Coordinator, OMT & Western Union** — Overlaps the entire B.Sc., the NavLeb role (11 months), and the Destination role (5 months). Read literally it means two full-time jobs at once. Confirm part-time or concurrent status — the integrity checker blocks export until this is set.
- **A surveying engineer and data scientist who moved from measuring the physical world to modelling it, combining geospatial data, public-sector analytics at the UN, and machine learning.** — PROMPT.md §2.2 offers this as a positioning idea for review. Approve or rewrite it before it appears on the site — it is the first sentence every professor will read.
- **ESRI ArcGIS certifications.** — Confirm the exact certificate names and dates. An academic CV lists them precisely or not at all.
- **LinkedIn Learning certificates.** — Confirm which ones. Recommend listing only those relevant to ML or data engineering, if any.
- **A contact address on the site** — The LAU address may stop working after graduation in Feb 2027, after replies would arrive. Confirm a permanent address before it is published or used in outreach.

## CV export

Export is blocked by 1 issue(s):
- The CV carries no way to reach Rami. Confirm a permanent email address (see confirm.permanent-email). _(no_contact)_

## Integrity findings in the record

- Destination Trading & Contracting and OMT & Western Union overlap by 5 month(s), and OMT & Western Union has no confirmed employment type.
- NavLeb and OMT & Western Union overlap by 12 month(s), and NavLeb and OMT & Western Union has no confirmed employment type.
- Data and GIS roles cover 46 months (3.8 years), counting overlaps once. No fact in the profile claims a number of years, and a test prevents one being added.
- `exp.aub.b1` states a metric with no evidence: ~40% reduction in manual reporting effort
- `exp.aub.b2-metric` states a metric with no evidence: 100% data accuracy
