# GrantPilot

A grant-application cockpit for academics. Build a reusable researcher profile
once — import it from ORCID, OpenAlex, or your CV — then generate every
document a funder requires (biosketches, current & pending support, letters,
project summaries) and track each application step by step. A fully static web
app — no backend, no build step, no account. Open `index.html` and start.

## Features

### 1. Researcher profile builder — populate once, reuse everywhere
Import sources, each clearly labeled with what is and isn't possible:

- **ORCID auto-import** (primary): enter an ORCID iD → the public record is
  fetched from `https://pub.orcid.org/v3.0/{id}/record` (CORS-enabled,
  `Accept: application/json`) → name, affiliations, education, employment, and
  works populate the profile. Try the demo iD `0000-0002-1825-0097`.
- **OpenAlex enrichment**: `https://api.openalex.org/authors/orcid:{orcid}` or
  author search by name → cited-by count, h-index, i10, and top-cited works
  merged into the publication list.
- **CV/résumé upload**: PDF (text extracted in-browser with pdf.js) or DOCX
  (mammoth.js) → heuristic section parsing (education, positions,
  publications, awards, grants) with a confirmation screen before anything is
  merged. Nothing is uploaded to a server.
- **Manual paste-import** for LinkedIn, Google Scholar, and ResearchGate:
  guided boxes ("LinkedIn: your profile → More → Save to PDF → paste the text
  here"; "Google Scholar: select papers → Export → BibTeX"). The UI states
  plainly that these platforms block automatic import — paste is the honest
  workaround. BibTeX is parsed into publications.

All fields are editable; everything is stored in localStorage; export/import
the whole profile as `.json`.

### 2. Grant source database (`js/data/grants.js`)
Researched from official funder sources only; every entry records a
`sourceUrl` and `lastChecked` (2026-10-12); undocumented limits are `null`,
never invented. Bundled sources:

- **NSF standard research proposal** (PAPPG 24-1): SciENcv-mandatory
  biosketch (Common Form sections, products ≤5+5, no page limit) and Current &
  Pending (Other) Support; Synergistic Activities as separate 1-page document;
  project summary 1 page with three labeled sections; project description 15
  pages; DMSP 2 pages; budget justification 5 pages; Research.gov steps.
- **NIH R01** and **NIH R21**: Specific Aims 1 page; Research Strategy 12
  pages (R01) / 6 pages (R21); biosketch 5 pages via the SciENcv Common Form +
  Biosketch Supplement (due dates on/after 25 Jan 2026); Other Support
  just-in-time; SAM.gov / eRA Commons / Grants.gov / ASSIST step guides;
  standard due dates.
- **ERC Starting / Consolidator / Advanced**: Part A + Part B1 (synopsis 5
  pages, CV & Track Record 4 pages) + Part B2 (7 pages) + host-institution
  support letter; 2027 Work Programme eligibility windows; Funding & Tenders
  Portal steps.
- **Horizon Europe RIA/IA**: Excellence/Impact/Implementation sections, 40
  pages (45 lump-sum), scoring thresholds, portal steps.
- **Spencer Foundation**, **Alfred P. Sloan Foundation**, **Russell Sage
  Foundation** — education/social-science-relevant private funders with
  document lists, LOI processes, and portal links (smartsimple.us,
  email-LOI, Fluxx).
- **Custom university/internal grant builder**: define the grant name,
  funder, portal, and required documents (name/limit/format) → it gets its
  own checklist, step guide, and per-document skeleton generators.

Each entry lists required submission documents with limits and notes, plus an
ordered step-by-step application guide with an official link per step.

### 3. Document generators (`js/generators.js`)
Pre-filled from your profile + the current application's project details:

- **Short bios** — 50/100/200-word variants, grant-style or journal-style,
  with a live word-count flag against the target.
- **NSF-format biosketch** and **NIH-format biosketch** as .docx — correct
  official section structure, profile pre-filled, with a clear notice that
  the certified final PDF must be generated in SciENcv (mandatory for NSF
  since Oct 2023; for NIH due dates on/after Jan 2026).
- **Current & pending (other) support** table (.docx) built from the
  projects in your profile, incl. overlap statements.
- **Letter drafters**: letter of intent, cover letter to a program officer,
  collaboration invitation, and a support-letter template to send to
  collaborators.
- **Project summary / specific aims / ERC synopsis skeletons** with prompts
  matching each funder's documented rules.

Every document has a live preview, .docx download (docx.js, pinned CDN), and
copy-to-clipboard. Edited text exports as a clean text .docx; unedited
biosketches/support tables export with the full structured layout.

### 4. Application workspace
Select a grant source (or a custom grant) → dashboard of required documents
with status (not started / drafted / done) and a progress bar; an ordered,
checkable step guide with official links; a per-application deadline with a
live countdown.

### 5. AI assist (BYO key, optional)
Any OpenAI-compatible chat-completions endpoint; endpoint/model/key are
stored **only** in this browser's localStorage and sent only to that
endpoint. "AI assist" refines the current document draft. Every generator has
a complete template fallback — the app is fully functional without a key.

## Screenshots

<!-- Add screenshots after deploying, e.g.:
![Profile with ORCID import](docs/screenshot-profile.png)
![NSF application workspace](docs/screenshot-workspace.png)
![Biosketch generator with live preview](docs/screenshot-documents.png)
-->

_coming soon_

## Tech

- Vanilla HTML/CSS/JS. No framework, no bundler, no build step.
- [docx.js](https://github.com/dolanmiu/docx) (`docx@9.8.1` IIFE build) via a
  pinned jsDelivr URL, lazy-loaded, for client-side .docx generation.
- [pdf.js](https://mozilla.github.io/pdf.js/) `3.11.174` (cdnjs, pinned) and
  [mammoth.js](https://github.com/mwilliamson/mammoth.js) `1.9.1` (jsDelivr,
  pinned) for CV text extraction.
- APIs (free, CORS-enabled, no key):
  [ORCID public API](https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/)
  and [OpenAlex](https://docs.openalex.org/).
- Optional AI assist calls any OpenAI-compatible chat-completions endpoint
  you configure; the key never leaves your browser except to that endpoint.

## Run locally

Option A — just open the file:

```
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

Option B — serve it (recommended, behaves exactly like hosting):

```
cd grantpilot
python3 -m http.server 8000
# then visit http://localhost:8000
```

Any static server works (`npx serve`, nginx, …). Internet access is required
for ORCID/OpenAlex import and for loading pdf.js / mammoth.js / docx.js from
the CDNs; profile editing, checklists, and template generators work offline
once loaded.

## Tests

Node smoke tests (parsers, grant data integrity, live ORCID fetch):

```
node test/smoke.js
```

.docx OOXML validation:

```
mkdir -p /tmp/gp-docx-test && cd /tmp/gp-docx-test && npm init -y && npm i docx@9.8.1
cd /path/to/grantpilot
NODE_PATH=/tmp/gp-docx-test/node_modules node test/docx.js
python3 test/validate-docx.py
```

Browser end-to-end (Playwright + Chromium; serves the app on port 8138):

```
python3 -m http.server 8138 &
node test/e2e.js
```

## Put it on GitHub (step-by-step, no git experience needed)

1. Create a free account at <https://github.com> and sign in.
2. Click the **+** in the top-right corner → **New repository**.
3. Name it `grantpilot`, leave it **Public**, do **not** check "Add a README"
   (this repo already has one), click **Create repository**.
4. Install git if you don't have it: <https://git-scm.com/downloads>
   (accept the defaults during install).
5. Open a terminal (macOS/Linux) or **Git Bash** (Windows) and run:

   ```
   cd path/to/grantpilot        # the folder containing index.html
   git init                     # only if this isn't already a git repo
   git add .
   git commit -m "Initial commit: GrantPilot"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/grantpilot.git
   git push -u origin main
   ```

   Replace `YOUR-USERNAME` with your GitHub username. When asked to sign in,
   use the browser window that opens (or a personal access token).
6. Refresh your repository page on GitHub — you should see all the files.

## Deploy to GitHub Pages

1. In your GitHub repository, click **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Under **Branch**, select **main** and **/ (root)**, click **Save**.
4. Wait a minute, then reload the page — GitHub shows your site URL:
   `https://YOUR-USERNAME.github.io/grantpilot/`

That's it — the app is a plain static site, so no build configuration is needed.

## Embed in your personal website

```html
<iframe
  src="https://YOUR-USERNAME.github.io/grantpilot/"
  style="width:100%; max-width:1240px; height:800px; border:1px solid #e2d9c9; border-radius:4px;"
  title="GrantPilot — grant application cockpit"
  loading="lazy">
</iframe>
```

Deep-link to a specific tab with the URL hash: `#profile`, `#grants`,
`#apps`, `#docs`, or `#ai`:

```html
<iframe src="https://YOUR-USERNAME.github.io/grantpilot/#grants" …></iframe>
```

## Repository layout

```
grantpilot/
├── index.html
├── styles.css
├── app.js              # UI wiring, tabs, workspace, persistence
├── js/
│   ├── profile.js      # profile schema, ORCID/OpenAlex import, pdf.js/mammoth CV extraction
│   ├── parsers.js      # pure paste parsers: BibTeX, LinkedIn, ResearchGate, CV heuristics
│   ├── generators.js   # document builders (bios, biosketches, support table, letters, skeletons) + docx
│   ├── ai.js           # optional BYO-key OpenAI-compatible assist
│   └── data/
│       └── grants.js   # funder requirement database (sourceUrl + lastChecked per entry)
├── test/
│   ├── smoke.js        # node tests: parsers, data integrity, live ORCID/OpenAlex
│   ├── docx.js         # generates every .docx in node (requires npm i docx@9.8.1)
│   ├── validate-docx.py# OOXML validation of generated files
│   └── e2e.js          # Playwright/Chromium end-to-end, zero-console-error gate
├── README.md
├── LICENSE             # MIT
└── .gitignore
```

## Disclaimer

Funder requirements are transcribed from official guidelines (sources and
verification dates in `js/data/grants.js`) and change frequently — always
verify against the current solicitation or program page before applying.
GrantPilot drafts biosketch and support-statement *content*; NSF and NIH
require the final certified documents to be produced in SciENcv. AI-assist
output is generated by the third-party model you configure and must be
reviewed before use.

## License

MIT — see [LICENSE](LICENSE).
