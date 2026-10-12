# SPEC — GrantPilot (App 2)

Grant application cockpit for academics: builds a reusable researcher profile, then generates every document a grant source requires — biosketches, letters, support statements — guided step-by-step. Static web app, zero backend, no build step. Same visual suite language as ScholarFix/AcceptEdge (warm neutrals, serif headings, no gradients, no emojis).

## Deliverable
Repo folder: `/mnt/agents/output/academic-apps/grantpilot/` — index.html, styles.css, app.js, js/ modules, README.md (GitHub upload + Pages + embed instructions), LICENSE (MIT), .gitignore. git init + commit.

## Features

### 1. Researcher Profile builder (js/profile.js) — "populate once, reuse everywhere"
Import sources (clearly labeled with what is/isn't possible):
- **ORCID auto-import** (primary): user enters ORCID iD → fetch public record via `https://pub.orcid.org/v3.0/{id}/record` + `/works` (CORS-enabled, Accept: application/json) → populate name, affiliations, education, employment, publications
- **OpenAlex enrichment**: `https://api.openalex.org/authors/orcid:{orcid}` or author search by name → citations, h-index-ish metrics, top works, co-authors
- **CV/resume upload**: PDF (pdf.js CDN) or DOCX (mammoth.js CDN) → text extraction → heuristic parsing into profile fields (education, positions, publications section detection) with user confirmation screen
- **Manual paste-import for LinkedIn / Google Scholar / ResearchGate**: guided boxes — "On LinkedIn: your profile → More → Save to PDF → paste the text here"; "Google Scholar: your profile → export citations (BibTeX)"; parse BibTeX into publications. Honest UI note: these platforms block automatic import.
- All fields editable. Stored in localStorage. Export/import profile as .json.

### 2. Grant source database (js/data/grants.js)
Research via web search; official sources only; null for undocumented fields; sourceUrl + lastChecked 2026-10-12 per entry. Starter set:
- **NSF** (biosketch format — current NSF-approved format, current & pending support, project summary 1 page, project description 15 pages, facilities, data management plan, budget)
- **NIH** (biosketch 5 pages, specific aims 1 page, research strategy page limits by mechanism R01/R21, other support)
- **ERC** (Starting/Consolidator/Advanced — CV template, track record, synopsis)
- **Horizon Europe** (brief)
- **Popular private funders**: e.g., Spencer Foundation, Sloan, Russell Sage (education/social science relevant) — 2-3 entries
- **Custom university/internal grant builder**: user defines required documents (name, page limit, format) → gets its own checklist + document generators
Per source: list of required submission documents, page/word limits, formatting rules, eligibility notes, deadlines page link, submission portal link, step-by-step application guide (step text + official link per step — the user's "next step, go to this link" requirement).

### 3. Document generators (js/generators.js)
From profile + project details (user inputs: title, abstract/aims, budget category, collaborators):
- **Author bios**: short (50/100/200-word) bio variants, journal-style or grant-style
- **NSF-format biosketch** and **NIH-format biosketch** as downloadable .docx (docx.js CDN) — correct section structure per official format; profile data pre-filled
- **Current & pending support** table (user-entered projects → formatted table, .docx)
- **Letter drafters** (BYO-key AI, OpenAI-compatible, localStorage only; template fallback without key): letter of intent, cover letter to program officer, collaboration letter, letter of support template to send to collaborators
- **Project summary / specific aims skeleton** with prompts per funder rules
- Every document: live preview + .docx download + copy-to-clipboard

### 4. Application workspace
- Select grant source (or custom) → dashboard of required documents with status (not started / drafted / done), progress bar
- Step-by-step guide panel: ordered steps with official links ("Create an NSF account at research.gov → link"), checkable
- Deadline field per application with countdown display

### 5. AI assist (BYO key, optional)
- Draft/refine bios, letters, summaries from profile + project details
- App fully functional without key (templates + pre-filled data)

## Quality bar
- node --check all JS; curl-verify CDNs (pdf.js, mammoth, docx); node smoke tests: ORCID fetch parser (live test with a real public ORCID, e.g. 0000-0002-1825-0097), BibTeX paste parser, grant data integrity; docx outputs valid OOXML; browser e2e if harness available; zero console errors
- README: same structure as ScholarFix/AcceptEdge
