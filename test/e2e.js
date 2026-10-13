/* GrantPilot — end-to-end browser test (Playwright + Chromium).
 * Requires the app served on http://localhost:8138 (e.g.:
 *   python3 -m http.server 8138  from the repo root)
 * Fails on any console error. Exercises: live ORCID import, BibTeX paste
 * import, starting an NSF application, checklist/countdown, drafting the NIH
 * biosketch, and downloading a .docx.
 */
'use strict';

const { chromium } = require('playwright');

(async () => {
  const errors = [];
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') { errors.push(msg.text()); } });
  page.on('pageerror', (err) => { errors.push('pageerror: ' + err.message); });

  await page.goto('http://localhost:8138/index.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('#orcid-input', { timeout: 10000 });
  console.log('PASS  page loads, profile tab active');

  // 1. live ORCID import
  await page.fill('#orcid-input', '0000-0002-1825-0097');
  await page.click('#orcid-fetch');
  await page.waitForFunction(() => /Imported/.test(document.getElementById('orcid-status').textContent), { timeout: 30000 });
  const pubCount = await page.locator('#pub-count').innerText();
  if (!/\([1-9]/.test(pubCount)) { throw new Error('expected publications imported, pub-count=' + pubCount); }
  console.log('PASS  ORCID import (Josiah Carberry): publications ' + pubCount.trim());

  // basics pre-filled
  const nameVal = await page.inputValue('#basic-fullName');
  if (!/Carberry/.test(nameVal)) { throw new Error('full name not imported: ' + nameVal); }
  console.log('PASS  profile basics pre-filled:', nameVal);

  // 2. BibTeX paste import
  await page.fill('#bibtex-input', '@article{doe2024grantpilot, title={Cockpits for Grants}, author={Doe, Jane}, journal={Test Journal}, year={2024}}');
  await page.click('#bibtex-import');
  await page.waitForFunction(() => /1 new publication/.test(document.getElementById('bibtex-status').textContent), { timeout: 5000 });
  console.log('PASS  BibTeX paste import adds publication');

  // 3. start NSF application from grants tab
  await page.click('#tab-grants');
  const nsfCard = page.locator('.card', { hasText: 'NSF Standard Research Proposal' }).first();
  await nsfCard.locator('button.btn.primary', { hasText: 'Start application' }).click();
  await page.waitForSelector('#app-workspace:not(.hidden)', { timeout: 5000 });
  const docRows = await page.locator('#app-doc-list .app-doc').count();
  if (docRows < 10) { throw new Error('expected >=10 NSF checklist docs, got ' + docRows); }
  console.log('PASS  NSF application started with ' + docRows + ' checklist documents');

  // 4. project details + deadline + countdown
  await page.fill('#proj-title', 'E2E Test Project');
  await page.fill('#proj-abstract', 'Testing the full GrantPilot flow end to end with an abstract of sufficient length.');
  await page.fill('#app-deadline', '2027-02-05');
  await page.waitForFunction(() => / left /.test(document.getElementById('app-countdown').textContent), { timeout: 5000 });
  console.log('PASS  deadline countdown shows days left');

  // 5. mark a document drafted → progress updates
  await page.locator('#app-doc-list .app-doc select').first().selectOption('drafted');
  await page.waitForFunction(() => /\/ 11 done|\/ 1[01] done/.test(document.getElementById('doc-progress-label').textContent), { timeout: 5000 });
  const label = await page.locator('#doc-progress-label').innerText();
  console.log('PASS  checklist progress label:', label.trim());

  // 6. tick a step
  await page.locator('#app-step-list .check-item input').first().check();
  console.log('PASS  step guide checkable');

  // 7. documents tab: NIH biosketch draft + docx download
  await page.click('#tab-docs');
  await page.locator('#docgen-nav .docgen-nav-btn', { hasText: 'NIH biographical sketch' }).click();
  await page.waitForFunction(() => /PERSONAL STATEMENT/.test(document.getElementById('docgen-editor').value), { timeout: 5000 });
  const editorText = await page.inputValue('#docgen-editor');
  if (!/Carberry/.test(editorText)) { throw new Error('NIH biosketch not pre-filled with ORCID name'); }
  console.log('PASS  NIH biosketch pre-filled from imported profile');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('#docgen-docx')
  ]);
  const path = await download.path();
  const fs = require('fs');
  const size = fs.statSync(path).size;
  if (size < 2000) { throw new Error('downloaded docx too small: ' + size); }
  console.log('PASS  biosketch .docx downloaded (' + size + ' bytes)');

  // 8. support table generator renders rows from profile projects
  await page.locator('#docgen-nav .docgen-nav-btn', { hasText: 'Current & pending' }).click();
  await page.waitForFunction(() => document.getElementById('docgen-editor').value.length > 0, { timeout: 5000 });
  console.log('PASS  current & pending support generator renders');

  // 9. persistence across reload
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#orcid-input', { state: 'attached', timeout: 10000 }); // may be on hidden tab via #docs hash
  const nameAfter = await page.inputValue('#basic-fullName');
  if (!/Carberry/.test(nameAfter)) { throw new Error('profile not persisted after reload'); }
  console.log('PASS  profile persists across reload (localStorage)');

  await browser.close();
  if (errors.length) {
    console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('E2E PASSED — zero console errors');
})().catch((err) => { console.error('FAIL  ' + err.message); process.exit(1); });
