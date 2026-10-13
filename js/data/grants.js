/* GrantPilot — js/data/grants.js
 * Grant source database. Every entry was researched from official funder
 * sources (agencies' own policy pages, portals, and application guides).
 * `sourceUrl` points at the official page the facts were drawn from;
 * `lastChecked` is the verification date (2026-10-12). Fields the funder
 * does not document are null — never invented.
 *
 * Exposed as window.GRANTPILOT_GRANTS (also requireable under Node for tests).
 */
(function (global) {
  'use strict';

  var CHECKED = '2026-10-12';

  var GRANTS = [

    /* ============================== NSF ============================== */
    {
      id: 'nsf-standard',
      name: 'NSF Standard Research Proposal',
      funder: 'National Science Foundation (US)',
      region: 'United States',
      type: 'federal',
      summary: 'Standard NSF full proposal governed by the Proposal & Award Policies & Procedures Guide (PAPPG 24-1). Merit review criteria: Intellectual Merit and Broader Impacts. Since 23 October 2023 the Biographical Sketch and Current & Pending (Other) Support must be produced in SciENcv; since 20 May 2024 Synergistic Activities is a separate one-page document.',
      eligibility: 'Varies by program/solicitation; generally U.S. institutions of higher education and non-profit organizations. Check the specific solicitation.',
      amounts: null,
      duration: null,
      deadlinesInfo: 'Varies by program — many programs have target dates or accept proposals anytime. Check the specific solicitation.',
      deadlinesUrl: 'https://new.nsf.gov/funding/opportunities',
      portalName: 'Research.gov',
      portalUrl: 'https://www.research.gov',
      guidelinesUrl: 'https://www.nsf.gov/policies/pappg',
      documents: [
        { id: 'project-summary', name: 'Project Summary', required: true, limit: '1 page', format: 'Text entered/uploaded in Research.gov', notes: 'Three separately labeled sections, each heading on its own line: Overview, Intellectual Merit, Broader Impacts. Must be understandable to a scientifically literate reader.', sourceUrl: 'https://www.nsf.gov/policies/pappg' },
        { id: 'project-description', name: 'Project Description', required: true, limit: '15 pages (incl. figures/tables)', format: 'PDF', notes: 'Must contain a labeled Broader Impacts section; Results from Prior NSF Support (max 5 of the 15 pages) if any PI/co-PI had NSF funding ending in the past 5 years; no URLs/hyperlinks permitted.', sourceUrl: 'https://www.nsf.gov/policies/pappg' },
        { id: 'references-cited', name: 'References Cited', required: true, limit: 'No page limit', format: 'PDF', notes: 'Bibliographic citations only; all authors in order (no et al.).', sourceUrl: 'https://www.nsf.gov/policies/pappg' },
        { id: 'biosketch', name: 'Biographical Sketch (per senior/key person)', required: true, limit: 'No page limit (3-page cap removed in PAPPG 24-1)', format: 'SciENcv-generated certified PDF', notes: 'SciENcv is mandatory. Sections: Identifying Information; Organization and Location; Professional Preparation; Appointments and Positions; Products (max 5 closely related + 5 other significant); Certification. GrantPilot pre-fills the content; you must still generate and certify the final PDF in SciENcv.', sourceUrl: 'https://new.nsf.gov/funding/senior-personnel-documents' },
        { id: 'cp-support', name: 'Current & Pending (Other) Support (per senior/key person)', required: true, limit: 'No page limit', format: 'SciENcv-generated certified PDF', notes: 'Lists every project (including this proposal) with source, award amount, period, person-months, and overlap statement. Includes malign foreign talent recruitment program certification.', sourceUrl: 'https://new.nsf.gov/funding/senior-personnel-documents' },
        { id: 'synergistic', name: 'Synergistic Activities (per senior/key person)', required: true, limit: '1 page', format: 'PDF (not SciENcv)', notes: 'Separate document since 20 May 2024. Up to five distinct examples of broader professional/scholarly impact.', sourceUrl: 'https://new.nsf.gov/funding/senior-personnel-documents' },
        { id: 'budget', name: 'Budget + Budget Justification', required: true, limit: 'Justification: up to 5 pages per organization', format: 'Research.gov budget form + PDF', notes: 'Each budget line must be documented and justified.', sourceUrl: 'https://www.nsf.gov/policies/pappg' },
        { id: 'facilities', name: 'Facilities, Equipment & Other Resources', required: true, limit: 'No page limit', format: 'PDF', notes: 'Narrative only — no quantifiable financial information.', sourceUrl: 'https://www.nsf.gov/policies/pappg' },
        { id: 'dmsp', name: 'Data Management & Sharing Plan', required: true, limit: 'Up to 2 pages', format: 'PDF (supplementary document)', notes: 'Required for every proposal; collaborative proposals submit one combined plan.', sourceUrl: 'https://www.nsf.gov/policies/pappg' },
        { id: 'mentoring', name: 'Postdoctoral Researcher Mentoring Plan', required: false, limit: '1 page', format: 'PDF (supplementary document)', notes: 'Required if the project supports postdoctoral researchers or graduate students.', sourceUrl: 'https://www.nsf.gov/policies/pappg' },
        { id: 'coa', name: 'Collaborators & Other Affiliations (COA)', required: true, limit: null, format: 'NSF fillable template', notes: 'Per senior/key person: advisors/advisees, co-authors, collaborators, co-editors.', sourceUrl: 'https://new.nsf.gov/funding/senior-personnel-documents' }
      ],
      steps: [
        { text: 'Find the right program/solicitation and read its full text (solicitation instructions override the PAPPG)', url: 'https://new.nsf.gov/funding/opportunities' },
        { text: 'Register for an NSF account at Research.gov (PI role)', url: 'https://www.research.gov' },
        { text: 'Register for a free ORCID iD if you do not have one', url: 'https://orcid.org/register' },
        { text: 'Sign in to SciENcv (via Research.gov) and build your Biographical Sketch and Current & Pending (Other) Support; link ORCID to pull in works', url: 'https://www.ncbi.nlm.nih.gov/sciencv/' },
        { text: 'Confirm your institution is registered in SAM.gov (usually handled by your sponsored programs office)', url: 'https://sam.gov' },
        { text: 'Start a new proposal in Research.gov: cover sheet, project summary, project description, budget', url: 'https://www.research.gov' },
        { text: 'Upload senior/key personnel documents (certified SciENcv biosketch + C&P, Synergistic Activities, COA) and supplementary documents (DMSP, mentoring plan)', url: 'https://www.research.gov' },
        { text: 'Route to your sponsored programs office; the AOR submits via Research.gov by 5 p.m. submitter’s local time on the deadline', url: 'https://www.research.gov' }
      ],
      sourceUrl: 'https://www.nsf.gov/policies/pappg',
      lastChecked: CHECKED
    },

    /* ============================== NIH R01 ============================== */
    {
      id: 'nih-r01',
      name: 'NIH R01 — Research Project Grant',
      funder: 'National Institutes of Health (US)',
      region: 'United States',
      type: 'federal',
      summary: 'The flagship NIH research grant. Specific Aims is always 1 page; the Research Strategy is 12 pages for R01. Biosketches are 5 pages. Due dates on or after 25 January 2026 use the NIH Common Forms (SciENcv-generated biosketch Common Form plus a separate Biosketch Supplement); hard-error enforcement began 8 May 2026. PD/PIs must have an ORCID iD linked to their eRA Commons personal profile.',
      eligibility: 'Varies by NOFO/institute; most U.S. and many foreign organizations are eligible. Check the specific Notice of Funding Opportunity (NOFO).',
      amounts: 'Budget not capped (modular budgets up to $250k/yr direct costs); project period typically up to 5 years.',
      duration: 'Up to 5 years',
      deadlinesInfo: 'Standard due dates (new applications): February 5, June 5, October 5.',
      deadlinesUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide/due-dates-and-submission-policies/due-dates.htm',
      portalName: 'ASSIST or Grants.gov Workspace',
      portalUrl: 'https://public.era.nih.gov/assist/',
      guidelinesUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm',
      documents: [
        { id: 'specific-aims', name: 'Specific Aims', required: true, limit: '1 page', format: 'PDF attachment', notes: 'Single page for all activity codes. State the problem, gap, central hypothesis, and 2–3 aims.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide/format-and-write/page-limits.htm' },
        { id: 'research-strategy', name: 'Research Strategy', required: true, limit: '12 pages', format: 'PDF attachment', notes: 'Sections: Significance, Innovation, Approach. Figures/tables count against the limit; preliminary data included here.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide/format-and-write/page-limits.htm' },
        { id: 'biosketch', name: 'Biosketch (per senior/key person)', required: true, limit: '5 pages', format: 'SciENcv-generated Common Form PDF + Biosketch Supplement', notes: 'Common Form: Professional Preparation, Appointments & Positions, Products, Certification. Supplement: Personal Statement, Honors, Contributions to Science (max 5 contributions, up to 4 citations each).', sourceUrl: 'https://grants.nih.gov/grants/forms/biosketch.htm' },
        { id: 'abstract', name: 'Project Summary/Abstract', required: true, limit: '30 lines of text', format: 'Form field', notes: 'Self-contained description understandable to non-specialists; no proprietary/confidential info.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'narrative', name: 'Project Narrative', required: true, limit: 'Three sentences', format: 'Form field', notes: 'Relevance to public health in plain language.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'bibliography', name: 'Bibliography & References Cited', required: true, limit: null, format: 'PDF attachment', notes: null, sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'facilities', name: 'Facilities & Other Resources', required: true, limit: null, format: 'PDF attachment', notes: null, sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'budget', name: 'Budget & Budget Justification', required: true, limit: null, format: 'R&R Budget Form', notes: 'Modular budget if ≤ $250k direct costs/year; otherwise detailed R&R budget.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'other-support', name: 'Other Support', required: false, limit: null, format: 'SciENcv Common Form PDF (just-in-time)', notes: 'Requested just-in-time before award; required for all senior/key personnel; includes signature/certification.', sourceUrl: 'https://grants.nih.gov/grants-forms/others-support.htm' },
        { id: 'dms-plan', name: 'Data Management & Sharing Plan', required: true, limit: null, format: 'PHS 398 form field', notes: 'Required for all applications proposing research that generates scientific data.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'human-subjects', name: 'Human Subjects / Vertebrate Animals sections', required: false, limit: null, format: 'PHS Human Subjects and Clinical Trials Information form', notes: 'Required if applicable.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' }
      ],
      steps: [
        { text: 'Find a Notice of Funding Opportunity (NOFO) and read Section IV application instructions', url: 'https://grants.nih.gov/funding/searchguide/index.html' },
        { text: 'Confirm organization registrations: SAM.gov (UEI), then Grants.gov, then eRA Commons — allow several weeks', url: 'https://grants.nih.gov/new-to-nih/organization-registration' },
        { text: 'Get your personal eRA Commons account (via your signing official) and link your ORCID iD in your personal profile', url: 'https://commons.era.nih.gov' },
        { text: 'Build your biosketch in SciENcv (Common Form + NIH Biosketch Supplement)', url: 'https://www.ncbi.nlm.nih.gov/sciencv/' },
        { text: 'Prepare the application in ASSIST or Grants.gov Workspace using the SF424 (R&R) forms', url: 'https://public.era.nih.gov/assist/' },
        { text: 'Write Specific Aims (1 page) and Research Strategy (12 pages); format: ≥11pt font, ≥0.5" margins, ≤6 lines per vertical inch', url: 'https://grants.nih.gov/grants/how-to-apply-application-guide/format-and-write/format-attachments.htm' },
        { text: 'Complete internal routing; your AOR/SO submits by 5 p.m. local time on the due date', url: 'https://grants.nih.gov/grants-process/submit/submit-track-view' },
        { text: 'Track status and view the assembled application in eRA Commons; fix errors/warnings within the viewing window', url: 'https://commons.era.nih.gov' }
      ],
      sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm',
      lastChecked: CHECKED
    },

    /* ============================== NIH R21 ============================== */
    {
      id: 'nih-r21',
      name: 'NIH R21 — Exploratory/Developmental Research Grant',
      funder: 'National Institutes of Health (US)',
      region: 'United States',
      type: 'federal',
      summary: 'High-risk, exploratory projects. Research Strategy is 6 pages (vs 12 for R01). Maximum $275,000 direct costs over the whole project period, no more than $200,000 in any single year, up to 2 years, and no competing renewal. Biosketch 5 pages; Specific Aims 1 page. Same registration and submission systems as the R01.',
      eligibility: 'Varies by NOFO; not all institutes accept the parent R21 — confirm institute participation.',
      amounts: 'Up to $275,000 total direct costs; ≤ $200,000 in any one year.',
      duration: 'Up to 2 years; no renewal.',
      deadlinesInfo: 'Standard due dates (new applications): February 16, June 16, October 16.',
      deadlinesUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide/due-dates-and-submission-policies/due-dates.htm',
      portalName: 'ASSIST or Grants.gov Workspace',
      portalUrl: 'https://public.era.nih.gov/assist/',
      guidelinesUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm',
      documents: [
        { id: 'specific-aims', name: 'Specific Aims', required: true, limit: '1 page', format: 'PDF attachment', notes: 'Two aims is typical for an R21 scope.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide/format-and-write/page-limits.htm' },
        { id: 'research-strategy', name: 'Research Strategy', required: true, limit: '6 pages', format: 'PDF attachment', notes: 'Significance, Innovation, Approach — exploratory premise can substitute for preliminary data.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide/format-and-write/page-limits.htm' },
        { id: 'biosketch', name: 'Biosketch (per senior/key person)', required: true, limit: '5 pages', format: 'SciENcv Common Form + Biosketch Supplement', notes: 'Same biosketch format as R01.', sourceUrl: 'https://grants.nih.gov/grants/forms/biosketch.htm' },
        { id: 'abstract', name: 'Project Summary/Abstract', required: true, limit: '30 lines of text', format: 'Form field', notes: null, sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'narrative', name: 'Project Narrative', required: true, limit: 'Three sentences', format: 'Form field', notes: null, sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'budget', name: 'Budget & Budget Justification', required: true, limit: null, format: 'R&R Budget Form', notes: 'Combined direct costs ≤ $275k over up to 2 years; ≤ $200k in any one year.', sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'bibliography', name: 'Bibliography & References Cited', required: true, limit: null, format: 'PDF attachment', notes: null, sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' },
        { id: 'other-support', name: 'Other Support', required: false, limit: null, format: 'SciENcv Common Form (just-in-time)', notes: 'Requested just-in-time before award.', sourceUrl: 'https://grants.nih.gov/grants-forms/others-support.htm' },
        { id: 'dms-plan', name: 'Data Management & Sharing Plan', required: true, limit: null, format: 'PHS 398 form field', notes: null, sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm' }
      ],
      steps: [
        { text: 'Confirm the institute accepts unsolicited/parent R21 applications (or find an institute-specific R21 NOFO)', url: 'https://grants.nih.gov/funding/searchguide/index.html' },
        { text: 'Confirm organization registrations: SAM.gov, Grants.gov, eRA Commons', url: 'https://grants.nih.gov/new-to-nih/organization-registration' },
        { text: 'Get your eRA Commons account and link ORCID', url: 'https://commons.era.nih.gov' },
        { text: 'Build your biosketch in SciENcv', url: 'https://www.ncbi.nlm.nih.gov/sciencv/' },
        { text: 'Prepare the application in ASSIST or Grants.gov Workspace (SF424 R&R)', url: 'https://public.era.nih.gov/assist/' },
        { text: 'Write Specific Aims (1 page) and Research Strategy (6 pages)', url: 'https://grants.nih.gov/grants/how-to-apply-application-guide/format-and-write/page-limits.htm' },
        { text: 'Internal routing; AOR/SO submits by 5 p.m. local time on the due date', url: 'https://grants.nih.gov/grants-process/submit/submit-track-view' },
        { text: 'Track in eRA Commons and resolve any errors/warnings promptly', url: 'https://commons.era.nih.gov' }
      ],
      sourceUrl: 'https://grants.nih.gov/grants/how-to-apply-application-guide.htm',
      lastChecked: CHECKED
    },

    /* ============================== ERC ============================== */
    {
      id: 'erc-individual',
      name: 'ERC Starting / Consolidator / Advanced Grant',
      funder: 'European Research Council (EU)',
      region: 'European Union / Horizon Europe associated countries',
      type: 'european',
      summary: 'Investigator-driven frontier research. Single PI hosted at an institution in an EU Member State or associated country. The application is Part A (online administrative forms) + Part B1 (Part I of the Scientific Proposal, 5 pages; CV & Track Record, 4 pages) + Part B2 (Part II of the Scientific Proposal, 7 pages; Funding ID appendix) + supporting documents (host institution support letter, PhD certificate, eligibility-extension documents). Step-1 panels evaluate only Part I + CV & Track Record. From the 2027 Work Programme, StG eligibility is a PhD defended 0–10 years before 1 January of the call year; CoG 5–15 years; AdG has no career-window restriction.',
      eligibility: 'StG: PhD 0–10 years before the reference date (2027 call); CoG: 5–15 years; AdG: none. Any nationality; host institution in EU/associated country. Career-break extensions documented in the Work Programme.',
      amounts: 'StG up to €1.5M; CoG up to €2M; AdG up to €2.5M (plus up to €1M additional for justified costs / €2M for relocation from a non-associated third country).',
      duration: 'Up to 5 years',
      deadlinesInfo: 'Annual calls per scheme; StG 2027 deadline 14 October 2026, CoG 2027 deadline 12 January 2027. Confirm on the ERC site and the Funding & Tenders Portal.',
      deadlinesUrl: 'https://erc.europa.eu/apply-grant',
      portalName: 'EU Funding & Tenders Portal',
      portalUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home',
      guidelinesUrl: 'https://erc.europa.eu/apply-grant',
      documents: [
        { id: 'part-a', name: 'Part A — Administrative Forms', required: true, limit: null, format: 'Online in the portal', notes: 'Participant details, abstract (max 2000 characters), budget, ethics table, time commitment.', sourceUrl: 'https://erc.europa.eu/apply-grant' },
        { id: 'part-b1-synopsis', name: 'Part I — Scientific Proposal (Extended Synopsis)', required: true, limit: '5 pages', format: 'Official Word template → PDF', notes: 'Evaluated alone (with the CV & Track Record) at Step 1. Present the frontier question and overall research strategy; do not pad with feasibility detail.', sourceUrl: 'https://erc.europa.eu/apply-grant' },
        { id: 'part-b1-cv', name: 'Curriculum Vitae & Track Record', required: true, limit: '4 pages', format: 'Official template → PDF', notes: 'Template includes career breaks/diversifications; selected publications/achievements with evidence of independence.', sourceUrl: 'https://erc.europa.eu/apply-grant' },
        { id: 'part-b2', name: 'Part II — Scientific Proposal', required: true, limit: '7 pages', format: 'Official Word template → PDF', notes: 'Methodology, work plan, risk management, feasibility; evaluated at Step 2.', sourceUrl: 'https://erc.europa.eu/apply-grant' },
        { id: 'resources', name: 'Resources and Time Commitment', required: true, limit: '2 pages', format: 'Template → PDF', notes: 'Justify resources; PI time commitment on the project.', sourceUrl: 'https://erc.europa.eu/apply-grant' },
        { id: 'host-letter', name: 'Host Institution Binding Statement of Support', required: true, limit: null, format: 'Template → PDF', notes: 'Signed by the host institution.', sourceUrl: 'https://erc.europa.eu/apply-grant' },
        { id: 'phd-proof', name: 'PhD certificate + eligibility extension documents', required: true, limit: null, format: 'PDF annexes', notes: 'Documents the PhD defence date and any extension grounds (parental leave, etc.).', sourceUrl: 'https://erc.europa.eu/apply-grant' }
      ],
      steps: [
        { text: 'Check eligibility window (PhD defence date vs the call reference date) and resubmission restrictions in the Work Programme', url: 'https://erc.europa.eu/apply-grant' },
        { text: 'Secure an eligible host institution and its signed Binding Statement of Support', url: 'https://erc.europa.eu/apply-grant' },
        { text: 'Register on the EU Funding & Tenders Portal and get a PIC for the host institution', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { text: 'Choose your evaluation panel and keywords from the call topic page; download the official Part B templates there', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { text: 'Write Part I (5 pages) and the CV & Track Record (4 pages) — Step 1 reviewers see only these', url: 'https://erc.europa.eu/apply-grant' },
        { text: 'Write Part II (7 pages), Resources & Time Commitment, and the Part A budget', url: 'https://erc.europa.eu/apply-grant' },
        { text: 'Upload all PDFs, resolve validation errors, and submit before 17:00 Brussels time on the deadline', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' }
      ],
      sourceUrl: 'https://erc.europa.eu/apply-grant',
      lastChecked: CHECKED
    },

    /* ========================= Horizon Europe ========================= */
    {
      id: 'horizon-europe',
      name: 'Horizon Europe — Research & Innovation Action (RIA/IA)',
      funder: 'European Commission (EU)',
      region: 'European Union / international consortia',
      type: 'european',
      summary: 'Collaborative EU research funding. Part A is completed online (participants, budget summary, abstract ≤2000 characters, ethics); Part B is a PDF with sections 1 Excellence, 2 Impact, 3 Implementation. Standard RIA/IA limit is 40 pages for Part B sections 1–3 (45 pages for lump-sum topics); CSA 25 pages. Evaluation: Excellence, Impact, and Quality & Efficiency of Implementation each scored 0–5 with a 3/5 threshold and 10/15 overall. Always download the topic-specific template from the call page.',
      eligibility: 'Typically a consortium of at least 3 independent legal entities in 3 different EU Member States/associated countries (one in a Member State). Topic-specific conditions apply.',
      amounts: null,
      duration: null,
      deadlinesInfo: 'Topic-specific deadlines in the Work Programme; check the call page on the portal.',
      deadlinesUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home',
      portalName: 'EU Funding & Tenders Portal',
      portalUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home',
      guidelinesUrl: 'https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en',
      documents: [
        { id: 'part-a', name: 'Part A — Administrative Forms', required: true, limit: 'Abstract max 2000 characters', format: 'Online in the portal', notes: 'Participants, budget summary, ethics flags, keywords.', sourceUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { id: 'excellence', name: 'Part B Section 1 — Excellence', required: true, limit: '40 pages total for Sections 1–3 (45 for lump-sum topics)', format: 'Topic template → PDF', notes: 'Objectives beyond the state of the art; sound methodology (incl. social sciences/humanities integration where relevant, open science, gender dimension).', sourceUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { id: 'impact', name: 'Part B Section 2 — Impact', required: true, limit: '(shared 40-page limit)', format: 'Topic template → PDF', notes: 'Pathways toward the topic’s expected outcomes/impacts; dissemination, exploitation, communication measures. Weighted 1.5 in IA ranking.', sourceUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { id: 'implementation', name: 'Part B Section 3 — Implementation', required: true, limit: '(shared 40-page limit)', format: 'Topic template → PDF', notes: 'Work plan, work packages, deliverables/milestones, consortium capacity, risk management.', sourceUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { id: 'annexes', name: 'Annexes (CVs, letters of support, ethics self-assessment where required)', required: false, limit: null, format: 'PDF', notes: 'Only if the topic requests them; they do not count toward the page limit.', sourceUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' }
      ],
      steps: [
        { text: 'Find a call topic in the Funding & Tenders Portal and read the topic text and Work Programme General Annexes', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { text: 'Assemble an eligible consortium (typically ≥3 entities from ≥3 countries) and register each partner’s PIC', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { text: 'Download the official application template from the topic page', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { text: 'Write Part B Sections 1–3 within the 40-page limit (45 for lump-sum)', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { text: 'Complete Part A online: abstract, budget, ethics table', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' },
        { text: 'Validate and submit via the portal before the call deadline (17:00 Brussels time)', url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home' }
      ],
      sourceUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home',
      lastChecked: CHECKED
    },

    /* ========================= Spencer Foundation ========================= */
    {
      id: 'spencer',
      name: 'Spencer Foundation — Research Grants on Education',
      funder: 'Spencer Foundation (US)',
      region: 'United States + international (English, USD budgets)',
      type: 'foundation',
      summary: 'Major private funder of education research. Large Research Grants use a two-stage process: a preproposal (single PDF; narrative max ~1,250 words, double-spaced, ≥12-pt font) reviewed for invitation to a full proposal. Small Research Grants (up to $50,000) use a ~1,800-word research narrative. PI CV uploads are capped at 10 pages. Applications go through Spencer’s online portal (smartsimple.us); the PI must be doctorally qualified and apply through an administering institution.',
      eligibility: 'PIs must have an earned doctorate and be affiliated with a nonprofit administering institution; international applicants eligible (English, USD budgets).',
      amounts: 'Small Research Grants up to $50,000; Large Research Grants $125,000–$500,000.',
      duration: '1–5 years (program dependent)',
      deadlinesInfo: 'Program-specific cycles that change yearly — confirm current dates on spencer.org.',
      deadlinesUrl: 'https://www.spencer.org/grant_types/small-research-grant',
      portalName: 'Spencer online portal',
      portalUrl: 'https://spencer.smartsimple.us',
      guidelinesUrl: 'https://www.spencer.org',
      documents: [
        { id: 'preproposal', name: 'Preproposal (Large Grants) — single PDF', required: true, limit: 'Narrative max ~1,250 words; double-spaced; ≥12-pt font', format: 'PDF via online form', notes: 'Problem, significance, equity framing, research questions, activities summary.', sourceUrl: 'https://www.spencer.org' },
        { id: 'narrative', name: 'Research Narrative (Small Grants / invited full proposals)', required: true, limit: '~1,800 words (Small Grants)', format: 'PDF via online form', notes: 'Methodology and significance; word limits enforced by the form.', sourceUrl: 'https://www.spencer.org' },
        { id: 'cv', name: 'PI CV', required: true, limit: '10 pages', format: 'PDF uploaded to My Profile', notes: 'Uploaded on the portal profile page.', sourceUrl: 'https://www.spencer.org' },
        { id: 'budget', name: 'Budget & Budget Justification', required: true, limit: null, format: 'Portal budget form', notes: 'USD budgets; check the program’s indirect-cost policy.', sourceUrl: 'https://www.spencer.org' },
        { id: 'summary', name: 'Proposal Summary', required: true, limit: null, format: 'Online form field', notes: null, sourceUrl: 'https://www.spencer.org' },
        { id: 'timeline', name: 'Project Timeline', required: true, limit: null, format: 'Form/PDF', notes: null, sourceUrl: 'https://www.spencer.org' }
      ],
      steps: [
        { text: 'Read the program page for the target grant (Small / Large / RPP) and confirm the current cycle dates', url: 'https://www.spencer.org' },
        { text: 'Register on the Spencer portal and complete My Profile, including your 10-page CV', url: 'https://spencer.smartsimple.us' },
        { text: 'From your Workbench, click Apply for the program and complete the online form', url: 'https://spencer.smartsimple.us' },
        { text: 'Prepare the preproposal/narrative PDF within the word limit and upload it', url: 'https://spencer.smartsimple.us' },
        { text: 'Submit by 12:00 noon Central Time on the deadline; invited full proposals follow the posted second-stage date', url: 'https://www.spencer.org' }
      ],
      sourceUrl: 'https://www.spencer.org',
      lastChecked: CHECKED
    },

    /* ======================= Alfred P. Sloan Foundation ======================= */
    {
      id: 'sloan',
      name: 'Alfred P. Sloan Foundation — Program Grants',
      funder: 'Alfred P. Sloan Foundation (US)',
      region: 'Primarily United States',
      type: 'foundation',
      summary: 'Funds research and education in science, technology, engineering, mathematics, and economics through specific grantmaking programs. Sloan does not accept unsolicited full proposals: start with a Letter of Inquiry (LOI) emailed to the relevant program director (1–2 sentence purpose statement, description of work, cost estimate, duration, your title/contact, key team members). Promising LOIs are invited to submit a formal proposal; expect independent expert review and possible revision rounds. Grants are made year-round; awards over $250,000 are approved quarterly.',
      eligibility: 'Varies by program; check the program page’s Apply section — not all programs accept unsolicited inquiries.',
      amounts: null,
      duration: null,
      deadlinesInfo: 'Rolling/LOI-based; major grants (> $250k) approved quarterly.',
      deadlinesUrl: 'https://sloan.org/grants/apply',
      portalName: 'Email LOI to program director',
      portalUrl: 'https://sloan.org/grants/apply',
      guidelinesUrl: 'https://sloan.org/grants/apply',
      documents: [
        { id: 'loi', name: 'Letter of Inquiry', required: true, limit: null, format: 'Email to program director', notes: 'Must include: 1–2 sentence purpose statement; description of proposed work; total cost estimate and Sloan request; duration; your title/contact info; names/affiliations of key team members.', sourceUrl: 'https://sloan.org/grants/apply' },
        { id: 'proposal', name: 'Formal Grant Proposal (by invitation)', required: true, limit: null, format: 'Per Grant Proposal Guidelines (research vs non-research)', notes: 'Includes the Proposal Administration Form (PAF).', sourceUrl: 'https://sloan.org/grants/apply' },
        { id: 'budget', name: 'Budget', required: true, limit: null, format: 'Per proposal guidelines', notes: null, sourceUrl: 'https://sloan.org/grants/apply' }
      ],
      steps: [
        { text: 'Identify the relevant grantmaking program and read its goals, strategies, and recent grants', url: 'https://sloan.org/grants/apply' },
        { text: 'Check the program page’s Apply section to confirm it accepts unsolicited inquiries', url: 'https://sloan.org/grants/apply' },
        { text: 'Email a Letter of Inquiry to the program director with all required elements', url: 'https://sloan.org/grants/apply' },
        { text: 'If invited (allow up to ~8 weeks for a response), prepare the formal proposal with the Proposal Administration Form', url: 'https://sloan.org/grants/apply' },
        { text: 'Respond to reviewer comments and revise as requested during expert review', url: 'https://sloan.org/grants/apply' }
      ],
      sourceUrl: 'https://sloan.org/grants/apply',
      lastChecked: CHECKED
    },

    /* ======================= Russell Sage Foundation ======================= */
    {
      id: 'russell-sage',
      name: 'Russell Sage Foundation — Core Research Grants',
      funder: 'Russell Sage Foundation (US)',
      region: 'United States',
      type: 'foundation',
      summary: 'Social-science funder (behavioral science, race/ethnicity/immigration, social/economic inequality, future of work, and special initiatives). Two-stage process: Letter of Inquiry through the Fluxx portal (rsf.fluxx.io), then ~15% of LOIs are invited to full proposals. Research grants up to $200,000 including 15% indirect costs (no indirect costs on awards of $75,000 or less), 1–2 years. All deadlines are 2:00 p.m. ET; new Fluxx accounts should be created at least a week early (activation can take up to 5 business days).',
      eligibility: 'Faculty/researchers at U.S. institutions per program guidelines; LOIs must describe data and research design specifically.',
      amounts: 'Up to $200,000 (incl. 15% indirect; none on ≤ $75,000).',
      duration: '12 or 24 months',
      deadlinesInfo: 'Spring/Summer/Fall cycles rotating across programs; LOIs and proposals due 2 p.m. ET. Confirm current dates on the site.',
      deadlinesUrl: 'https://www.russellsage.org/apply/application-deadlines',
      portalName: 'Fluxx portal',
      portalUrl: 'https://rsf.fluxx.io',
      guidelinesUrl: 'https://www.russellsage.org/apply',
      documents: [
        { id: 'loi', name: 'Letter of Inquiry', required: true, limit: 'Project abstract recommended ~150 words', format: 'Fluxx online form', notes: 'Must include specific information about proposed data and research design; no full budget at LOI stage.', sourceUrl: 'https://www.russellsage.org/apply' },
        { id: 'proposal', name: 'Full Proposal (by invitation)', required: true, limit: null, format: 'Fluxx', notes: 'Includes budget on the RSF budget template.', sourceUrl: 'https://www.russellsage.org/apply/info/requirements' },
        { id: 'budget', name: 'Budget (RSF template)', required: true, limit: null, format: 'RSF budget template', notes: 'Max $200k incl. 15% indirect; no indirect on ≤ $75k.', sourceUrl: 'https://www.russellsage.org/apply' },
        { id: 'cv', name: 'CV(s)', required: true, limit: null, format: 'PDF upload', notes: null, sourceUrl: 'https://www.russellsage.org/apply/info/requirements' }
      ],
      steps: [
        { text: 'Review the program areas and confirm your project fits the foundation’s priorities', url: 'https://www.russellsage.org/apply' },
        { text: 'Check the current LOI deadlines for your program area (rotating cycles)', url: 'https://www.russellsage.org/apply/application-deadlines' },
        { text: 'Create a Fluxx account at least one week before the deadline (approval can take up to 5 business days)', url: 'https://rsf.fluxx.io' },
        { text: 'Submit the LOI with a specific data/research-design description by 2 p.m. ET', url: 'https://rsf.fluxx.io' },
        { text: 'If invited, submit the full proposal with RSF budget template; respond to reviewer comments', url: 'https://www.russellsage.org/apply/info/requirements' }
      ],
      sourceUrl: 'https://www.russellsage.org/apply',
      lastChecked: CHECKED
    }
  ];

  global.GRANTPILOT_GRANTS = GRANTS;
  global.GRANTPILOT_GRANTS_META = {
    checked: CHECKED,
    note: 'All entries researched from official funder sources on ' + CHECKED + '. Always verify against current solicitation/program pages before applying — funders revise rules frequently.'
  };
})(typeof window !== 'undefined' ? window : globalThis);
