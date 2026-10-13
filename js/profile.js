/* GrantPilot — js/profile.js
 * Researcher profile: schema, localStorage persistence helpers, and importers:
 *   - ORCID public record (pub.orcid.org, CORS-enabled, Accept: application/json)
 *   - OpenAlex enrichment (api.openalex.org — citations, h-index, top works)
 *   - CV text extraction via pdf.js / mammoth.js (lazy, pinned CDNs)
 * Fetch functions live in the browser; the record->profile mapping functions
 * are pure and run under Node for smoke tests.
 * Exposed as window.GrantPilotProfile / globalThis.GrantPilotProfile.
 */
(function (global) {
  'use strict';

  var PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var MAMMOTH_URL = 'https://cdn.jsdelivr.net/npm/mammoth@1.9.1/mammoth.browser.min.js';

  /* ----------------------------- schema ----------------------------- */

  function emptyProfile() {
    return {
      version: 1,
      basics: {
        fullName: '', givenName: '', familyName: '', email: '',
        orcid: '', website: '', title: '', institution: '',
        department: '', city: '', country: ''
      },
      education: [],     // {degree, institution, field, location, startYear, endYear}
      appointments: [],  // {title, department, institution, location, startYear, endYear, current}
      publications: [],  // {title, authors[], venue, year, doi, url, type, citations, source}
      awards: [],        // {name, year, org}
      projects: [],      // {title, funder, grantNumber, role, status, amount, startYear, endYear, personMonths, summary}
      keywords: [],
      bioNotes: '',      // free-text research interests used by generators
      metrics: null,     // {citedBy, worksCount, hIndex, i10, openAlexId, source}
      importLog: []      // [{at, source, detail}]
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function normalize(p) {
    var base = emptyProfile();
    p = p || {};
    var out = clone(base);
    Object.keys(base.basics).forEach(function (k) {
      if (p.basics && typeof p.basics[k] === 'string') { out.basics[k] = p.basics[k]; }
    });
    ['education', 'appointments', 'publications', 'awards', 'projects'].forEach(function (k) {
      if (Array.isArray(p[k])) { out[k] = p[k]; }
    });
    if (Array.isArray(p.keywords)) { out.keywords = p.keywords; }
    if (typeof p.bioNotes === 'string') { out.bioNotes = p.bioNotes; }
    if (p.metrics) { out.metrics = p.metrics; }
    if (Array.isArray(p.importLog)) { out.importLog = p.importLog; }
    return out;
  }

  function logImport(profile, source, detail) {
    profile.importLog.push({ at: new Date().toISOString(), source: source, detail: detail });
  }

  /* Merge helpers: dedupe publications by title (case-insensitive). */
  function mergePublications(profile, pubs) {
    var seen = {};
    profile.publications.forEach(function (p) { seen[p.title.toLowerCase()] = true; });
    var added = 0;
    (pubs || []).forEach(function (p) {
      if (!p.title) { return; }
      var key = p.title.toLowerCase();
      if (seen[key]) {
        // enrich existing record with missing doi/citations
        profile.publications.forEach(function (q) {
          if (q.title.toLowerCase() === key) {
            if (!q.doi && p.doi) { q.doi = p.doi; }
            if ((q.citations == null) && p.citations != null) { q.citations = p.citations; }
          }
        });
        return;
      }
      seen[key] = true;
      profile.publications.push(p);
      added++;
    });
    return added;
  }

  function mergeList(profile, key, items, matchFn) {
    var added = 0;
    (items || []).forEach(function (it) {
      var dup = profile[key].some(function (cur) { return matchFn(cur, it); });
      if (!dup) { profile[key].push(it); added++; }
    });
    return added;
  }

  /* ------------------------------ ORCID ------------------------------ */

  function cleanOrcidId(raw) {
    var s = String(raw || '').trim().toUpperCase()
      .replace(/^https?:\/\/(www\.)?orcid\.org\//i, '')
      .replace(/[^0-9X]/g, '');
    if (s.length !== 15 && s.length !== 16) { return null; }
    return s.replace(/(.{4})(?=.)/g, '$1-');
  }

  function orcidYear(d) {
    return d && d.year && d.year.value ? d.year.value : '';
  }

  /* Map an ORCID v3.0 record JSON to profile fragments (pure). */
  function mapOrcidRecord(record) {
    var out = { basics: {}, education: [], appointments: [], publications: [] };
    if (!record) { return out; }
    var person = record.person || {};
    var name = person.name || {};
    var credit = name['credit-name'] && name['credit-name'].value;
    var given = name['given-names'] && name['given-names'].value || '';
    var family = name['family-name'] && name['family-name'].value || '';
    out.basics.fullName = credit || [given, family].filter(Boolean).join(' ');
    out.basics.givenName = given;
    out.basics.familyName = family;
    var emails = person.emails && person.emails.emails || [];
    if (emails.length && emails[0].email) { out.basics.email = emails[0].email; }
    var urls = person['researcher-urls'] && person['researcher-urls']['researcher-url'] || [];
    if (urls.length && urls[0]['url'] && urls[0]['url'].value) { out.basics.website = urls[0]['url'].value; }
    var kws = person.keywords && person.keywords.keyword || [];
    out.keywords = kws.map(function (k) { return k.content; }).filter(Boolean);

    var acts = record['activities-summary'] || {};

    function affiliations(group, kind) {
      var res = [];
      (group && group['affiliation-group'] || []).forEach(function (g) {
        (g.summaries || []).forEach(function (s) {
          var item = s[kind + '-summary'] || s['employment-summary'] || s['education-summary'];
          if (!item) { return; }
          var org = item.organization || {};
          var addr = org.address || {};
          res.push({
            title: item['role-title'] || '',
            degree: kind === 'education' ? (item['role-title'] || '') : '',
            department: item['department-name'] || '',
            institution: org.name || '',
            field: kind === 'education' ? (item['department-name'] || '') : '',
            location: [addr.city, addr.region, addr.country].filter(Boolean).join(', '),
            startYear: orcidYear(item['start-date']),
            endYear: orcidYear(item['end-date']),
            current: !item['end-date']
          });
        });
      });
      return res;
    }

    out.appointments = affiliations(acts.employments, 'employment');
    out.education = affiliations(acts.educations, 'education');

    // current position → basics
    var cur = out.appointments.find(function (a) { return a.current; }) || out.appointments[0];
    if (cur) {
      out.basics.title = cur.title || '';
      out.basics.institution = cur.institution || '';
      out.basics.department = cur.department || '';
      if (cur.location) {
        var parts = cur.location.split(', ');
        out.basics.city = parts[0] || '';
        out.basics.country = parts[parts.length - 1] || '';
      }
    }

    var groups = acts.works && acts.works.group || [];
    groups.forEach(function (g) {
      var ws = g['work-summary'] && g['work-summary'][0];
      if (!ws) { return; }
      var title = ws.title && ws.title.title && ws.title.title.value || '';
      var venue = ws['journal-title'] && ws['journal-title'].value || '';
      // journal-title sometimes sits in subtitle
      var sub = ws.title && ws.title.subtitle && ws.title.subtitle.value;
      if (!venue && sub && /journal|proceedings|review|press|transactions|letters/i.test(sub)) { venue = sub; }
      var doi = '', url = ws.url && ws.url.value || '';
      (ws['external-ids'] && ws['external-ids']['external-id'] || []).forEach(function (x) {
        if (x['external-id-type'] === 'doi' && !doi) { doi = x['external-id-value']; }
      });
      out.publications.push({
        title: title,
        authors: [],
        venue: venue,
        year: orcidYear(ws['publication-date']),
        doi: doi,
        url: url,
        type: ws.type || '',
        citations: null,
        source: 'orcid'
      });
    });

    return out;
  }

  function orcidRecordUrl(orcid) { return 'https://pub.orcid.org/v3.0/' + orcid + '/record'; }

  function fetchOrcid(orcid) {
    return fetch(orcidRecordUrl(orcid), { headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (r.status === 404) { throw new Error('ORCID iD not found. Check the 16-digit identifier.'); }
        if (!r.ok) { throw new Error('ORCID API error (HTTP ' + r.status + ').'); }
        return r.json();
      });
  }

  /* Apply an ORCID record onto a profile; returns a summary for the UI. */
  function applyOrcidRecord(profile, orcid, record) {
    var mapped = mapOrcidRecord(record);
    var basics = profile.basics;
    ['fullName', 'givenName', 'familyName', 'email', 'website', 'title', 'institution', 'department', 'city', 'country'].forEach(function (k) {
      if (!basics[k] && mapped.basics[k]) { basics[k] = mapped.basics[k]; }
    });
    basics.orcid = orcid;
    var nPub = mergePublications(profile, mapped.publications);
    var nApp = mergeList(profile, 'appointments', mapped.appointments, function (a, b) {
      return a.institution === b.institution && a.title === b.title && a.startYear === b.startYear;
    });
    var nEdu = mergeList(profile, 'education', mapped.education, function (a, b) {
      return a.institution === b.institution && a.startYear === b.startYear;
    });
    if (mapped.keywords && mapped.keywords.length && !profile.keywords.length) {
      profile.keywords = mapped.keywords;
    }
    logImport(profile, 'ORCID', orcid + ': ' + nPub + ' works, ' + nApp + ' appointments, ' + nEdu + ' education entries');
    return { publications: nPub, appointments: nApp, education: nEdu, name: mapped.basics.fullName || '' };
  }

  /* ----------------------------- OpenAlex ----------------------------- */

  function openAlexAuthorUrlByOrcid(orcid) {
    return 'https://api.openalex.org/authors/orcid:' + orcid;
  }
  function openAlexSearchUrl(name) {
    return 'https://api.openalex.org/authors?search=' + encodeURIComponent(name);
  }

  /* Map an OpenAlex author object to enrichment data (pure). */
  function mapOpenAlexAuthor(a) {
    if (!a) { return null; }
    var stats = a.summary_stats || {};
    var inst = (a.last_known_institutions && a.last_known_institutions[0]) ||
      (a.last_known_institution) || null;
    return {
      openAlexId: a.id || '',
      name: a.display_name || '',
      metrics: {
        citedBy: a.cited_by_count != null ? a.cited_by_count : null,
        worksCount: a.works_count != null ? a.works_count : null,
        hIndex: stats.h_index != null ? stats.h_index : null,
        i10: stats.i10_index != null ? stats.i10_index : null,
        openAlexId: a.id || '',
        source: 'OpenAlex'
      },
      institution: inst ? (inst.display_name || '') : ''
    };
  }

  /* Fetch top works by citations for an author id (e.g. https://openalex.org/A123). */
  function openAlexTopWorksUrl(openAlexId) {
    var id = String(openAlexId || '').replace('https://openalex.org/', '');
    return 'https://api.openalex.org/works?filter=author.id:' + id +
      '&sort=cited_by_count:desc&per-page=25&select=display_name,publication_year,doi,cited_by_count,primary_location,authorships,type';
  }

  function mapOpenAlexWork(w) {
    var venue = '';
    if (w.primary_location && w.primary_location.source && w.primary_location.source.display_name) {
      venue = w.primary_location.source.display_name;
    }
    var authors = (w.authorships || []).map(function (a) {
      return a.author && a.author.display_name || '';
    }).filter(Boolean);
    var doi = (w.doi || '').replace(/^https?:\/\/doi\.org\//, '');
    return {
      title: w.display_name || '',
      authors: authors,
      venue: venue,
      year: w.publication_year != null ? String(w.publication_year) : '',
      doi: doi,
      url: w.doi || '',
      type: w.type || '',
      citations: w.cited_by_count != null ? w.cited_by_count : null,
      source: 'openalex'
    };
  }

  function applyOpenAlex(profile, authorData, works) {
    var mapped = mapOpenAlexAuthor(authorData);
    if (!mapped) { return null; }
    profile.metrics = mapped.metrics;
    if (!profile.basics.fullName && mapped.name) { profile.basics.fullName = mapped.name; }
    if (!profile.basics.institution && mapped.institution) { profile.basics.institution = mapped.institution; }
    var nPub = mergePublications(profile, (works || []).map(mapOpenAlexWork));
    logImport(profile, 'OpenAlex', mapped.openAlexId + ': metrics + ' + nPub + ' works');
    return { metrics: mapped.metrics, publications: nPub, name: mapped.name };
  }

  /* ---------------------- CV file text extraction ---------------------- */

  function loadScriptOnce(url, checkFn) {
    return new Promise(function (resolve, reject) {
      if (checkFn()) { resolve(); return; }
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () {
        if (checkFn()) { resolve(); }
        else { reject(new Error(url + ' loaded but did not initialize')); }
      };
      s.onerror = function () { reject(new Error('Could not load ' + url + ' — check your internet connection.')); };
      document.head.appendChild(s);
    });
  }

  function loadPdfJs() {
    return loadScriptOnce(PDFJS_URL, function () { return !!global.pdfjsLib; }).then(function () {
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return global.pdfjsLib;
    });
  }

  function loadMammoth() {
    return loadScriptOnce(MAMMOTH_URL, function () { return !!global.mammoth; }).then(function () {
      return global.mammoth;
    });
  }

  function extractPdfText(arrayBuffer) {
    return loadPdfJs().then(function (pdfjsLib) {
      return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    }).then(function (pdf) {
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) { pages.push(i); }
      var text = '';
      return pages.reduce(function (p, pageNum) {
        return p.then(function () {
          return pdf.getPage(pageNum);
        }).then(function (page) {
          return page.getTextContent();
        }).then(function (tc) {
          text += tc.items.map(function (it) { return it.str; }).join(' ') + '\n';
        });
      }, Promise.resolve()).then(function () { return text; });
    });
  }

  function extractDocxText(arrayBuffer) {
    return loadMammoth().then(function (mammoth) {
      return mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    }).then(function (result) { return result.value; });
  }

  /* ----------------------------- exports ----------------------------- */

  global.GrantPilotProfile = {
    PDFJS_URL: PDFJS_URL,
    PDFJS_WORKER_URL: PDFJS_WORKER_URL,
    MAMMOTH_URL: MAMMOTH_URL,
    emptyProfile: emptyProfile,
    normalize: normalize,
    logImport: logImport,
    mergePublications: mergePublications,
    mergeList: mergeList,
    cleanOrcidId: cleanOrcidId,
    mapOrcidRecord: mapOrcidRecord,
    orcidRecordUrl: orcidRecordUrl,
    fetchOrcid: fetchOrcid,
    applyOrcidRecord: applyOrcidRecord,
    openAlexAuthorUrlByOrcid: openAlexAuthorUrlByOrcid,
    openAlexSearchUrl: openAlexSearchUrl,
    mapOpenAlexAuthor: mapOpenAlexAuthor,
    openAlexTopWorksUrl: openAlexTopWorksUrl,
    mapOpenAlexWork: mapOpenAlexWork,
    applyOpenAlex: applyOpenAlex,
    extractPdfText: extractPdfText,
    extractDocxText: extractDocxText
  };
})(typeof window !== 'undefined' ? window : globalThis);
