/* GrantPilot — app.js
 * UI wiring: tabs, profile builder + imports, grant source browser, custom
 * grant builder, application workspace (checklist/steps/countdown), document
 * generators (preview/docx/clipboard/AI assist), persistence.
 * Depends on: js/data/grants.js, js/parsers.js, js/profile.js,
 * js/generators.js, js/ai.js
 */
(function () {
  'use strict';

  var GRANTS = window.GRANTPILOT_GRANTS;
  var Parsers = window.GrantPilotParsers;
  var Profile = window.GrantPilotProfile;
  var Gen = window.GrantPilotGenerators;
  var AI = window.GrantPilotAI;

  var LS_KEY = 'grantpilot.state.v1';

  /* --------------------------- tiny DOM helpers --------------------------- */

  function $(id) { return document.getElementById(id); }
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function downloadBlob(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadText(filename, text) {
    downloadBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' }));
  }

  function slug(s) {
    return String(s || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function setStatus(id, msg, isError) {
    var s = $(id);
    if (!s) { return; }
    s.textContent = msg;
    s.classList.toggle('error', !!isError);
    s.classList.toggle('ok', !isError && !!msg);
  }

  /* -------------------------------- state -------------------------------- */

  function newState() {
    return {
      version: 1,
      profile: Profile.emptyProfile(),
      applications: [],
      customGrants: [],
      activeAppId: null
    };
  }

  var state = newState();

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) { return; }
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') { return; }
      state = newState();
      state.profile = Profile.normalize(s.profile);
      state.applications = Array.isArray(s.applications) ? s.applications : [];
      state.customGrants = Array.isArray(s.customGrants) ? s.customGrants : [];
      state.activeAppId = s.activeAppId || null;
    } catch (e) { /* corrupted state — start fresh */ }
  }

  var saveState = debounce(function () {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }, 250);

  function allGrants() { return GRANTS.concat(state.customGrants); }

  function findGrant(id) {
    return allGrants().find(function (g) { return g.id === id; }) || null;
  }

  function activeApp() {
    return state.applications.find(function (a) { return a.id === state.activeAppId; }) || null;
  }

  function appGrant(app) {
    if (!app) { return null; }
    if (app.customGrant) { return app.customGrant; }
    return findGrant(app.grantId);
  }

  function currentProject(app) {
    if (app) { return app.project; }
    return { title: '', abstract: '', budget: '', duration: '', collaborators: '' };
  }

  /* --------------------------------- tabs --------------------------------- */

  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      var on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'panel-' + name);
    });
    if (history.replaceState) { history.replaceState(null, '', '#' + name); }
  }

  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchTab(b.dataset.tab); });
  });

  /* ============================ PROFILE TAB ============================ */

  var BASIC_FIELDS = [
    ['fullName', 'Full name'], ['title', 'Position title'], ['institution', 'Institution'],
    ['department', 'Department'], ['email', 'Email'], ['orcid', 'ORCID iD'],
    ['website', 'Website'], ['city', 'City'], ['country', 'Country']
  ];

  function renderBasics() {
    var grid = $('basics-grid');
    grid.innerHTML = '';
    BASIC_FIELDS.forEach(function (pair) {
      var wrap = el('div');
      var lab = el('label', 'field-label', pair[1]);
      lab.setAttribute('for', 'basic-' + pair[0]);
      var inp = el('input');
      inp.type = 'text';
      inp.id = 'basic-' + pair[0];
      inp.value = state.profile.basics[pair[0]] || '';
      inp.autocomplete = 'off';
      inp.addEventListener('input', function () {
        state.profile.basics[pair[0]] = inp.value;
        if (pair[0] === 'orcid') { $('orcid-input').value = inp.value; }
        saveState();
      });
      wrap.appendChild(lab);
      wrap.appendChild(inp);
      grid.appendChild(wrap);
    });
  }

  /* Editable repeating lists. spec: {key, fields:[[prop,label,width?]...], titleFn} */
  function renderList(containerId, items, fields, titleFn, metaFn, onChange) {
    var box = $(containerId);
    box.innerHTML = '';
    if (!items.length) {
      box.appendChild(el('p', 'hint', 'None yet.'));
      return;
    }
    items.forEach(function (item, idx) {
      var card = el('div', 'repeat-item');
      var head = el('div', 'repeat-head');
      var titleSpan = el('span', 'repeat-title', titleFn(item) || '(untitled)');
      head.appendChild(titleSpan);
      var meta = metaFn && metaFn(item);
      if (meta) { head.appendChild(el('span', 'repeat-meta', meta)); }
      var rm = el('button', 'link-remove', 'remove');
      rm.type = 'button';
      rm.addEventListener('click', function () {
        items.splice(idx, 1);
        onChange();
      });
      head.appendChild(rm);
      card.appendChild(head);
      var grid = el('div', 'field-grid');
      fields.forEach(function (f) {
        var w = el('div');
        var lab = el('label', 'field-label', f[1]);
        lab.style.fontSize = '0.78rem';
        lab.style.fontWeight = '400';
        lab.style.color = 'var(--ink-soft)';
        var inp = el('input');
        inp.type = 'text';
        inp.value = item[f[0]] != null ? item[f[0]] : '';
        if (f[0] !== 'authorsText') {
          inp.addEventListener('input', function () { item[f[0]] = inp.value; titleSpan.textContent = titleFn(item) || '(untitled)'; onChange(); });
        }
        w.appendChild(lab);
        w.appendChild(inp);
        grid.appendChild(w);
      });
      card.appendChild(grid);
      box.appendChild(card);
    });
  }

  function renderProfileLists() {
    renderList('education-list', state.profile.education,
      [['degree', 'Degree'], ['institution', 'Institution'], ['field', 'Field'], ['location', 'Location'], ['startYear', 'Start year'], ['endYear', 'End year']],
      function (e) { return [e.degree, e.institution].filter(Boolean).join(' — '); },
      function (e) { return [e.startYear, e.endYear].filter(Boolean).join('–'); },
      renderAfterProfileChange);

    renderList('appointments-list', state.profile.appointments,
      [['title', 'Title'], ['institution', 'Institution'], ['department', 'Department'], ['location', 'Location'], ['startYear', 'Start year'], ['endYear', 'End year (blank = current)']],
      function (a) { return [a.title, a.institution].filter(Boolean).join(' — '); },
      function (a) { return [a.startYear, a.endYear || 'present'].filter(Boolean).join('–'); },
      renderAfterProfileChange);

    renderList('publications-list', state.profile.publications,
      [['title', 'Title'], ['venue', 'Venue'], ['year', 'Year'], ['doi', 'DOI'], ['authorsText', 'Authors (comma-separated)']],
      function (p) { return p.title; },
      function (p) { return [p.year, p.venue].filter(Boolean).join(' · '); },
      renderAfterProfileChange);
    // map authors array <-> text on render
    var pubInputs = $('publications-list').querySelectorAll('.repeat-item');
    state.profile.publications.forEach(function (p, i) {
      var inp = pubInputs[i].querySelectorAll('input')[4];
      inp.value = (p.authors || []).join(', ');
      inp.addEventListener('input', function () {
        p.authors = inp.value.split(',').map(function (a) { return a.trim(); }).filter(Boolean);
      });
    });
    $('pub-count').textContent = '(' + state.profile.publications.length + ')';

    renderList('awards-list', state.profile.awards,
      [['name', 'Award / honor'], ['year', 'Year'], ['org', 'Granting body']],
      function (a) { return a.name; },
      function (a) { return a.year; },
      renderAfterProfileChange);

    renderList('projects-list', state.profile.projects,
      [['title', 'Project title'], ['funder', 'Funder / source'], ['grantNumber', 'Award #'], ['role', 'Your role'], ['status', 'Status (current/pending)'], ['amount', 'Total amount'], ['startYear', 'Start'], ['endYear', 'End'], ['personMonths', 'Person-months/yr'], ['summary', 'Short description / overlap note']],
      function (p) { return [p.title, p.funder].filter(Boolean).join(' — '); },
      function (p) { return [p.status, [p.startYear, p.endYear].filter(Boolean).join('–')].filter(Boolean).join(' · '); },
      renderAfterProfileChange);
  }

  var renderAfterProfileChange = debounce(function () {
    saveState();
    renderProfileLists();
    renderImportLog();
  }, 300);

  function renderProfileAll() {
    renderBasics();
    renderProfileLists();
    $('bio-notes').value = state.profile.bioNotes || '';
    $('keywords-input').value = (state.profile.keywords || []).join(', ');
    $('orcid-input').value = state.profile.basics.orcid || '';
    renderImportLog();
  }

  $('bio-notes').addEventListener('input', function () { state.profile.bioNotes = $('bio-notes').value; saveState(); });
  $('keywords-input').addEventListener('input', function () {
    state.profile.keywords = $('keywords-input').value.split(',').map(function (k) { return k.trim(); }).filter(Boolean);
    saveState();
  });

  $('add-education').addEventListener('click', function () {
    state.profile.education.push({ degree: '', institution: '', field: '', location: '', startYear: '', endYear: '' });
    renderAfterProfileChange();
  });
  $('add-appointment').addEventListener('click', function () {
    state.profile.appointments.push({ title: '', department: '', institution: '', location: '', startYear: '', endYear: '', current: true });
    renderAfterProfileChange();
  });
  $('add-publication').addEventListener('click', function () {
    state.profile.publications.push({ title: '', authors: [], venue: '', year: '', doi: '', url: '', type: '', citations: null, source: 'manual' });
    renderAfterProfileChange();
  });
  $('add-award').addEventListener('click', function () {
    state.profile.awards.push({ name: '', year: '', org: '' });
    renderAfterProfileChange();
  });
  $('add-project').addEventListener('click', function () {
    state.profile.projects.push({ title: '', funder: '', grantNumber: '', role: '', status: 'current', amount: '', startYear: '', endYear: '', personMonths: '', summary: '' });
    renderAfterProfileChange();
  });

  $('profile-save').addEventListener('click', function () {
    saveState();
    setStatus('profile-save-status', 'Profile saved to this browser.');
    setTimeout(function () { setStatus('profile-save-status', ''); }, 2500);
  });

  /* ------------------------- profile imports ------------------------- */

  $('orcid-fetch').addEventListener('click', function () {
    var orcid = Profile.cleanOrcidId($('orcid-input').value);
    if (!orcid) { setStatus('orcid-status', 'Enter a valid 16-digit ORCID iD (e.g. 0000-0002-1825-0097).', true); return; }
    setStatus('orcid-status', 'Fetching public ORCID record…');
    $('orcid-fetch').disabled = true;
    Profile.fetchOrcid(orcid).then(function (record) {
      var res = Profile.applyOrcidRecord(state.profile, orcid, record);
      saveState();
      renderProfileAll();
      setStatus('orcid-status', 'Imported' + (res.name ? ' for ' + res.name : '') + ': ' +
        res.publications + ' works, ' + res.appointments + ' appointments, ' + res.education + ' education entries. Review the fields below.');
    }).catch(function (err) {
      setStatus('orcid-status', err.message, true);
    }).finally(function () { $('orcid-fetch').disabled = false; });
  });

  $('openalex-enrich').addEventListener('click', function () {
    var orcid = Profile.cleanOrcidId(state.profile.basics.orcid || $('orcid-input').value);
    var name = state.profile.basics.fullName;
    if (!orcid && !name) { setStatus('orcid-status', 'Set an ORCID iD or a full name first.', true); return; }
    setStatus('orcid-status', 'Querying OpenAlex…');
    $('openalex-enrich').disabled = true;
    var authorPromise = orcid
      ? fetch(Profile.openAlexAuthorUrlByOrcid(orcid)).then(function (r) {
          if (r.status === 404) { return name ? searchOpenAlex(name) : Promise.reject(new Error('ORCID iD not indexed in OpenAlex.')); }
          if (!r.ok) { throw new Error('OpenAlex error (HTTP ' + r.status + ').'); }
          return r.json();
        })
      : searchOpenAlex(name);

    function searchOpenAlex(n) {
      return fetch(Profile.openAlexSearchUrl(n)).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.results || !j.results.length) { throw new Error('No OpenAlex author found for “' + n + '”.'); }
        return j.results[0];
      });
    }

    authorPromise.then(function (author) {
      var worksPromise = author && author.id
        ? fetch(Profile.openAlexTopWorksUrl(author.id)).then(function (r) { return r.json(); }).then(function (j) { return j.results || []; })
        : Promise.resolve([]);
      return worksPromise.then(function (works) {
        var res = Profile.applyOpenAlex(state.profile, author, works);
        if (!res) { throw new Error('OpenAlex returned no author data.'); }
        saveState();
        renderProfileAll();
        setStatus('orcid-status', 'OpenAlex enrichment applied' + (res.name ? ' (' + res.name + ')' : '') + ': ' +
          (res.metrics.citedBy != null ? res.metrics.citedBy + ' citations, h-index ' + res.metrics.hIndex + ', ' : '') +
          res.publications + ' new works.');
      });
    }).catch(function (err) {
      setStatus('orcid-status', err.message, true);
    }).finally(function () { $('openalex-enrich').disabled = false; });
  });

  /* ---- CV upload with confirmation ---- */

  var pendingCv = null;

  $('cv-input').addEventListener('change', function () {
    var file = $('cv-input').files && $('cv-input').files[0];
    if (!file) { return; }
    setStatus('cv-status', 'Extracting text from ' + file.name + '…');
    var reader = new FileReader();
    reader.onload = function () {
      var buf = reader.result;
      var isPdf = /\.pdf$/i.test(file.name);
      var extract = isPdf ? Profile.extractPdfText(buf) : Profile.extractDocxText(buf);
      extract.then(function (text) {
        if (!text || text.trim().length < 40) { throw new Error('Could not extract readable text from this file.'); }
        pendingCv = Parsers.parseCvText(text);
        renderCvConfirm(pendingCv);
        setStatus('cv-status', 'Parsed ' + file.name + ' — review the detected entries below and confirm.');
      }).catch(function (err) {
        setStatus('cv-status', err.message, true);
      });
    };
    reader.onerror = function () { setStatus('cv-status', 'Could not read the file.', true); };
    reader.readAsArrayBuffer(file);
    $('cv-input').value = '';
  });

  function renderCvConfirm(parsed) {
    var body = $('cv-confirm-body');
    body.innerHTML = '';
    var groups = [
      ['Basics', parsed.name || parsed.email || parsed.orcid || parsed.website
        ? [['name', parsed.name], ['email', parsed.email], ['orcid', parsed.orcid], ['website', parsed.website]].filter(function (p) { return p[1]; }).map(function (p) { return p[0] + ': ' + p[1]; })
        : []],
      ['Education', parsed.education.map(function (e) { return [e.degree, e.institution, [e.startYear, e.endYear].filter(Boolean).join('–')].filter(Boolean).join(', '); })],
      ['Appointments', parsed.appointments.map(function (a) { return [a.title, a.institution, [a.startYear, a.endYear].filter(Boolean).join('–')].filter(Boolean).join(', '); })],
      ['Publications (first 20 shown)', parsed.publications.slice(0, 20).map(function (p) { return p.title + (p.year ? ' (' + p.year + ')' : ''); })],
      ['Awards', parsed.awards.map(function (a) { return a.name; })],
      ['Grants / projects', parsed.projects.map(function (p) { return p.title; })]
    ];
    var any = false;
    groups.forEach(function (g) {
      if (!g[1].length) { return; }
      any = true;
      var h = el('h4', 'prompt-heading', g[0]);
      body.appendChild(h);
      g[1].forEach(function (labelText, i) {
        var lab = el('label', 'check-item');
        var cb = el('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.dataset.group = g[0];
        cb.dataset.index = i;
        var span = el('span', null, labelText);
        lab.appendChild(cb);
        lab.appendChild(span);
        body.appendChild(lab);
      });
    });
    if (!any) {
      body.appendChild(el('p', 'hint', 'No recognizable sections were detected. You can still fill the profile manually.'));
    }
    show($('cv-confirm'));
    $('cv-confirm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('cv-apply').addEventListener('click', function () {
    if (!pendingCv) { return; }
    var p = state.profile;
    var picked = { Basics: [], Education: [], Appointments: [], Publications: [], Awards: [], 'Grants / projects': [] };
    $('cv-confirm-body').querySelectorAll('input[type=checkbox]:checked').forEach(function (cb) {
      picked[cb.dataset.group].push(parseInt(cb.dataset.index, 10));
    });
    if (picked.Basics.length) {
      if (pendingCv.name && !p.basics.fullName) { p.basics.fullName = pendingCv.name; }
      if (pendingCv.email && !p.basics.email) { p.basics.email = pendingCv.email; }
      if (pendingCv.orcid && !p.basics.orcid) { p.basics.orcid = pendingCv.orcid; }
      if (pendingCv.website && !p.basics.website) { p.basics.website = pendingCv.website; }
    }
    var nEdu = 0, nApp = 0;
    picked.Education.forEach(function (i) {
      nEdu += Profile.mergeList(p, 'education', [pendingCv.education[i]], function (a, b) { return a.institution === b.institution && a.startYear === b.startYear; });
    });
    picked.Appointments.forEach(function (i) {
      nApp += Profile.mergeList(p, 'appointments', [pendingCv.appointments[i]], function (a, b) { return a.institution === b.institution && a.title === b.title && a.startYear === b.startYear; });
    });
    var nPub = Profile.mergePublications(p, picked.Publications.map(function (i) { return pendingCv.publications[i]; }));
    var nAwd = 0;
    picked.Awards.forEach(function (i) {
      nAwd += Profile.mergeList(p, 'awards', [pendingCv.awards[i]], function (a, b) { return a.name === b.name; });
    });
    var nPrj = 0;
    picked['Grants / projects'].forEach(function (i) {
      nPrj += Profile.mergeList(p, 'projects', [pendingCv.projects[i]], function (a, b) { return a.title === b.title; });
    });
    Profile.logImport(p, 'CV upload', nEdu + ' education, ' + nApp + ' appointments, ' + nPub + ' publications, ' + nAwd + ' awards, ' + nPrj + ' projects');
    pendingCv = null;
    hide($('cv-confirm'));
    saveState();
    renderProfileAll();
    setStatus('cv-status', 'Merged: ' + nEdu + ' education, ' + nApp + ' appointments, ' + nPub + ' publications, ' + nAwd + ' awards, ' + nPrj + ' projects.');
  });

  $('cv-discard').addEventListener('click', function () {
    pendingCv = null;
    hide($('cv-confirm'));
    setStatus('cv-status', 'CV import discarded.');
  });

  /* ---- paste imports ---- */

  $('bibtex-import').addEventListener('click', function () {
    var pubs = Parsers.bibToPublications($('bibtex-input').value);
    if (!pubs.length) { setStatus('bibtex-status', 'No BibTeX entries found — paste @article{…} / @inproceedings{…} blocks.', true); return; }
    var n = Profile.mergePublications(state.profile, pubs);
    Profile.logImport(state.profile, 'BibTeX paste', n + ' publications');
    saveState();
    renderProfileAll();
    setStatus('bibtex-status', 'Parsed ' + pubs.length + ' entries; ' + n + ' new publications added (' + (pubs.length - n) + ' duplicates skipped).');
  });

  $('linkedin-import').addEventListener('click', function () {
    var r = Parsers.parseLinkedInText($('linkedin-input').value);
    var found = r.appointments.length + r.education.length + r.awards.length + r.publications.length;
    if (!found && !r.summary) { setStatus('linkedin-status', 'No Experience/Education sections detected. Paste the full text of the LinkedIn “Save to PDF” output.', true); return; }
    var nApp = Profile.mergeList(state.profile, 'appointments', r.appointments, function (a, b) { return a.institution === b.institution && a.title === b.title; });
    var nEdu = Profile.mergeList(state.profile, 'education', r.education, function (a, b) { return a.institution === b.institution; });
    var nAwd = Profile.mergeList(state.profile, 'awards', r.awards, function (a, b) { return a.name === b.name; });
    var nPub = Profile.mergePublications(state.profile, r.publications);
    if (r.summary && !state.profile.bioNotes) { state.profile.bioNotes = r.summary; }
    Profile.logImport(state.profile, 'LinkedIn paste', nApp + ' appointments, ' + nEdu + ' education, ' + nPub + ' publications');
    saveState();
    renderProfileAll();
    setStatus('linkedin-status', 'Merged ' + nApp + ' appointments, ' + nEdu + ' education entries, ' + nPub + ' publications' + (r.summary ? ', plus the summary into bio notes' : '') + '. Review for accuracy — LinkedIn parsing is heuristic.');
  });

  $('rg-import').addEventListener('click', function () {
    var r = Parsers.parseResearchGateText($('rg-input').value);
    var found = r.publications.length + r.education.length;
    if (!found) { setStatus('rg-status', 'No Publications/Education sections detected. Copy the relevant profile sections as text.', true); return; }
    var nPub = Profile.mergePublications(state.profile, r.publications);
    var nEdu = Profile.mergeList(state.profile, 'education', r.education, function (a, b) { return a.institution === b.institution; });
    Profile.logImport(state.profile, 'ResearchGate paste', nPub + ' publications, ' + nEdu + ' education');
    saveState();
    renderProfileAll();
    setStatus('rg-status', 'Merged ' + nPub + ' publications and ' + nEdu + ' education entries. Review for accuracy.');
  });

  function renderImportLog() {
    var box = $('import-log');
    if (!box) { return; }
    box.innerHTML = '';
    var log = state.profile.importLog || [];
    if (!log.length) { box.appendChild(el('p', 'hint', 'No imports yet.')); return; }
    var ul = el('ul');
    ul.style.margin = '0';
    ul.style.paddingLeft = '1.2rem';
    log.slice().reverse().forEach(function (entry) {
      var li = el('li', null, new Date(entry.at).toLocaleString() + ' — ' + entry.source + ': ' + entry.detail);
      li.style.fontSize = '0.88rem';
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /* =========================== GRANT SOURCES TAB =========================== */

  function renderGrants() {
    var box = $('grant-list');
    box.innerHTML = '';
    allGrants().forEach(function (g) {
      var card = el('div', 'card');
      var head = el('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '1rem';
      head.style.flexWrap = 'wrap';
      var h = el('h3', null, g.name);
      h.style.margin = '0';
      head.appendChild(h);
      var meta = el('div', 'grant-meta');
      meta.appendChild(el('span', 'badge accent', g.type === 'custom' ? 'custom' : g.type));
      meta.appendChild(el('span', 'badge neutral', g.funder));
      if (g.lastChecked) { meta.appendChild(el('span', 'badge neutral', 'checked ' + g.lastChecked)); }
      head.appendChild(meta);
      card.appendChild(head);

      card.appendChild(el('p', null, g.summary));
      var facts = [];
      if (g.eligibility) { facts.push('<strong>Eligibility:</strong> ' + escapeHtml(g.eligibility)); }
      if (g.amounts) { facts.push('<strong>Amounts:</strong> ' + escapeHtml(g.amounts)); }
      if (g.duration) { facts.push('<strong>Duration:</strong> ' + escapeHtml(g.duration)); }
      if (g.deadlinesInfo) { facts.push('<strong>Deadlines:</strong> ' + escapeHtml(g.deadlinesInfo)); }
      if (facts.length) {
        var fp = el('p', 'hint');
        fp.innerHTML = facts.join('<br>');
        card.appendChild(fp);
      }

      var hDocs = el('h4', 'prompt-heading', 'Required submission documents');
      card.appendChild(hDocs);
      var table = el('table', 'doc-table');
      var thead = el('thead');
      var trh = el('tr');
      ['Document', 'Limit', 'Required', 'Notes'].forEach(function (t) { trh.appendChild(el('th', null, t)); });
      thead.appendChild(trh);
      table.appendChild(thead);
      var tbody = el('tbody');
      g.documents.forEach(function (doc) {
        var tr = el('tr');
        tr.appendChild(el('td', null, doc.name));
        tr.appendChild(el('td', null, doc.limit || '—'));
        var reqTd = el('td');
        reqTd.appendChild(el('span', 'badge ' + (doc.required ? 'warn' : 'neutral'), doc.required ? 'required' : 'conditional'));
        tr.appendChild(reqTd);
        var notesTd = el('td');
        notesTd.style.fontSize = '0.82rem';
        notesTd.textContent = doc.notes || '—';
        tr.appendChild(notesTd);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      card.appendChild(table);

      var hSteps = el('h4', 'prompt-heading', 'How to apply — official steps');
      card.appendChild(hSteps);
      var ol = el('ol', 'step-list');
      g.steps.forEach(function (s) {
        var li = el('li');
        var span = el('span');
        span.appendChild(document.createTextNode(s.text + ' '));
        if (s.url) {
          var a = el('a', null, 'official link');
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener';
          span.appendChild(a);
        }
        li.appendChild(span);
        ol.appendChild(li);
      });
      card.appendChild(ol);

      var row = el('div', 'button-row');
      var startBtn = el('button', 'btn primary', 'Start application');
      startBtn.type = 'button';
      startBtn.addEventListener('click', function () { startApplication(g); });
      row.appendChild(startBtn);
      if (g.portalUrl) {
        var pa = el('a', 'btn', 'Portal: ' + (g.portalName || 'apply'));
        pa.href = g.portalUrl; pa.target = '_blank'; pa.rel = 'noopener';
        row.appendChild(pa);
      }
      if (g.guidelinesUrl) {
        var ga = el('a', 'btn ghost', 'Official guidelines');
        ga.href = g.guidelinesUrl; ga.target = '_blank'; ga.rel = 'noopener';
        row.appendChild(ga);
      }
      if (g.deadlinesUrl) {
        var da = el('a', 'btn ghost', 'Deadlines');
        da.href = g.deadlinesUrl; da.target = '_blank'; da.rel = 'noopener';
        row.appendChild(da);
      }
      if (g.type === 'custom') {
        var del = el('button', 'btn ghost danger', 'Delete custom grant');
        del.type = 'button';
        del.addEventListener('click', function () {
          if (!confirm('Delete custom grant “' + g.name + '”? Applications against it keep a copy of its requirements.')) { return; }
          state.customGrants = state.customGrants.filter(function (c) { return c.id !== g.id; });
          saveState();
          renderGrants();
        });
        row.appendChild(del);
      }
      card.appendChild(row);

      var src = el('p', 'hint');
      src.innerHTML = 'Source: <a href="' + escapeHtml(g.sourceUrl || g.guidelinesUrl || '#') + '" target="_blank" rel="noopener">' +
        escapeHtml(g.sourceUrl || g.guidelinesUrl || 'n/a') + '</a>' +
        (g.lastChecked ? ' · last checked ' + g.lastChecked : '');
      card.appendChild(src);

      box.appendChild(card);
    });
  }

  /* ------------------------- custom grant builder ------------------------- */

  function addCustomDocRow(doc) {
    var box = $('custom-docs');
    var row = el('div', 'field-grid');
    row.style.alignItems = 'end';
    function mk(labelText, prop, ph) {
      var w = el('div');
      var lab = el('label', 'field-label', labelText);
      lab.style.fontSize = '0.78rem'; lab.style.fontWeight = '400'; lab.style.color = 'var(--ink-soft)';
      var inp = el('input');
      inp.type = 'text';
      inp.placeholder = ph || '';
      inp.value = doc ? (doc[prop] || '') : '';
      inp.dataset.prop = prop;
      w.appendChild(lab); w.appendChild(inp);
      return w;
    }
    row.appendChild(mk('Document name', 'name', 'e.g. Research proposal'));
    row.appendChild(mk('Limit', 'limit', 'e.g. 5 pages / 1500 words'));
    row.appendChild(mk('Format', 'format', 'e.g. PDF, online form'));
    var rm = el('button', 'link-remove', 'remove');
    rm.type = 'button';
    rm.addEventListener('click', function () { box.removeChild(row); });
    var rmWrap = el('div');
    rmWrap.appendChild(rm);
    row.appendChild(rmWrap);
    box.appendChild(row);
  }

  $('custom-add-doc').addEventListener('click', function () { addCustomDocRow(null); });

  $('custom-create').addEventListener('click', function () {
    var name = $('custom-name').value.trim();
    if (!name) { setStatus('custom-status', 'Give the custom grant a name.', true); return; }
    var docs = [];
    $('custom-docs').querySelectorAll('.field-grid').forEach(function (row) {
      var doc = { id: '', name: '', required: true, limit: '', format: '', notes: '' };
      row.querySelectorAll('input').forEach(function (inp) { doc[inp.dataset.prop] = inp.value.trim(); });
      if (doc.name) {
        doc.id = 'custom-doc-' + docs.length;
        doc.limit = doc.limit || null;
        doc.format = doc.format || null;
        docs.push(doc);
      }
    });
    if (!docs.length) { setStatus('custom-status', 'Add at least one required document.', true); return; }
    var steps = $('custom-steps').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var parts = l.split('|');
      return { text: parts[0].trim(), url: (parts[1] || '').trim() || null };
    });
    var grant = {
      id: 'custom-' + Date.now(),
      name: name,
      funder: $('custom-funder').value.trim() || 'Custom / internal',
      region: 'Custom',
      type: 'custom',
      summary: $('custom-notes').value.trim() || 'User-defined custom grant.',
      eligibility: null, amounts: null, duration: null,
      deadlinesInfo: null, deadlinesUrl: null,
      portalName: 'Custom portal', portalUrl: $('custom-portal').value.trim() || null,
      guidelinesUrl: $('custom-portal').value.trim() || null,
      documents: docs,
      steps: steps.length ? steps : [{ text: 'Check the internal call text for the submission procedure', url: null }],
      sourceUrl: $('custom-portal').value.trim() || null,
      lastChecked: null
    };
    state.customGrants.push(grant);
    saveState();
    renderGrants();
    setStatus('custom-status', 'Custom grant “' + name + '” created — see the list above.');
    $('custom-name').value = ''; $('custom-funder').value = ''; $('custom-portal').value = '';
    $('custom-notes').value = ''; $('custom-docs').innerHTML = ''; $('custom-steps').value = '';
  });

  /* =========================== APPLICATIONS TAB =========================== */

  function startApplication(grant) {
    var app = {
      id: 'app-' + Date.now(),
      grantId: grant.type === 'custom' ? null : grant.id,
      customGrant: grant.type === 'custom' ? JSON.parse(JSON.stringify(grant)) : null,
      title: grant.name,
      deadline: '',
      project: { title: '', abstract: '', budget: '', duration: '', collaborators: '' },
      docStatuses: {},
      stepChecks: {}
    };
    state.applications.push(app);
    state.activeAppId = app.id;
    saveState();
    renderApps();
    switchTab('apps');
  }

  function renderAppPicker() {
    var sel = $('app-select');
    sel.innerHTML = '';
    if (!state.applications.length) {
      sel.appendChild(new Option('(no applications yet)', ''));
      return;
    }
    state.applications.forEach(function (a) {
      sel.appendChild(new Option(a.title + (a.project.title ? ' — ' + a.project.title : ''), a.id));
    });
    sel.value = state.activeAppId || state.applications[0].id;
  }

  $('app-select').addEventListener('change', function () {
    state.activeAppId = $('app-select').value || null;
    saveState();
    renderApps();
  });

  $('app-delete').addEventListener('click', function () {
    var app = activeApp();
    if (!app) { return; }
    if (!confirm('Delete application “' + app.title + '”? This cannot be undone.')) { return; }
    state.applications = state.applications.filter(function (a) { return a.id !== app.id; });
    state.activeAppId = state.applications.length ? state.applications[0].id : null;
    saveState();
    renderApps();
  });

  var countdownTimer = null;

  function renderApps() {
    renderAppPicker();
    var app = activeApp();
    var has = !!app;
    $('app-empty').classList.toggle('hidden', has);
    $('app-workspace').classList.toggle('hidden', !has);
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (!has) { return; }
    var grant = appGrant(app);

    $('app-deadline').value = app.deadline || '';

    // project details
    $('proj-title').value = app.project.title || '';
    $('proj-budget').value = app.project.budget || '';
    $('proj-duration').value = app.project.duration || '';
    $('proj-collabs').value = app.project.collaborators || '';
    $('proj-abstract').value = app.project.abstract || '';

    renderDocChecklist(app, grant);
    renderSteps(app, grant);
    renderAppLinks(grant);
    updateCountdown(app);
    countdownTimer = setInterval(function () { updateCountdown(app); }, 60000);
    renderDocsContext();
  }

  function updateCountdown(app) {
    var cd = $('app-countdown');
    cd.className = 'countdown';
    if (!app.deadline) {
      cd.textContent = 'Set a deadline above to see the countdown.';
      cd.classList.add('far');
      return;
    }
    var due = new Date(app.deadline + 'T17:00:00');
    var diff = due.getTime() - Date.now();
    var days = Math.floor(Math.abs(diff) / 86400000);
    var hours = Math.floor((Math.abs(diff) % 86400000) / 3600000);
    if (diff < 0) {
      cd.textContent = 'Deadline passed ' + (days ? days + ' day' + (days === 1 ? '' : 's') + ' ago' : hours + ' hours ago') + ' (' + app.deadline + ').';
      cd.classList.add('overdue');
    } else {
      cd.textContent = days + ' day' + (days === 1 ? '' : 's') + ', ' + hours + ' hour' + (hours === 1 ? '' : 's') + ' left — due ' + app.deadline;
      cd.classList.add(days <= 14 ? 'soon' : 'far');
    }
  }

  function onDeadlineChange() {
    var app = activeApp();
    if (!app) { return; }
    app.deadline = $('app-deadline').value;
    saveState();
    updateCountdown(app);
  }
  $('app-deadline').addEventListener('change', onDeadlineChange);
  $('app-deadline').addEventListener('input', onDeadlineChange);

  ['proj-title', 'proj-budget', 'proj-duration', 'proj-collabs', 'proj-abstract'].forEach(function (id) {
    var map = { 'proj-title': 'title', 'proj-budget': 'budget', 'proj-duration': 'duration', 'proj-collabs': 'collaborators', 'proj-abstract': 'abstract' };
    $(id).addEventListener('input', function () {
      var app = activeApp();
      if (!app) { return; }
      app.project[map[id]] = $(id).value;
      saveState();
      renderDocsContext();
    });
  });

  function renderDocChecklist(app, grant) {
    var box = $('app-doc-list');
    box.innerHTML = '';
    if (!grant) { return; }
    var docs = grant.documents;
    var done = 0;
    docs.forEach(function (doc) {
      var status = app.docStatuses[doc.id] || 'not-started';
      if (status === 'done') { done++; }
      var row = el('div', 'app-doc');
      var nameWrap = el('div', 'doc-name');
      nameWrap.appendChild(el('strong', null, doc.name));
      if (!doc.required) { nameWrap.appendChild(el('span', 'badge neutral', 'conditional')); }
      row.appendChild(nameWrap);
      row.appendChild(el('span', 'doc-limit', doc.limit || ''));
      var sel = el('select');
      [['not-started', 'Not started'], ['drafted', 'Drafted'], ['done', 'Done']].forEach(function (o) {
        sel.appendChild(new Option(o[1], o[0]));
      });
      sel.value = status;
      sel.setAttribute('aria-label', 'Status of ' + doc.name);
      sel.addEventListener('change', function () {
        app.docStatuses[doc.id] = sel.value;
        saveState();
        renderDocChecklist(app, grant);
      });
      row.appendChild(sel);
      box.appendChild(row);
    });
    var pct = docs.length ? Math.round(100 * done / docs.length) : 0;
    $('doc-progress-fill').style.width = pct + '%';
    $('doc-progress-label').textContent = done + ' / ' + docs.length + ' done';
  }

  function renderSteps(app, grant) {
    var box = $('app-step-list');
    box.innerHTML = '';
    if (!grant) { return; }
    grant.steps.forEach(function (s, i) {
      var lab = el('label', 'check-item');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !!app.stepChecks[i];
      cb.addEventListener('change', function () {
        app.stepChecks[i] = cb.checked;
        saveState();
      });
      var span = el('span');
      span.appendChild(document.createTextNode(s.text + ' '));
      if (s.url) {
        var a = el('a', null, 'go to official site');
        a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
        span.appendChild(a);
      }
      lab.appendChild(cb);
      lab.appendChild(span);
      box.appendChild(lab);
    });
  }

  function renderAppLinks(grant) {
    var box = $('app-links');
    box.innerHTML = '';
    if (!grant) { return; }
    function link(labelText, url) {
      if (!url) { return; }
      var p = el('p', 'hint');
      p.style.margin = '0 0 0.4rem';
      var a = el('a', null, labelText);
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      p.appendChild(a);
      box.appendChild(p);
    }
    link('Guidelines: ' + (grant.guidelinesUrl || ''), grant.guidelinesUrl);
    link('Submission portal: ' + (grant.portalUrl || ''), grant.portalUrl);
    link('Deadlines: ' + (grant.deadlinesUrl || ''), grant.deadlinesUrl);
    if (grant.sourceUrl) { link('Source for this requirement profile (checked ' + (grant.lastChecked || 'n/a') + ')', grant.sourceUrl); }
    if (!grant.guidelinesUrl && !grant.portalUrl) { box.appendChild(el('p', 'hint', 'No links recorded for this grant.')); }
  }

  /* ============================ DOCUMENTS TAB ============================ */

  /* Each generator: {id, title, desc, build(app) -> {text, docxTitle, targetWords?, structured?: 'nsf'|'nih'|'support', options?}} */
  function docGenerators() {
    var app = activeApp();
    var grant = appGrant(app);
    var project = currentProject(app);
    var profile = state.profile;
    var gens = [
      {
        id: 'bio', title: 'Short author bio',
        desc: 'Third-person bio pre-filled from your profile. Pick a length and style. Exceeding the target word count is flagged.',
        options: function (container, rebuild) {
          container.appendChild(labelWrap('Length', selectWith('bio-len', [['50', '50 words'], ['100', '100 words'], ['200', '200 words']], rebuild)));
          container.appendChild(labelWrap('Style', selectWith('bio-style', [['grant', 'Grant style'], ['journal', 'Journal style']], rebuild)));
        },
        build: function () {
          var words = parseInt(($('bio-len') || {}).value || '100', 10);
          var style = ($('bio-style') || {}).value || 'grant';
          return { text: Gen.buildBio(profile, project, words, style), docxTitle: 'Bio (' + words + ' words) — ' + profile.basics.fullName, targetWords: words, aiKind: 'bio' };
        }
      },
      {
        id: 'nsf-biosketch', title: 'NSF biographical sketch',
        desc: 'NSF Common Form content pre-filled from your profile (Identifying Information, Organization & Location, Professional Preparation, Appointments & Positions, Products ≤5+5, Certification). The official document must be generated and certified in SciENcv — this is your ready-to-transfer draft.',
        build: function () {
          var d = Gen.buildNsfBiosketchData(profile);
          var lines = ['BIOGRAPHICAL SKETCH — ' + d.identifying.name, d.disclaimer, '',
            'IDENTIFYING INFORMATION', 'Name: ' + d.identifying.name,
            d.identifying.orcid ? 'ORCID iD: ' + d.identifying.orcid : '',
            d.identifying.positionTitle ? 'Position Title: ' + d.identifying.positionTitle : '', '',
            'ORGANIZATION AND LOCATION', (d.organization.organization || '[Organization]') + (d.organization.location ? ' — ' + d.organization.location : ''), '',
            'PROFESSIONAL PREPARATION'];
          (d.professionalPreparation.length ? d.professionalPreparation : null) ?
            d.professionalPreparation.forEach(function (e) { lines.push('• ' + [e.degree, e.field, e.institution, e.location, [e.startYear, e.endYear].filter(Boolean).join('–')].filter(Boolean).join(', ')); }) :
            lines.push('[Add education/training]');
          lines.push('', 'APPOINTMENTS AND POSITIONS');
          d.appointments.length ?
            d.appointments.forEach(function (a) { lines.push('• ' + [a.title, a.department, a.organization, a.location, [a.startYear, a.endYear].filter(Boolean).join('–')].filter(Boolean).join(', ')); }) :
            lines.push('[Add appointments]');
          lines.push('', 'PRODUCTS', 'Most closely related (up to 5):');
          d.productsRelated.length ? d.productsRelated.forEach(function (p) { lines.push('• ' + p); }) : lines.push('[Add up to 5]');
          lines.push('Other significant (up to 5):');
          d.productsOther.length ? d.productsOther.forEach(function (p) { lines.push('• ' + p); }) : lines.push('[Add up to 5]');
          lines.push('', 'CERTIFICATION', d.certification);
          return { text: lines.join('\n'), docxTitle: 'NSF Biographical Sketch — ' + d.identifying.name, structured: 'nsf', data: d };
        }
      },
      {
        id: 'nih-biosketch', title: 'NIH biographical sketch',
        desc: 'NIH 5-page biosketch content: Personal Statement, Positions/Appointments/Honors, Contributions to Science — pre-filled from your profile and the current project. For due dates on/after 25 Jan 2026, transfer into SciENcv (Common Form + Biosketch Supplement) and certify there.',
        build: function () {
          var d = Gen.buildNihBiosketchData(profile, project);
          var lines = ['BIOGRAPHICAL SKETCH — ' + d.header.name, d.disclaimer, '',
            [d.header.positionTitle, d.header.institution].filter(Boolean).join(', '),
            d.header.orcid ? 'ORCID iD: ' + d.header.orcid : '', '',
            'A. PERSONAL STATEMENT', d.personalStatement, '',
            'B. POSITIONS, SCIENTIFIC APPOINTMENTS, AND HONORS'];
          d.positions.length ? d.positions.forEach(function (p) { lines.push('• ' + [p.years, p.title, p.department, p.institution, p.location].filter(Boolean).join(', ')); }) : lines.push('[Add positions]');
          if (d.honors.length) {
            lines.push('Honors:');
            d.honors.forEach(function (h) { lines.push('• ' + [h.year, h.name, h.org].filter(Boolean).join(' — ')); });
          }
          lines.push('', 'C. CONTRIBUTIONS TO SCIENCE');
          d.contributions.length ? d.contributions.forEach(function (c, i) {
            lines.push('Contribution ' + (i + 1) + ': ' + c.summary);
            c.citations.forEach(function (cit) { lines.push('  • ' + cit); });
          }) : lines.push('[Describe up to 5 contributions]');
          return { text: lines.join('\n'), docxTitle: 'NIH Biographical Sketch — ' + d.header.name, structured: 'nih', data: d };
        }
      },
      {
        id: 'support', title: 'Current & pending (other) support table',
        desc: 'Formatted table from the projects in your profile (status, source, award, period, person-months, role, overlap). NSF/NIH require the certified SciENcv version — this is the working table to transfer from.',
        build: function () {
          var rows = Gen.buildSupportRows(profile.projects, project.title);
          var lines = ['CURRENT AND PENDING (OTHER) SUPPORT — ' + (profile.basics.fullName || '[name]'),
            'Working draft (certify in SciENcv for NSF/NIH submissions)', ''];
          if (!rows.length) { lines.push('[Add projects to your profile — Profile tab → Research support.]'); }
          rows.forEach(function (r, i) {
            lines.push((i + 1) + '. ' + r.title);
            lines.push('   Status: ' + r.status + ' | Source: ' + r.source + (r.awardNumber ? ' | Award: ' + r.awardNumber : ''));
            lines.push('   Amount: ' + (r.amount || '—') + ' | Period: ' + (r.period || '—') + ' | Effort: ' + (r.personMonths || '—') + ' person-months | Role: ' + (r.role || '—'));
            lines.push('   Overlap: ' + r.overlap);
            lines.push('');
          });
          return { text: lines.join('\n'), docxTitle: 'Current and Pending Support — ' + profile.basics.fullName, structured: 'support', data: { name: profile.basics.fullName || 'Applicant', rows: rows } };
        }
      },
      {
        id: 'loi', title: 'Letter of intent (LOI)',
        desc: 'Letter of intent / inquiry to the funder of the current application (Sloan-style LOIs included). Edit bracketed placeholders.',
        build: function () { return { text: Gen.buildLetterOfIntent(profile, project, grant), docxTitle: 'Letter of Intent — ' + (project.title || 'Project') }; }
      },
      {
        id: 'cover-letter', title: 'Cover letter to program officer',
        desc: 'Submission cover letter naming the program, summarizing the project, and confirming completeness of the package.',
        build: function () { return { text: Gen.buildCoverLetter(profile, project, grant), docxTitle: 'Cover Letter — ' + (project.title || 'Project') }; }
      },
      {
        id: 'collab-letter', title: 'Collaboration invitation letter',
        desc: 'Invite a collaborator and request their letter of commitment; role and effort placeholders included.',
        build: function () { return { text: Gen.buildCollaborationLetter(profile, project), docxTitle: 'Collaboration Letter — ' + (project.title || 'Project') }; }
      },
      {
        id: 'support-letter', title: 'Letter of support template',
        desc: 'Send this template to collaborators so their support letters confirm role, effort, and enthusiasm consistently.',
        build: function () { return { text: Gen.buildSupportLetterTemplate(profile, project, grant), docxTitle: 'Support Letter Template — ' + (project.title || 'Project') }; }
      },
      {
        id: 'nsf-summary', title: 'NSF project summary skeleton',
        desc: 'One page, three labeled sections (Overview / Intellectual Merit / Broader Impacts) with prompts. Required by every NSF proposal.',
        build: function () { return { text: Gen.buildNsfSummarySkeleton(profile, project), docxTitle: 'NSF Project Summary — ' + (project.title || 'Project') }; }
      },
      {
        id: 'nih-aims', title: 'NIH specific aims skeleton',
        desc: 'One page: problem/gap paragraph, central hypothesis, 2–3 aims, impact close — the structure reviewers expect.',
        build: function () { return { text: Gen.buildNihAimsSkeleton(profile, project), docxTitle: 'NIH Specific Aims — ' + (project.title || 'Project') }; }
      },
      {
        id: 'erc-synopsis', title: 'ERC extended synopsis skeleton',
        desc: 'Part I of the Scientific Proposal (5 pages): frontier problem, why-now-why-me, strategy, impact. This is all Step-1 reviewers read alongside your CV.',
        build: function () { return { text: Gen.buildErcSynopsisSkeleton(profile, project), docxTitle: 'ERC Extended Synopsis — ' + (project.title || 'Project') }; }
      }
    ];
    // custom-grant document skeletons for the active application
    if (grant && grant.type === 'custom') {
      grant.documents.forEach(function (doc) {
        gens.push({
          id: 'custom-' + doc.id, title: 'Skeleton: ' + doc.name,
          desc: 'Skeleton for your custom grant document' + (doc.limit ? ' (limit: ' + doc.limit + ')' : '') + '.',
          build: function () { return { text: Gen.buildCustomSkeleton(doc, profile, project), docxTitle: doc.name + ' — ' + (project.title || 'Project') }; }
        });
      });
    }
    return gens;
  }

  function labelWrap(labelText, input) {
    var w = el('span');
    var lab = el('label', 'field-label', labelText + ' ');
    lab.style.display = 'inline';
    lab.style.fontSize = '0.82rem';
    lab.setAttribute('for', input.id);
    input.style.width = 'auto';
    input.style.display = 'inline-block';
    w.appendChild(lab);
    w.appendChild(input);
    return w;
  }

  function selectWith(id, opts, onChange) {
    var sel = el('select');
    sel.id = id;
    opts.forEach(function (o) { sel.appendChild(new Option(o[1], o[0])); });
    sel.addEventListener('change', onChange);
    return sel;
  }

  var activeGenId = 'bio';
  var canonicalText = '';   // last generated (unedited) text — used to pick structured docx builders

  function renderDocNav() {
    var nav = $('docgen-nav');
    nav.innerHTML = '';
    docGenerators().forEach(function (g) {
      var b = el('button', 'docgen-nav-btn' + (g.id === activeGenId ? ' active' : ''), g.title);
      b.type = 'button';
      b.addEventListener('click', function () { activeGenId = g.id; renderDocNav(); renderDocGen(); });
      nav.appendChild(b);
    });
  }

  function currentGen() {
    return docGenerators().find(function (g) { return g.id === activeGenId; }) || docGenerators()[0];
  }

  function renderDocGen() {
    var gen = currentGen();
    $('docgen-title').textContent = gen.title;
    $('docgen-desc').textContent = gen.desc;
    var optBox = $('docgen-options');
    optBox.innerHTML = '';
    if (gen.options) { gen.options(optBox, renderDocGen); }
    var out = gen.build();
    canonicalText = out.text;
    $('docgen-editor').value = out.text;
    $('docgen-editor').dataset.docxTitle = out.docxTitle;
    $('docgen-editor').dataset.structured = out.structured || '';
    $('docgen-editor').dataset.targetWords = out.targetWords || '';
    updateDocPreview();
  }

  function updateDocPreview() {
    var text = $('docgen-editor').value;
    var pv = $('docgen-preview');
    // render headings (ALL-CAPS lines) and bullets in the preview
    var html = escapeHtml(text).split('\n').map(function (line) {
      if (/^[A-Z0-9 ,.&()'—–-]{6,}$/.test(line.trim()) && line.trim().length > 5) { return '<h2>' + line + '</h2>'; }
      if (/^\s*•/.test(line)) { return '<div style="padding-left:1.2rem;">' + line + '</div>'; }
      return line;
    }).join('\n');
    pv.innerHTML = html;
    var words = Gen.countWords(text);
    var target = parseInt($('docgen-editor').dataset.targetWords || '0', 10);
    var wc = $('docgen-words');
    if (target) {
      wc.textContent = words + ' / ~' + target + ' words';
      wc.classList.toggle('over', words > target);
    } else {
      wc.textContent = words + ' words';
      wc.classList.remove('over');
    }
  }

  $('docgen-editor').addEventListener('input', updateDocPreview);

  $('docgen-docx').addEventListener('click', function () {
    var editor = $('docgen-editor');
    var titleText = editor.dataset.docxTitle || 'GrantPilot document';
    var structured = editor.dataset.structured;
    setStatus('docgen-status', 'Generating .docx…');
    $('docgen-docx').disabled = true;
    Gen.loadDocx().then(function () {
      var docObj;
      var edited = editor.value !== canonicalText;
      var gen = currentGen();
      if (!edited && structured === 'nsf') { docObj = Gen.buildNsfBiosketchDocx(gen.build().data); }
      else if (!edited && structured === 'nih') { docObj = Gen.buildNihBiosketchDocx(gen.build().data); }
      else if (!edited && structured === 'support') { var d2 = gen.build().data; docObj = Gen.buildSupportDocx(d2.name, d2.rows); }
      else { docObj = Gen.buildTextDocx(titleText, editor.value); }
      return Gen.exportDocx(docObj);
    }).then(function (blob) {
      downloadBlob(slug(titleText) + '.docx', blob);
      setStatus('docgen-status', 'Downloaded ' + slug(titleText) + '.docx');
    }).catch(function (err) {
      setStatus('docgen-status', err.message, true);
    }).finally(function () { $('docgen-docx').disabled = false; });
  });

  $('docgen-copy').addEventListener('click', function () {
    var text = $('docgen-editor').value;
    function done() { setStatus('docgen-status', 'Copied to clipboard.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else { fallbackCopy(text, done); }
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { setStatus('docgen-status', 'Copy failed — select the text and copy manually.', true); }
    document.body.removeChild(ta);
  }

  $('docgen-ai').addEventListener('click', function () {
    if (!AI.isConfigured()) {
      setStatus('docgen-status', 'No AI key configured — the template output is already complete. Add a key in the AI & Data tab for assisted refinement.', true);
      return;
    }
    var gen = currentGen();
    var app = activeApp();
    setStatus('docgen-status', 'Asking the AI endpoint to refine this document…');
    $('docgen-ai').disabled = true;
    AI.refineText(gen.title, $('docgen-editor').value, state.profile, currentProject(app), appGrant(app))
      .then(function (text) {
        $('docgen-editor').value = text;
        updateDocPreview();
        setStatus('docgen-status', 'AI refinement applied — review it carefully; you are responsible for the final text.');
      })
      .catch(function (err) { setStatus('docgen-status', err.message, true); })
      .finally(function () { $('docgen-ai').disabled = false; });
  });

  function renderDocsContext() {
    var app = activeApp();
    $('docs-context').textContent = app
      ? 'Context: application “' + app.title + '”' + (app.project.title ? ' · project “' + app.project.title + '”' : ' · (add a project title/abstract in the Applications tab for better pre-filling)') + '.'
      : 'No application selected — documents use your profile only. Start one in Grant Sources for funder-specific context.';
  }

  /* ============================== AI & DATA ============================== */

  function renderAiSettings() {
    var s = AI.getSettings();
    $('ai-endpoint').value = s.endpoint;
    $('ai-model').value = s.model;
    $('ai-key').value = s.key;
    setStatus('ai-status', AI.isConfigured() ? 'AI endpoint configured.' : 'Not configured — template fallbacks are in use.');
  }

  $('ai-save').addEventListener('click', function () {
    AI.saveSettings({ endpoint: $('ai-endpoint').value, model: $('ai-model').value, key: $('ai-key').value });
    renderAiSettings();
  });

  $('ai-clear').addEventListener('click', function () {
    AI.clearSettings();
    renderAiSettings();
  });

  $('data-export').addEventListener('click', function () {
    var payload = { app: 'grantpilot', exportedAt: new Date().toISOString(), state: state };
    downloadText('grantpilot-backup.json', JSON.stringify(payload, null, 2));
    setStatus('data-status', 'Backup downloaded.');
  });

  $('data-import-input').addEventListener('change', function () {
    var f = $('data-import-input').files && $('data-import-input').files[0];
    if (!f) { return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var j = JSON.parse(reader.result);
        var incoming = j.state || j;
        if (!incoming.profile) { throw new Error('No profile found in this file.'); }
        state.profile = Profile.normalize(incoming.profile);
        state.applications = Array.isArray(incoming.applications) ? incoming.applications : [];
        state.customGrants = Array.isArray(incoming.customGrants) ? incoming.customGrants : [];
        state.activeAppId = incoming.activeAppId || (state.applications[0] && state.applications[0].id) || null;
        saveState();
        renderAll();
        setStatus('data-status', 'Imported ' + f.name + '.');
      } catch (e) {
        setStatus('data-status', 'Import failed: ' + e.message, true);
      }
    };
    reader.readAsText(f);
    $('data-import-input').value = '';
  });

  $('data-clear').addEventListener('click', function () {
    if (!confirm('Clear the profile, all applications, and custom grants from this browser?')) { return; }
    localStorage.removeItem(LS_KEY);
    state = newState();
    renderAll();
    setStatus('data-status', 'Everything cleared.');
  });

  /* -------------------------------- init -------------------------------- */

  function renderAll() {
    renderProfileAll();
    renderGrants();
    renderApps();
    renderDocNav();
    renderDocGen();
    renderDocsContext();
    renderAiSettings();
  }

  loadState();
  renderAll();

  var hash = (location.hash || '').replace('#', '');
  if (['profile', 'grants', 'apps', 'docs', 'ai'].indexOf(hash) !== -1) { switchTab(hash); }
})();
