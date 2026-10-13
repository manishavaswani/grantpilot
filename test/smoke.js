/* GrantPilot — node smoke tests (not shipped in the app; run manually):
 *   node test/smoke.js
 * Covers: live ORCID fetch + parser (0000-0002-1825-0097), OpenAlex mapping,
 * BibTeX / LinkedIn / ResearchGate / CV paste parsers, grant data integrity,
 * and the pure document generators.
 */
'use strict';

require('../js/data/grants.js');
require('../js/parsers.js');
require('../js/profile.js');
require('../js/generators.js');

var GRANTS = globalThis.GRANTPILOT_GRANTS;
var Parsers = globalThis.GrantPilotParsers;
var Profile = globalThis.GrantPilotProfile;
var Gen = globalThis.GrantPilotGenerators;

var failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) { failures++; }
}

/* -------------------- 1. grant data integrity -------------------- */

check('grants: at least 8 entries', GRANTS.length >= 8);
GRANTS.forEach(function (g) {
  var ok = g.id && g.name && g.funder && g.summary &&
    Array.isArray(g.documents) && g.documents.length > 0 &&
    Array.isArray(g.steps) && g.steps.length > 0 &&
    g.sourceUrl && g.lastChecked === '2026-10-12';
  check('grant ' + g.id + ': required fields + sourceUrl + lastChecked', !!ok);
  g.documents.forEach(function (d, i) {
    check('grant ' + g.id + ' doc ' + i + ' has id/name/required-flag/sourceUrl',
      !!(d.id && d.name && typeof d.required === 'boolean' && d.sourceUrl));
  });
  g.steps.forEach(function (s, i) {
    check('grant ' + g.id + ' step ' + i + ' has text + official url', !!(s.text && s.url && /^https:\/\//.test(s.url)));
  });
});
// unique ids
var ids = GRANTS.map(function (g) { return g.id; });
check('grants: unique ids', new Set(ids).size === ids.length);
// named funders present
['nsf-standard', 'nih-r01', 'nih-r21', 'erc-individual', 'horizon-europe', 'spencer', 'sloan', 'russell-sage']
  .forEach(function (id) { check('grant present: ' + id, ids.indexOf(id) !== -1); });
// spot-check key researched facts
var nsf = GRANTS.find(function (g) { return g.id === 'nsf-standard'; });
var nihR01 = GRANTS.find(function (g) { return g.id === 'nih-r01'; });
var nihR21 = GRANTS.find(function (g) { return g.id === 'nih-r21'; });
check('NSF project description 15 pages', nsf.documents.some(function (d) { return d.id === 'project-description' && /15/.test(d.limit); }));
check('NSF project summary 1 page', nsf.documents.some(function (d) { return d.id === 'project-summary' && /1 page/.test(d.limit); }));
check('NIH R01 research strategy 12 pages', nihR01.documents.some(function (d) { return d.id === 'research-strategy' && /12/.test(d.limit); }));
check('NIH R21 research strategy 6 pages', nihR21.documents.some(function (d) { return d.id === 'research-strategy' && /6/.test(d.limit); }));
check('NIH biosketch 5 pages', nihR01.documents.some(function (d) { return d.id === 'biosketch' && /5/.test(d.limit); }));
check('NIH specific aims 1 page', nihR01.documents.some(function (d) { return d.id === 'specific-aims' && /1 page/.test(d.limit); }));

/* -------------------- 2. BibTeX parser -------------------- */

var bib = [
  '@article{smith2020trust,',
  '  title={Trust in {V}irtual {T}eams},',
  '  author={Smith, Jane and Doe, John and Lee, Karen},',
  '  journal={Journal of Management},',
  '  year={2020},',
  '  doi={10.1177/0149206320912345}',
  '}',
  '@inproceedings{garcia2021edtech,',
  '  title="EdTech adoption under constraint",',
  '  author={Garcia-Lopez, Maria},',
  '  booktitle={Proceedings of AERA},',
  '  year={2021}',
  '}'
].join('\n');
var pubs = Parsers.bibToPublications(bib);
check('bibtex: 2 entries parsed', pubs.length === 2);
check('bibtex: title braces stripped', pubs[0].title === 'Trust in Virtual Teams');
check('bibtex: authors split on "and"', pubs[0].authors.length === 3 && pubs[0].authors[0] === 'Smith, Jane');
check('bibtex: doi captured', pubs[0].doi === '10.1177/0149206320912345');
check('bibtex: booktitle -> venue', pubs[1].venue === 'Proceedings of AERA');
check('bibtex: quoted field values work', pubs[1].title === 'EdTech adoption under constraint');
check('bibtex: empty input safe', Parsers.bibToPublications('').length === 0);

/* -------------------- 3. LinkedIn parser -------------------- */

var li = [
  'Jane Doe', 'Professor at State University', '', 'Summary',
  'Education researcher focusing on inequality.', '', 'Experience',
  'Professor', 'State University', 'Sep 2018 - Present', 'Springfield',
  'Postdoctoral Fellow', 'Big Tech University', '2015 - 2018', '', 'Education',
  'Big Tech University', 'PhD, Education · (2010 - 2015)', ''
].join('\n');
var liRes = Parsers.parseLinkedInText(li);
check('linkedin: summary captured', /inequality/.test(liRes.summary));
check('linkedin: 2 appointments parsed', liRes.appointments.length === 2);
check('linkedin: current appointment detected', liRes.appointments.some(function (a) { return a.current; }));
check('linkedin: education parsed with years', liRes.education.length >= 1 && liRes.education[0].endYear === '2015');

/* -------------------- 4. ResearchGate parser -------------------- */

var rg = [
  'Publications', '',
  'Digital divides in rural schooling',
  'Authors: Jane Doe, John Roe',
  'Journal of Education Policy 2022',
  'DOI: 10.1080/02680939.2022.1234567',
  'Remote learning and attainment gaps',
  '2021',
  'Education', '',
  'State University',
  '2010 - 2014'
].join('\n');
var rgRes = Parsers.parseResearchGateText(rg);
check('researchgate: 2 publications parsed', rgRes.publications.length === 2);
check('researchgate: doi captured', rgRes.publications[0].doi === '10.1080/02680939.2022.1234567');
check('researchgate: authors captured', rgRes.publications[0].authors.length === 2);
check('researchgate: year on second pub', rgRes.publications[1].year === '2021');

/* -------------------- 5. CV text parser -------------------- */

var cv = [
  'Jane A. Doe, PhD', 'jane.doe@state.edu', 'https://orcid.org/0000-0002-1825-0097', '',
  'Education', 'PhD, Education, Big Tech University, 2010 - 2015', 'B.A., Sociology, Small College, 2006 - 2010', '',
  'Employment', 'Professor, State University, 2018 - Present', 'Postdoc, Lab X, 2015 - 2018', '',
  'Publications', '1. Doe, J. (2022). Digital divides in rural schooling. Journal of Education Policy.', '',
  'Awards', 'Early Career Award, 2023'
].join('\n');
var cvRes = Parsers.parseCvText(cv);
check('cv: name detected', /Jane/.test(cvRes.name));
check('cv: email detected', cvRes.email === 'jane.doe@state.edu');
check('cv: orcid detected', cvRes.orcid === '0000-0002-1825-0097');
check('cv: education entries', cvRes.education.length === 2);
check('cv: appointments entries', cvRes.appointments.length === 2);
check('cv: publications entries', cvRes.publications.length === 1 && cvRes.publications[0].year === '2022');
check('cv: awards entries', cvRes.awards.length === 1);

/* -------------------- 6. ORCID mapping (pure, recorded fixture) -------------------- */

var profile = Profile.emptyProfile();
var fakeOrcid = {
  person: { name: { 'given-names': { value: 'Josiah' }, 'family-name': { value: 'Carberry' } } },
  'activities-summary': {
    employments: { 'affiliation-group': [{ summaries: [{ 'employment-summary': { 'role-title': 'Professor', 'department-name': 'Psychoceramics', organization: { name: 'Wesleyan University', address: { city: 'Middletown', country: 'US' } }, 'start-date': { year: { value: '1930' } }, 'end-date': null } }] }] },
    educations: { 'affiliation-group': [] },
    works: { group: [{ 'work-summary': [{ title: { title: { value: 'A Methodology for the Emulation of Architecture' } }, type: 'journal-article', 'publication-date': { year: { value: '2012' } }, 'external-ids': { 'external-id': [{ 'external-id-type': 'doi', 'external-id-value': '10.0000/test' }] } }] }] }
  }
};
var res = Profile.applyOrcidRecord(profile, '0000-0002-1825-0097', fakeOrcid);
check('orcid map: name', profile.basics.fullName === 'Josiah Carberry');
check('orcid map: basics title/institution from current appointment', profile.basics.title === 'Professor' && profile.basics.institution === 'Wesleyan University');
check('orcid map: work imported with doi + year', profile.publications.length === 1 && profile.publications[0].doi === '10.0000/test' && profile.publications[0].year === '2012');
check('orcid map: result counts', res.publications === 1 && res.appointments === 1);
check('orcid id cleaner', Profile.cleanOrcidId('https://orcid.org/0000-0002-1825-0097') === '0000-0002-1825-0097' && Profile.cleanOrcidId('junk') === null);

/* -------------------- 7. OpenAlex mapping (pure) -------------------- */

var oa = Profile.mapOpenAlexAuthor({ display_name: 'Jane Doe', cited_by_count: 123, works_count: 20, summary_stats: { h_index: 7, i10_index: 4 }, id: 'https://openalex.org/A1' });
check('openalex map: metrics', oa.metrics.citedBy === 123 && oa.metrics.hIndex === 7);
var w = Profile.mapOpenAlexWork({ display_name: 'Paper', publication_year: 2021, doi: 'https://doi.org/10.1/x', cited_by_count: 9, primary_location: { source: { display_name: 'JEP' } }, authorships: [{ author: { display_name: 'Jane Doe' } }], type: 'article' });
check('openalex map: work', w.title === 'Paper' && w.doi === '10.1/x' && w.venue === 'JEP' && w.citations === 9);

/* -------------------- 8. generators (pure builders) -------------------- */

var p2 = Profile.emptyProfile();
p2.basics.fullName = 'Jane Doe';
p2.basics.givenName = 'Jane';
p2.basics.title = 'Associate Professor';
p2.basics.institution = 'State University';
p2.basics.email = 'jane@state.edu';
p2.bioNotes = 'Studies education inequality with field experiments.';
p2.publications = [
  { title: 'Paper A', authors: ['Doe, J.'], venue: 'JEP', year: '2023', doi: '10.1/a', url: '', type: '', citations: 5 },
  { title: 'Paper B', authors: ['Doe, J.', 'Roe, K.'], venue: 'AER', year: '2021', doi: '', url: '', type: '', citations: 12 }
];
p2.education = [{ degree: 'PhD', institution: 'Big Tech University', field: 'Education', location: '', startYear: '2010', endYear: '2015' }];
p2.appointments = [{ title: 'Associate Professor', institution: 'State University', department: 'Education', location: '', startYear: '2018', endYear: '', current: true }];
p2.projects = [{ title: 'Reading RCT', funder: 'Spencer Foundation', grantNumber: 'G-2023-01', role: 'PI', status: 'current', amount: '$50,000', startYear: '2023', endYear: '2025', personMonths: '2', summary: 'RCT of reading interventions.' }];
var project = { title: 'Scaling tutoring', abstract: 'We will scale a proven tutoring model across 40 schools and measure effects on attainment gaps.', budget: '$250,000', duration: '3 years', collaborators: 'Dr. K (MIT)' };

var bio50 = Gen.buildBio(p2, project, 50, 'grant');
var bio200 = Gen.buildBio(p2, project, 200, 'journal');
check('bio: 50-word cap respected', Gen.countWords(bio50) <= 50);
check('bio: names the researcher', bio50.indexOf('Jane Doe') !== -1);
check('bio: 200-word variant longer and within cap', Gen.countWords(bio200) > Gen.countWords(bio50) && Gen.countWords(bio200) <= 200);

var nsfData = Gen.buildNsfBiosketchData(p2);
check('nsf biosketch: sections populated', nsfData.professionalPreparation.length === 1 && nsfData.appointments.length === 1 && nsfData.productsRelated.length === 2);
check('nsf biosketch: sciencv disclaimer present', /SciENcv/.test(nsfData.disclaimer));

var nihData = Gen.buildNihBiosketchData(p2, project);
check('nih biosketch: personal statement mentions project', nihData.personalStatement.indexOf('Scaling tutoring') !== -1);
check('nih biosketch: contributions <= 5, citations <= 4', nihData.contributions.length <= 5 && nihData.contributions.every(function (c) { return c.citations.length <= 4; }));

var rows = Gen.buildSupportRows(p2.projects, 'Scaling tutoring');
check('support table: row built', rows.length === 1 && rows[0].source === 'Spencer Foundation' && rows[0].personMonths === '2');

var loi = Gen.buildLetterOfIntent(p2, project, GRANTS.find(function (g) { return g.id === 'sloan'; }));
check('loi: funder + project + sender', /Sloan/.test(loi) && /Scaling tutoring/.test(loi) && /Jane Doe/.test(loi));
var aims = Gen.buildNihAimsSkeleton(p2, project);
check('aims skeleton: has aims + 1-page note', /Aim 1/.test(aims) && /1 page/.test(aims));
var nsfSum = Gen.buildNsfSummarySkeleton(p2, project);
check('nsf summary skeleton: 3 labeled sections', /^Overview$/m.test(nsfSum) && /^Intellectual Merit$/m.test(nsfSum) && /^Broader Impacts$/m.test(nsfSum));

/* -------------------- 9. live ORCID fetch -------------------- */

Profile.fetchOrcid('0000-0002-1825-0097').then(function (record) {
  var mapped = Profile.mapOrcidRecord(record);
  check('live ORCID: name is Josiah Carberry', mapped.basics.fullName === 'Josiah Carberry');
  check('live ORCID: works imported', mapped.publications.length >= 5);
  check('live ORCID: appointments imported', mapped.appointments.length >= 1);
  check('live ORCID: work has year', !!mapped.publications[0].year);

  // live OpenAlex by ORCID (Carberry's ORCID resolves to a real author)
  return fetch(Profile.openAlexAuthorUrlByOrcid('0000-0002-1825-0097')).then(function (r) {
    check('live OpenAlex: HTTP 200', r.ok);
    return r.json();
  }).then(function (author) {
    var m = Profile.mapOpenAlexAuthor(author);
    check('live OpenAlex: metrics mapped', m && m.metrics && m.metrics.citedBy != null && m.metrics.hIndex != null);
    finish();
  });
}).catch(function (err) {
  check('live ORCID fetch (network may be unavailable): ' + err.message, false);
  finish();
});

function finish() {
  console.log(failures ? '\n' + failures + ' FAILURE(S)' : '\nALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
}
