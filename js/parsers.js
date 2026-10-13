/* GrantPilot — js/parsers.js
 * Pure text parsers (no DOM, no fetch) so they run in the browser and in
 * Node smoke tests:
 *   - parseBibTeX(text)         → publications[] (Google Scholar BibTeX export etc.)
 *   - parseLinkedInText(text)   → { education, appointments, summary } heuristics
 *   - parseResearchGateText(text) → { publications, education, appointments }
 *   - parseCvText(text)         → heuristic section extraction for uploaded CVs
 * Exposed as window.GrantPilotParsers / globalThis.GrantPilotParsers.
 */
(function (global) {
  'use strict';

  /* ------------------------------ BibTeX ------------------------------ */

  /* Parse a BibTeX string into entries: [{type, key, fields{}}]. */
  function parseBibTeX(text) {
    var entries = [];
    if (!text) { return entries; }
    var src = String(text);
    var i = 0, n = src.length;
    while (i < n) {
      var at = src.indexOf('@', i);
      if (at === -1) { break; }
      var m = /^@(\w+)\s*[{(\s]/.exec(src.slice(at, at + 40));
      if (!m) { i = at + 1; continue; }
      var entryType = m[1].toLowerCase();
      if (entryType === 'comment' || entryType === 'preamble' || entryType === 'string') {
        i = skipBalanced(src, at);
        continue;
      }
      var openIdx = at + m[0].length - 1;
      var openCh = src[openIdx];
      var closeCh = openCh === '{' ? '}' : ')';
      var depth = 0, j = openIdx;
      for (; j < n; j++) {
        if (src[j] === openCh) { depth++; }
        else if (src[j] === closeCh) { depth--; if (depth === 0) { break; } }
      }
      var body = src.slice(openIdx + 1, j);
      i = j + 1;
      var comma = body.indexOf(',');
      if (comma === -1) { continue; }
      var key = body.slice(0, comma).trim();
      var fields = {};
      var rest = body.slice(comma + 1);
      var fieldRe = /(\w+)\s*=\s*/g, fm;
      while ((fm = fieldRe.exec(rest))) {
        var fname = fm[1].toLowerCase();
        var pos = fieldRe.lastIndex;
        var value = '';
        if (rest[pos] === '{') {
          var d2 = 0, k = pos;
          for (; k < rest.length; k++) {
            if (rest[k] === '{') { d2++; }
            else if (rest[k] === '}') { d2--; if (d2 === 0) { k++; break; } }
          }
          value = rest.slice(pos + 1, k - 1);
          fieldRe.lastIndex = k;
        } else if (rest[pos] === '"') {
          var end = rest.indexOf('"', pos + 1);
          value = rest.slice(pos + 1, end === -1 ? rest.length : end);
          fieldRe.lastIndex = end === -1 ? rest.length : end + 1;
        } else {
          var bare = /^[^,\n]+/.exec(rest.slice(pos));
          value = bare ? bare[0].trim() : '';
          fieldRe.lastIndex = pos + (bare ? bare[0].length : 0);
        }
        fields[fname] = cleanBibValue(value);
      }
      entries.push({ type: entryType, key: key, fields: fields });
    }
    return entries;
  }

  function skipBalanced(src, at) {
    var openIdx = src.indexOf('{', at);
    if (openIdx === -1) { return src.length; }
    var depth = 0;
    for (var j = openIdx; j < src.length; j++) {
      if (src[j] === '{') { depth++; }
      else if (src[j] === '}') { depth--; if (depth === 0) { return j + 1; } }
    }
    return src.length;
  }

  function cleanBibValue(v) {
    return String(v || '')
      .replace(/[{}]/g, '')
      .replace(/\\&/g, '&')
      .replace(/\\[`'"^~=.uv](\{?)([a-zA-Z])(\}?)/g, '$2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Map parsed BibTeX entries to profile publications. */
  function bibToPublications(text) {
    return parseBibTeX(text).map(function (e) {
      var f = e.fields;
      var authors = (f.author || '')
        .split(/\s+and\s+/)
        .map(function (a) { return a.trim(); })
        .filter(Boolean);
      return {
        title: f.title || '',
        authors: authors,
        venue: f.journal || f.booktitle || f.publisher || '',
        year: f.year || '',
        doi: f.doi || '',
        url: f.url || '',
        type: e.type,
        citations: null,
        source: 'bibtex'
      };
    }).filter(function (p) { return p.title; });
  }

  /* --------------------------- generic helpers --------------------------- */

  function lines(text) {
    return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); });
  }

  function nonEmpty(arr) { return arr.filter(Boolean); }

  var YEAR_RE = /(19|20)\d{2}/;
  var RANGE_RE = /((19|20)\d{2}|[A-Z][a-z]{2,8}\.?\s+(19|20)\d{2})\s*[-–—to]+\s*((19|20)\d{2}|[A-Z][a-z]{2,8}\.?\s+(19|20)\d{2}|Present|present|Current|current)/;

  function extractYears(s) {
    var m = RANGE_RE.exec(s);
    if (m) {
      var startM = YEAR_RE.exec(m[1]);
      var endM = /present|current/i.test(m[4]) ? null : YEAR_RE.exec(m[4]);
      return { startYear: startM ? startM[0] : '', endYear: endM ? endM[0] : '', current: endM === null };
    }
    var single = YEAR_RE.exec(s);
    if (single) { return { startYear: single[0], endYear: '', current: false }; }
    return null;
  }

  /* ------------------------- LinkedIn paste text ------------------------- */
  /* LinkedIn "Save to PDF" text: sections like "Experience", "Education",
   * entries as "Title\nCompany\nDates\nLocation". Heuristic, user confirms. */

  var LINKEDIN_HEADS = {
    experience: /^(work\s+)?experience$/i,
    education: /^education$/i,
    publications: /^publications?$/i,
    honors: /^(honors?|awards?|honors?\s*(&|and)\s*awards?)$/i,
    summary: /^(summary|about)$/i
  };

  function sectionMap(text, heads) {
    var ls = lines(text);
    var sections = [];
    var current = null;
    ls.forEach(function (l) {
      var matched = null;
      Object.keys(heads).forEach(function (k) { if (heads[k].test(l)) { matched = k; } });
      if (matched) {
        current = { name: matched, lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(l);
      }
    });
    return sections;
  }

  function parseLinkedInText(text) {
    var out = { summary: '', appointments: [], education: [], awards: [], publications: [] };
    var sections = sectionMap(text, LINKEDIN_HEADS);
    sections.forEach(function (s) {
      var ls = nonEmpty(s.lines);
      if (s.name === 'summary') {
        out.summary = ls.join(' ');
      } else if (s.name === 'experience') {
        // LinkedIn PDF: blocks of Title / Company / Date range / Location
        for (var i = 0; i + 1 < ls.length; i++) {
          var y = extractYears(ls[i + 1]) || extractYears(ls[i + 2] || '');
          if (y && !extractYears(ls[i])) {
            out.appointments.push({
              title: ls[i], institution: ls[i + 1] && !extractYears(ls[i + 1]) ? ls[i + 1] : '',
              department: '', location: '',
              startYear: y.startYear, endYear: y.endYear, current: y.current
            });
            i += 2;
          }
        }
      } else if (s.name === 'education') {
        ls.forEach(function (l, idx) {
          var y = extractYears(l);
          if (y && idx > 0) {
            out.education.push({ degree: '', institution: ls[idx - 1], field: '', location: '', startYear: y.startYear, endYear: y.endYear });
          }
        });
        if (!out.education.length && ls.length) {
          out.education.push({ degree: '', institution: ls[0], field: '', location: '', startYear: '', endYear: '' });
        }
      } else if (s.name === 'honors') {
        ls.forEach(function (l) { if (l.length > 3) { out.awards.push({ name: l, year: (YEAR_RE.exec(l) || [''])[0], org: '' }); } });
      } else if (s.name === 'publications') {
        ls.forEach(function (l) { if (l.length > 10) { out.publications.push({ title: l, authors: [], venue: '', year: (YEAR_RE.exec(l) || [''])[0], doi: '', url: '', type: '', citations: null, source: 'linkedin' }); } });
      }
    });
    return out;
  }

  /* ------------------------ ResearchGate paste text ------------------------ */
  /* ResearchGate profile copy: publications usually listed one per block with
   * a title line, then "Authors:", journal/year lines, DOI lines. */

  function parseResearchGateText(text) {
    var out = { publications: [], education: [], appointments: [] };
    var ls = nonEmpty(lines(text));
    var pubIdx = ls.findIndex(function (l) { return /^(publications?|research\s+items?)$/i.test(l); });
    if (pubIdx !== -1) {
      var current = null;
      for (var i = pubIdx + 1; i < ls.length; i++) {
        var l = ls[i];
        if (/^(education|experience|affiliations?|skills|stats|overview)$/i.test(l)) { break; }
        var doi = /(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/.exec(l);
        var y = YEAR_RE.exec(l);
        if (current === null) {
          current = { title: l, authors: [], venue: '', year: y ? y[0] : '', doi: doi ? doi[1] : '', url: '', type: '', citations: null, source: 'researchgate' };
        } else {
          if (doi) { current.doi = doi[1]; }
          if (y && !current.year) { current.year = y[0]; }
          if (/^(authors?:)/i.test(l)) {
            current.authors = l.replace(/^authors?:/i, '').split(/,|;/).map(function (a) { return a.trim(); }).filter(Boolean);
          } else if (!current.venue && /\b(journal|proceedings|conference|press|university|review|letters|transactions)\b/i.test(l)) {
            current.venue = l;
          }
          // A line that looks like a fresh title starts a new publication
          if (current.title && current.year && l.length > 15 && !doi && !/^(authors?:)/i.test(l) && !y && !/\b(journal|proceedings)\b/i.test(l)) {
            out.publications.push(current);
            current = { title: l, authors: [], venue: '', year: '', doi: '', url: '', type: '', citations: null, source: 'researchgate' };
          }
        }
      }
      if (current && current.title) { out.publications.push(current); }
    }
    var eduIdx = ls.findIndex(function (l) { return /^education$/i.test(l); });
    if (eduIdx !== -1) {
      for (var k = eduIdx + 1; k < Math.min(eduIdx + 12, ls.length); k++) {
        var el = ls[k];
        if (/^(experience|publications?|skills)$/i.test(el)) { break; }
        var ey = extractYears(el);
        if (ey) {
          out.education.push({ degree: '', institution: el.replace(RANGE_RE, '').trim() || (ls[k - 1] || ''), field: '', location: '', startYear: ey.startYear, endYear: ey.endYear });
        } else if (/university|college|institute|school/i.test(el)) {
          out.education.push({ degree: '', institution: el, field: '', location: '', startYear: '', endYear: '' });
        }
      }
    }
    return out;
  }

  /* ----------------------------- CV text ----------------------------- */
  /* Heuristic parser for text extracted from PDF/DOCX CVs. Detects section
   * headings and produces candidate education/appointments/publications. */

  var CV_HEADS = {
    education: /^(education|education\s+(and|&)\s+training|academic\s+(background|training|qualifications))$/i,
    appointments: /^(employment|positions?|appointments?( and positions)?|academic appointments|professional (experience|positions)|work experience|employment history)$/i,
    publications: /^(publications?|selected publications|peer[- ]reviewed publications|journal articles|bibliography|works)$/i,
    awards: /^(awards?|honors?|honors? (and|&) awards?|fellowships|grants( (and|&) awards)?|prizes)$/i,
    grants: /^(grants?|funding|research (support|funding|grants)|current (and|&) pending support)$/
  };

  function parseCvText(text) {
    var out = { name: '', email: '', orcid: '', website: '', education: [], appointments: [], publications: [], awards: [], projects: [] };
    var ls = lines(text);
    var ne = nonEmpty(ls);

    // Contact details from the first few lines
    var head = ne.slice(0, 12).join('\n');
    var em = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(head);
    if (em) { out.email = em[0]; }
    var om = /(0000-000\w-\w{4}-\w{3}[\dX])/i.exec(head) || /orcid\.org\/(0000-000\w-\w{4}-\w{3}[\dX])/i.exec(text);
    if (om) { out.orcid = om[1].toUpperCase().replace(/O/g, '0'); }
    var wm = /(https?:\/\/[^\s)]+)/.exec(head);
    if (wm && !/orcid\.org/.test(wm[1])) { out.website = wm[1]; }
    if (ne.length) {
      var firstLine = ne[0];
      if (firstLine.length < 70 && !YEAR_RE.test(firstLine) && !em || (em && firstLine.indexOf(em[0]) === -1)) {
        if (/^[A-Z][A-Za-z'.\-]*( [A-Za-z'.\-]+){0,5},?(\s?(Ph\.?D\.?|M\.?D\.?|Sc\.?D\.?|Ed\.?D\.?|Dr\.?|Prof\.?))?$/i.test(firstLine.replace(/^(Dr\.?|Prof\.?)\s+/i, ''))) {
          out.name = firstLine.replace(/,$/, '');
        }
      }
    }

    var sections = sectionMap(text, CV_HEADS);
    sections.forEach(function (s) {
      var body = nonEmpty(s.lines);
      if (s.name === 'education') {
        body.forEach(function (l) {
          var y = extractYears(l);
          var degree = /\b(Ph\.?\s?D\.?|M\.?S\.?c?\.?|M\.?A\.?|B\.?S\.?c?\.?|B\.?A\.?|M\.?B\.?A\.?|M\.?D\.?|Ed\.?D\.?|LL\.?M\.?|postdoc(toral)?)\b/i.exec(l);
          if (y || degree) {
            var clean = l.replace(RANGE_RE, '').replace(/[,;]\s*$/, '').trim();
            out.education.push({
              degree: degree ? degree[0].replace(/\./g, '').toUpperCase().replace(/^MS$|^MSC$/, 'M.S.') : '',
              institution: clean.split(/,\s*(?=[A-Z])/)[0] || clean,
              field: '', location: '',
              startYear: y ? y.startYear : '', endYear: y ? y.endYear : ''
            });
          }
        });
      } else if (s.name === 'appointments') {
        body.forEach(function (l) {
          var y = extractYears(l);
          if (y) {
            var clean = l.replace(RANGE_RE, '').replace(/[,;]\s*$/, '').trim();
            var parts = clean.split(/,\s*/).filter(Boolean);
            out.appointments.push({
              title: parts[0] || '', institution: parts[1] || (parts[0] ? '' : clean),
              department: '', location: '',
              startYear: y.startYear, endYear: y.endYear, current: y.current
            });
          }
        });
      } else if (s.name === 'publications') {
        body.forEach(function (l) {
          // numbered/bulleted list items or long lines with a year
          var stripped = l.replace(/^\[?\d+\]?[.)]\s*/, '').replace(/^[•\-–*]\s*/, '');
          if (stripped.length > 20 && YEAR_RE.test(stripped)) {
            out.publications.push({
              title: stripped.length > 300 ? stripped.slice(0, 300) : stripped,
              authors: [], venue: '', year: (YEAR_RE.exec(stripped) || [''])[0],
              doi: (/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/.exec(stripped) || [null, ''])[1],
              url: '', type: '', citations: null, source: 'cv'
            });
          }
        });
      } else if (s.name === 'awards') {
        body.forEach(function (l) {
          if (l.length > 3) {
            out.awards.push({ name: l.replace(/^[•\-–*]\s*/, ''), year: (YEAR_RE.exec(l) || [''])[0], org: '' });
          }
        });
      } else if (s.name === 'grants') {
        body.forEach(function (l) {
          var y = extractYears(l);
          if (y || YEAR_RE.test(l)) {
            out.projects.push({
              title: l.replace(RANGE_RE, '').replace(/^[•\-–*]\s*/, '').replace(/[,;]\s*$/, '').trim(),
              funder: '', grantNumber: '', role: '', status: 'current',
              amount: '', startYear: y ? y.startYear : (YEAR_RE.exec(l) || [''])[0],
              endYear: y ? y.endYear : '', personMonths: '', summary: ''
            });
          }
        });
      }
    });
    return out;
  }

  global.GrantPilotParsers = {
    parseBibTeX: parseBibTeX,
    bibToPublications: bibToPublications,
    parseLinkedInText: parseLinkedInText,
    parseResearchGateText: parseResearchGateText,
    parseCvText: parseCvText,
    extractYears: extractYears
  };
})(typeof window !== 'undefined' ? window : globalThis);
