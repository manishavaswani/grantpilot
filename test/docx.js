/* GrantPilot — docx generation test (run manually):
 *   cd /tmp && mkdir -p gp-docx-test && cd gp-docx-test && npm init -y && npm i docx@9.8.1
 *   NODE_PATH=/tmp/gp-docx-test/node_modules node test/docx.js
 * Builds every .docx the app can produce (with the same docx.js version the
 * CDN pins) and writes them to /tmp/grantpilot-docx/ for OOXML validation.
 */
'use strict';

require('../js/profile.js');
require('../js/generators.js');

var Profile = globalThis.GrantPilotProfile;
var Gen = globalThis.GrantPilotGenerators;

var docx;
try { docx = require('docx'); } catch (e) {
  console.error('FAIL  docx package not found. Install it first: npm i docx@9.8.1 (see header).');
  process.exit(1);
}
globalThis.docx = docx;

var fs = require('fs');
var path = require('path');
var outDir = '/tmp/grantpilot-docx';
fs.mkdirSync(outDir, { recursive: true });

var p = Profile.emptyProfile();
p.basics.fullName = 'Jane Doe';
p.basics.givenName = 'Jane';
p.basics.title = 'Associate Professor';
p.basics.institution = 'State University';
p.basics.department = 'School of Education';
p.basics.city = 'Springfield';
p.basics.country = 'US';
p.basics.orcid = '0000-0002-1825-0097';
p.basics.email = 'jane@state.edu';
p.bioNotes = 'Studies education inequality with field experiments.';
p.education = [{ degree: 'PhD', institution: 'Big Tech University', field: 'Education', location: 'Cambridge, US', startYear: '2010', endYear: '2015' }];
p.appointments = [
  { title: 'Associate Professor', institution: 'State University', department: 'Education', location: 'Springfield, US', startYear: '2018', endYear: '', current: true },
  { title: 'Postdoctoral Fellow', institution: 'Lab X', department: '', location: '', startYear: '2015', endYear: '2018', current: false }
];
p.publications = [
  { title: 'Paper A', authors: ['Doe, J.'], venue: 'JEP', year: '2023', doi: '10.1/a', url: '', type: '', citations: 5 },
  { title: 'Paper B', authors: ['Doe, J.', 'Roe, K.'], venue: 'AER', year: '2021', doi: '', url: '', type: '', citations: 12 }
];
p.projects = [{ title: 'Reading RCT', funder: 'Spencer Foundation', grantNumber: 'G-2023-01', role: 'PI', status: 'current', amount: '$50,000', startYear: '2023', endYear: '2025', personMonths: '2', summary: 'RCT of reading interventions.' }];
var project = { title: 'Scaling tutoring', abstract: 'Scale a proven tutoring model across 40 schools.', budget: '$250,000', duration: '3 years', collaborators: 'Dr. K (MIT)' };

var docs = [
  ['nsf-biosketch.docx', Gen.buildNsfBiosketchDocx(Gen.buildNsfBiosketchData(p))],
  ['nih-biosketch.docx', Gen.buildNihBiosketchDocx(Gen.buildNihBiosketchData(p, project))],
  ['support-table.docx', (function () { var rows = Gen.buildSupportRows(p.projects, project.title); return Gen.buildSupportDocx('Jane Doe', rows); })()],
  ['bio.docx', Gen.buildTextDocx('Bio — Jane Doe', Gen.buildBio(p, project, 100, 'grant'))],
  ['loi.docx', Gen.buildTextDocx('Letter of Intent', Gen.buildLetterOfIntent(p, project, null))],
  ['cover-letter.docx', Gen.buildTextDocx('Cover Letter', Gen.buildCoverLetter(p, project, null))],
  ['collab-letter.docx', Gen.buildTextDocx('Collaboration Letter', Gen.buildCollaborationLetter(p, project))],
  ['support-letter.docx', Gen.buildTextDocx('Support Letter Template', Gen.buildSupportLetterTemplate(p, project, null))],
  ['nsf-summary.docx', Gen.buildTextDocx('NSF Project Summary', Gen.buildNsfSummarySkeleton(p, project))],
  ['nih-aims.docx', Gen.buildTextDocx('NIH Specific Aims', Gen.buildNihAimsSkeleton(p, project))],
  ['erc-synopsis.docx', Gen.buildTextDocx('ERC Extended Synopsis', Gen.buildErcSynopsisSkeleton(p, project))]
];

var failures = 0;
Promise.all(docs.map(function (pair) {
  return docx.Packer.toBuffer(pair[1]).then(function (buf) {
    var file = path.join(outDir, pair[0]);
    fs.writeFileSync(file, buf);
    var zipMagic = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b; // PK zip
    console.log((zipMagic ? 'PASS' : 'FAIL') + '  ' + pair[0] + ' written (' + buf.length + ' bytes, zip magic: ' + zipMagic + ')');
    if (!zipMagic) { failures++; }
  });
})).then(function () {
  console.log(failures ? failures + ' FAILURE(S)' : 'ALL DOCX WRITTEN — validate OOXML with test/validate-docx.py');
  process.exit(failures ? 1 : 0);
}).catch(function (err) {
  console.error('FAIL  ' + err.message);
  process.exit(1);
});
