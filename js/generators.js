/* GrantPilot — js/generators.js
 * Document generators. All document CONTENT is produced by pure builder
 * functions (profile + project details -> structured data / plain text), so
 * they run in Node for smoke tests. .docx production uses docx.js (pinned
 * CDN, lazy-loaded) via the build*Docx functions.
 * Exposed as window.GrantPilotGenerators / globalThis.GrantPilotGenerators.
 */
(function (global) {
  'use strict';

  var DOCX_URL = 'https://cdn.jsdelivr.net/npm/docx@9.8.1/dist/index.iife.min.js';
  var docxLoadPromise = null;

  function loadDocx() {
    if (global.docx) { return Promise.resolve(global.docx); }
    if (docxLoadPromise) { return docxLoadPromise; }
    docxLoadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = DOCX_URL;
      s.onload = function () {
        if (global.docx) { resolve(global.docx); }
        else { reject(new Error('docx.js loaded but did not initialize')); }
      };
      s.onerror = function () {
        docxLoadPromise = null;
        reject(new Error('Could not load docx.js from the CDN — check your internet connection.'));
      };
      document.head.appendChild(s);
    });
    return docxLoadPromise;
  }

  /* --------------------------- shared helpers --------------------------- */

  function fullName(p) {
    return (p.basics.fullName || [p.basics.givenName, p.basics.familyName].filter(Boolean).join(' ')).trim() || 'The applicant';
  }

  function firstName(p) {
    return p.basics.givenName || fullName(p).split(' ')[0];
  }

  function currentRole(p) {
    var b = p.basics;
    var bits = [];
    if (b.title) { bits.push(b.title); }
    if (b.department && b.institution) { bits.push(b.department + ' at ' + b.institution); }
    else if (b.institution) { bits.push(b.institution); }
    return bits.join(', ');
  }

  function formatCitation(pub) {
    var authors = (pub.authors && pub.authors.length) ? pub.authors.join(', ') : '';
    var parts = [];
    if (authors) { parts.push(authors); }
    if (pub.year) { parts.push('(' + pub.year + ').'); }
    parts.push(pub.title + '.');
    if (pub.venue) { parts.push(pub.venue + '.'); }
    if (pub.doi) { parts.push('https://doi.org/' + pub.doi); }
    else if (pub.url) { parts.push(pub.url); }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function sortedPubs(profile) {
    return profile.publications.slice().sort(function (a, b) {
      return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
    });
  }

  function topPubs(profile, n) {
    return sortedPubs(profile).filter(function (p) { return p.title; }).slice(0, n || 5);
  }

  function trimToWords(text, n) {
    var words = String(text).split(/\s+/).filter(Boolean);
    if (words.length <= n) { return text; }
    var cut = words.slice(0, n).join(' ');
    var lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf(';'));
    return lastStop > n * 3 ? cut.slice(0, lastStop + 1) : cut.replace(/[,;:]$/, '') + '.';
  }

  function countWords(text) {
    return String(text || '').split(/\s+/).filter(Boolean).length;
  }

  /* ------------------------------ author bios ------------------------------ */

  /* style: 'grant' | 'journal'; targetWords: 50 | 100 | 200 */
  function buildBio(profile, project, targetWords, style) {
    var p = profile, b = p.basics;
    var name = fullName(p);
    var role = currentRole(p);
    var sentences = [];

    sentences.push(name + (role ? ' is ' + role : '') + '.');
    if (p.bioNotes) { sentences.push(trimToWords(p.bioNotes, 40)); }
    if (project && project.title) {
      sentences.push((style === 'journal' ? 'Their' : firstName(p) + '’s') + ' current research focuses on ' +
        (project.title.charAt(0).toLowerCase() + project.title.slice(1)).replace(/\.$/, '') + '.');
    }
    if (p.metrics && p.metrics.citedBy != null && targetWords >= 100) {
      var stat = 'Their published work has been cited ' + p.metrics.citedBy + ' times' +
        (p.metrics.hIndex != null ? ' (h-index ' + p.metrics.hIndex + ')' : '') + ' (OpenAlex).';
      sentences.push(stat);
    }
    var pubs = topPubs(p, targetWords >= 100 ? 2 : 1);
    if (pubs.length && targetWords >= 50) {
      sentences.push('Representative work includes ' + pubs.map(function (x) {
        return '“' + x.title + '”' + (x.venue ? ' (' + x.venue + (x.year ? ', ' + x.year : '') + ')' : (x.year ? ' (' + x.year + ')' : ''));
      }).join(' and ') + '.');
    }
    if (targetWords >= 200) {
      var edu = p.education[0];
      if (edu && (edu.degree || edu.institution)) {
        sentences.push(name.split(' ')[0] + ' earned ' + (edu.degree ? 'a ' + edu.degree : 'their degree') +
          (edu.institution ? ' from ' + edu.institution : '') + (edu.endYear ? ' in ' + edu.endYear : '') + '.');
      }
      var awards = p.awards.slice(0, 2).map(function (a) { return a.name; }).filter(Boolean);
      if (awards.length) { sentences.push('Recognition includes ' + awards.join(' and ') + '.'); }
      var cur = p.projects.filter(function (pr) { return pr.status === 'current' && pr.funder; });
      if (cur.length) {
        sentences.push('Current support includes funding from ' + cur.map(function (c) { return c.funder; }).slice(0, 3).join(', ') + '.');
      }
      sentences.push((style === 'journal' ? 'Correspondence' : 'For correspondence') +
        (b.email ? ': ' + b.email : ' contact ' + name) + '.');
    }
    var text = sentences.join(' ').replace(/\s+/g, ' ').trim();
    return trimToWords(text, targetWords);
  }

  /* --------------------------- NSF biosketch --------------------------- */
  /* NSPM-33 Common Form sections (per PAPPG 24-1). GrantPilot pre-fills the
   * content; the certified final PDF must still be generated in SciENcv. */

  function buildNsfBiosketchData(profile) {
    var b = profile.basics;
    return {
      identifying: {
        name: fullName(profile),
        orcid: b.orcid || '',
        positionTitle: b.title || ''
      },
      organization: {
        organization: b.institution || '',
        location: [b.city, b.country].filter(Boolean).join(', ')
      },
      professionalPreparation: profile.education.map(function (e) {
        return {
          institution: e.institution, location: e.location,
          degree: e.degree, field: e.field,
          startYear: e.startYear, endYear: e.endYear
        };
      }),
      appointments: profile.appointments.slice().sort(function (a, b2) {
        return (parseInt(b2.startYear, 10) || 0) - (parseInt(a.startYear, 10) || 0);
      }).map(function (a) {
        return {
          title: a.title, organization: a.institution,
          department: a.department, location: a.location,
          startYear: a.startYear, endYear: a.current ? 'present' : a.endYear
        };
      }),
      productsRelated: topPubs(profile, 5).map(formatCitation),
      productsOther: sortedPubs(profile).slice(5, 10).map(formatCitation),
      certification: 'I certify that the information provided is current, accurate, and complete. This includes, but is not limited to, information related to domestic and foreign appointments and positions. ' +
        (profile.basics.fullName ? '— ' + profile.basics.fullName : ''),
      disclaimer: 'Draft pre-filled by GrantPilot. The official NSF Biographical Sketch must be generated and certified in SciENcv (https://www.ncbi.nlm.nih.gov/sciencv/) — SciENcv has been mandatory since 23 October 2023.'
    };
  }

  /* --------------------------- NIH biosketch --------------------------- */
  /* 5-page limit. Post-Jan 2026 Common Form + Biosketch Supplement structure;
   * the personal statement / contributions live in the Supplement. */

  function buildNihBiosketchData(profile, project) {
    var b = profile.basics;
    var name = fullName(profile);
    var stmt = name + (currentRole(profile) ? ' is ' + currentRole(profile) : '') + '. ';
    if (profile.bioNotes) { stmt += trimToWords(profile.bioNotes, 60) + ' '; }
    if (project && project.title) {
      stmt += 'For the proposed project (“' + project.title + '”), this background provides the expertise needed to lead the work described in the Specific Aims. ';
    }
    var pubs = topPubs(profile, 4);
    if (pubs.length) {
      stmt += 'Relevant publications: ' + pubs.map(function (x) { return '“' + x.title + '” (' + (x.year || 'n.d.') + ')'; }).join('; ') + '.';
    }
    var positions = profile.appointments.slice().sort(function (a, b2) {
      return (parseInt(b2.startYear, 10) || 0) - (parseInt(a.startYear, 10) || 0);
    }).map(function (a) {
      return {
        years: [a.startYear, a.current ? 'present' : a.endYear].filter(Boolean).join('–'),
        title: a.title, institution: a.institution, department: a.department, location: a.location
      };
    });
    var honors = profile.awards.map(function (a2) {
      return { year: a2.year, name: a2.name, org: a2.org };
    });
    var contributions = [];
    if (pubs.length) {
      contributions.push({
        summary: 'Research track record in the areas underlying this application' +
          (profile.metrics && profile.metrics.citedBy != null ? ' — ' + profile.metrics.citedBy + ' citations (OpenAlex)' : '') + '.',
        citations: pubs.map(formatCitation)
      });
    }
    return {
      header: {
        name: name, orcid: b.orcid || '',
        positionTitle: b.title || '', institution: b.institution || ''
      },
      personalStatement: stmt.trim(),
      positions: positions,
      honors: honors,
      contributions: contributions,
      disclaimer: 'Draft pre-filled by GrantPilot. For due dates on/after 25 Jan 2026, NIH requires the SciENcv-generated Common Form plus the Biosketch Supplement (https://grants.nih.gov/grants/forms/biosketch.htm). Transfer this content into SciENcv and certify it there.'
    };
  }

  /* --------------------- current & pending support --------------------- */

  function buildSupportRows(projects, thisProjectTitle) {
    return (projects || []).map(function (p) {
      return {
        title: p.title || '',
        status: p.status === 'pending' ? 'Pending' : 'Current',
        source: p.funder || '',
        awardNumber: p.grantNumber || '',
        amount: p.amount || '',
        period: [p.startYear, p.endYear].filter(Boolean).join(' – '),
        personMonths: p.personMonths || '',
        role: p.role || '',
        overlap: (thisProjectTitle && p.title && p.title === thisProjectTitle)
          ? 'This is the project being proposed.'
          : (p.summary ? trimToWords(p.summary, 30) : 'No scientific or budgetary overlap with the proposed project.')
      };
    });
  }

  /* ------------------------------- letters ------------------------------- */

  function dateLine() {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function buildLetterOfIntent(profile, project, grant) {
    var b = profile.basics, name = fullName(profile);
    var funderName = grant ? grant.funder : '[Funder]';
    return [
      dateLine(),
      '',
      'Dear Program Director,',
      '',
      'I am writing to express my intent to submit a proposal to ' + funderName + (grant ? ' (' + grant.name + ')' : '') +
      (project.title ? ' for the project “' + project.title + '.”' : '.'),
      '',
      project.abstract
        ? trimToWords(project.abstract, 120)
        : '[One short paragraph: the problem, why it matters, and the core idea — roughly 100–150 words.]',
      '',
      'The proposed work is expected to run ' + (project.duration || '[duration]') +
      ' with a total budget of approximately ' + (project.budget || '[amount]') + '. ' +
      (project.collaborators ? 'Key personnel include ' + project.collaborators + '. ' : '') +
      'I would be glad to provide any additional information the Foundation requires at this stage.',
      '',
      'Sincerely,',
      '',
      name + (b.title ? ', ' + b.title : ''),
      b.institution || '',
      b.email || ''
    ].join('\n');
  }

  function buildCoverLetter(profile, project, grant) {
    var b = profile.basics, name = fullName(profile);
    return [
      dateLine(),
      '',
      'Dear Program Officer,',
      '',
      'Please find enclosed our proposal' + (project.title ? ', “' + project.title + ',”' : '') +
      ' submitted to ' + (grant ? grant.name + ' (' + grant.funder + ')' : '[program name]') + '.',
      '',
      project.abstract ? trimToWords(project.abstract, 100) : '[One paragraph summarizing the project’s aims and significance.]',
      '',
      'The proposal addresses the program’s review criteria as follows:',
      '  - Intellectual/scientific merit: [one sentence].',
      '  - Broader/societal impact: [one sentence].',
      '  - Team qualifications: [one sentence].',
      '',
      'All required documents — including biosketches, support statements, and the budget — are included as specified in the guidelines. Please do not hesitate to contact me with any questions.',
      '',
      'Sincerely,',
      '',
      name + (b.title ? ', ' + b.title : ''),
      b.institution || '',
      b.email || ''
    ].join('\n');
  }

  function buildCollaborationLetter(profile, project) {
    return [
      dateLine(),
      '',
      'Dear [Collaborator name],',
      '',
      'I am preparing a proposal' + (project.title ? ', “' + project.title + ',”' : '') +
      ' and would like to invite you to join the project as a collaborator' +
      (project.duration ? ' over its planned ' + project.duration + ' duration' : '') + '.',
      '',
      'Your role would involve [describe specific contribution — e.g., access to the dataset, methodological expertise in X, co-supervision of the graduate student]. I estimate the commitment at [person-months or hours] per year.',
      '',
      project.abstract ? 'Briefly, the project: ' + trimToWords(project.abstract, 80) : '[One or two sentences summarizing the project.]',
      '',
      'If you are willing to participate, a short letter of commitment on your institutional letterhead — confirming your role and your enthusiasm for the collaboration — would be needed by [date]. I am happy to draft it for your review.',
      '',
      'With best regards,',
      '',
      fullName(profile),
      currentRole(profile),
      profile.basics.email || ''
    ].join('\n');
  }

  function buildSupportLetterTemplate(profile, project, grant) {
    return [
      '[On collaborator’s institutional letterhead]',
      '',
      dateLine(),
      '',
      'To whom it may concern at ' + (grant ? grant.funder : '[Funder]') + ',',
      '',
      'I am writing to confirm my enthusiastic collaboration with ' + fullName(profile) +
      (profile.basics.institution ? ' of ' + profile.basics.institution : '') +
      ' on the proposed project' + (project.title ? ' “' + project.title + '”' : '') + '.',
      '',
      'My contribution will be [specific tasks, data, facilities, or expertise]. I commit [X person-months / Y hours] per project year to this work, at [no cost to the project / with the budgeted effort].',
      '',
      'I have worked with the PI on [context, if any] and am confident the team can deliver the proposed research. I fully support this application.',
      '',
      'Sincerely,',
      '[Name, title]',
      '[Department, institution]',
      '[Email]'
    ].join('\n');
  }

  /* ------------------------- narrative skeletons ------------------------- */

  function buildNsfSummarySkeleton(profile, project) {
    return [
      'Overview',
      '[One paragraph: what you will do, the objectives, and the methods in plain language. Project: ' + (project.title || '[title]') + '.]',
      '',
      'Intellectual Merit',
      '[Describe the potential to advance knowledge — what new theory, method, data, or capability results?]',
      '',
      'Broader Impacts',
      '[Describe the potential to benefit society: education, outreach, broadening participation, infrastructure, dissemination.]',
      '',
      '— NSF Project Summary: one page total; each heading on its own line with no other text. GrantPilot draft for ' + fullName(profile) + '.'
    ].join('\n');
  }

  function buildNihAimsSkeleton(profile, project) {
    return [
      'Specific Aims — ' + (project.title || '[Project title]'),
      '',
      '[Paragraph 1: the problem, the gap in knowledge, and why it matters — 4–5 sentences. Establish significance and your unique angle.]',
      '',
      project.abstract ? 'Context: ' + trimToWords(project.abstract, 60) : '',
      '',
      'Central hypothesis: [one sentence].',
      '',
      'Aim 1. [Title]. [2–3 sentences: what will be done and the expected outcome.]',
      '',
      'Aim 2. [Title]. [2–3 sentences: independent of Aim 1’s result.]',
      '',
      'Aim 3 (optional for R21). [Title]. [2–3 sentences.]',
      '',
      '[Closing paragraph: expected impact if the aims are achieved.]',
      '',
      '— NIH Specific Aims: exactly 1 page. Draft for ' + fullName(profile) + '.'
    ].filter(function (l, i, arr) { return l !== '' || arr[i - 1] !== ''; }).join('\n');
  }

  function buildErcSynopsisSkeleton(profile, project) {
    return [
      'Extended Synopsis (ERC Part I) — ' + (project.title || '[Project title]'),
      '',
      '1. The frontier problem. [What is the scientific challenge, and why is it beyond the current state of the art?]',
      '2. Why now, why me. [PI: ' + fullName(profile) + ' — summarize the track record that makes this feasible; panels see this 5-page synopsis and your CV & Track Record only at Step 1.]',
      '3. Overall research strategy. [Objectives and approach at a strategic level; feasibility details belong in Part II.]',
      '4. Expected ground-breaking impact. [What changes in the field if this succeeds?]',
      '',
      '— ERC Part I of the Scientific Proposal: 5 pages maximum (CV & Track Record: 4 pages).'
    ].join('\n');
  }

  function buildCustomSkeleton(docDef, profile, project) {
    return [
      docDef.name + (project && project.title ? ' — ' + project.title : ''),
      docDef.limit ? '[Limit: ' + docDef.limit + (docDef.format ? '; format: ' + docDef.format : '') + ']' : (docDef.format ? '[Format: ' + docDef.format + ']' : ''),
      docDef.notes ? '[' + docDef.notes + ']' : '',
      '',
      '[Draft your content here. Author: ' + fullName(profile) + (profile.basics.institution ? ', ' + profile.basics.institution : '') + '.]',
      project && project.abstract ? '' : '',
      project && project.abstract ? 'Project context: ' + trimToWords(project.abstract, 80) : ''
    ].filter(function (l) { return l !== undefined; }).join('\n').replace(/\n{3,}/g, '\n\n');
  }

  global.GrantPilotGenerators = {
    DOCX_URL: DOCX_URL,
    loadDocx: loadDocx,
    formatCitation: formatCitation,
    countWords: countWords,
    trimToWords: trimToWords,
    buildBio: buildBio,
    buildNsfBiosketchData: buildNsfBiosketchData,
    buildNihBiosketchData: buildNihBiosketchData,
    buildSupportRows: buildSupportRows,
    buildLetterOfIntent: buildLetterOfIntent,
    buildCoverLetter: buildCoverLetter,
    buildCollaborationLetter: buildCollaborationLetter,
    buildSupportLetterTemplate: buildSupportLetterTemplate,
    buildNsfSummarySkeleton: buildNsfSummarySkeleton,
    buildNihAimsSkeleton: buildNihAimsSkeleton,
    buildErcSynopsisSkeleton: buildErcSynopsisSkeleton,
    buildCustomSkeleton: buildCustomSkeleton
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* --------------------------- docx generation --------------------------- */
/* Second IIFE extending GrantPilotGenerators with .docx builders. Requires
 * the docx.js global (lazy-loaded via loadDocx) at call time. */
(function (global) {
  'use strict';

  var G = global.GrantPilotGenerators;

  function d() { return global.docx; }

  function baseStyles() {
    return {
      default: { document: { run: { font: 'Times New Roman', size: 22 } } } // 11pt
    };
  }

  function h1(text) {
    var dd = d();
    return new dd.Paragraph({ text: text, heading: dd.HeadingLevel.HEADING_1, spacing: { before: 280, after: 140 } });
  }
  function h2(text) {
    var dd = d();
    return new dd.Paragraph({ text: text, heading: dd.HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } });
  }
  function para(text, opts) {
    var dd = d();
    return new dd.Paragraph(Object.assign({ text: text, spacing: { after: 120 } }, opts || {}));
  }
  function note(text) {
    var dd = d();
    return new dd.Paragraph({
      children: [new dd.TextRun({ text: text, italics: true, size: 18, color: '6B6357' })],
      spacing: { before: 300, after: 60 }
    });
  }
  function bullet(text) {
    var dd = d();
    return new dd.Paragraph({ text: text, bullet: { level: 0 }, spacing: { after: 60 } });
  }
  function title(text) {
    var dd = d();
    return new dd.Paragraph({ text: text, heading: dd.HeadingLevel.TITLE, spacing: { after: 200 } });
  }

  function finishDoc(children, docTitle) {
    var dd = d();
    return new dd.Document({
      creator: 'GrantPilot',
      title: docTitle,
      styles: baseStyles(),
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: children
      }]
    });
  }

  /* NSF biosketch content (pre-SciENcv draft). */
  function buildNsfBiosketchDocx(data) {
    var c = [];
    c.push(title('Biographical Sketch — ' + data.identifying.name));
    c.push(note(data.disclaimer));
    c.push(h1('Identifying Information'));
    c.push(para('Name: ' + data.identifying.name));
    if (data.identifying.orcid) { c.push(para('ORCID iD: ' + data.identifying.orcid)); }
    if (data.identifying.positionTitle) { c.push(para('Position Title: ' + data.identifying.positionTitle)); }
    c.push(h1('Organization and Location'));
    c.push(para(data.organization.organization || '[Organization]'));
    if (data.organization.location) { c.push(para(data.organization.location)); }
    c.push(h1('Professional Preparation'));
    if (data.professionalPreparation.length) {
      data.professionalPreparation.forEach(function (e) {
        c.push(bullet([e.degree, e.field, e.institution, e.location, [e.startYear, e.endYear].filter(Boolean).join('–')]
          .filter(Boolean).join(', ')));
      });
    } else { c.push(para('[Add education and postdoctoral training, reverse chronological.]')); }
    c.push(h1('Appointments and Positions'));
    if (data.appointments.length) {
      data.appointments.forEach(function (a) {
        c.push(bullet([a.title, a.department, a.organization, a.location, [a.startYear, a.endYear].filter(Boolean).join('–')]
          .filter(Boolean).join(', ')));
      });
    } else { c.push(para('[Add appointments, reverse chronological.]')); }
    c.push(h1('Products'));
    c.push(h2('Products Most Closely Related to the Proposed Project (up to 5)'));
    if (data.productsRelated.length) { data.productsRelated.forEach(function (p) { c.push(bullet(p)); }); }
    else { c.push(para('[Add up to 5 products.]')); }
    c.push(h2('Other Significant Products (up to 5)'));
    if (data.productsOther.length) { data.productsOther.forEach(function (p) { c.push(bullet(p)); }); }
    else { c.push(para('[Add up to 5 other significant products.]')); }
    c.push(h1('Certification'));
    c.push(para(data.certification));
    return finishDoc(c, 'NSF Biographical Sketch — ' + data.identifying.name);
  }

  /* NIH biosketch content (pre-SciENcv draft). */
  function buildNihBiosketchDocx(data) {
    var c = [];
    c.push(title('Biographical Sketch — ' + data.header.name));
    c.push(note(data.disclaimer));
    c.push(para([data.header.positionTitle, data.header.institution].filter(Boolean).join(', ')));
    if (data.header.orcid) { c.push(para('ORCID iD: ' + data.header.orcid)); }
    c.push(h1('A. Personal Statement'));
    c.push(para(data.personalStatement));
    c.push(h1('B. Positions, Scientific Appointments, and Honors'));
    if (data.positions.length) {
      data.positions.forEach(function (p) {
        c.push(bullet([p.years, p.title, p.department, p.institution, p.location].filter(Boolean).join(', ')));
      });
    } else { c.push(para('[Add positions, reverse chronological.]')); }
    if (data.honors.length) {
      c.push(h2('Honors'));
      data.honors.forEach(function (h) { c.push(bullet([h.year, h.name, h.org].filter(Boolean).join(' — '))); });
    }
    c.push(h1('C. Contributions to Science'));
    if (data.contributions.length) {
      data.contributions.forEach(function (contrib, i) {
        c.push(h2('Contribution ' + (i + 1)));
        c.push(para(contrib.summary));
        contrib.citations.forEach(function (cit) { c.push(bullet(cit)); });
      });
    } else { c.push(para('[Describe up to 5 contributions, each with up to 4 citations.]')); }
    return finishDoc(c, 'NIH Biographical Sketch — ' + data.header.name);
  }

  /* Current & Pending (Other) Support table. */
  function buildSupportDocx(name, rows) {
    var dd = d();
    var headCells = ['Project Title', 'Status', 'Source of Support', 'Award #', 'Total Award', 'Period', 'Person-Months', 'Role', 'Overlap with Proposal']
      .map(function (t) {
        return new dd.TableCell({
          children: [new dd.Paragraph({ children: [new dd.TextRun({ text: t, bold: true, size: 18 })] })],
          shading: { fill: 'F3E4DC' }
        });
      });
    var bodyRows = rows.map(function (r) {
      return new dd.TableRow({
        children: [r.title, r.status, r.source, r.awardNumber, r.amount, r.period, r.personMonths, r.role, r.overlap]
          .map(function (v) {
            return new dd.TableCell({ children: [new dd.Paragraph({ children: [new dd.TextRun({ text: String(v || ''), size: 18 })] })] });
          })
      });
    });
    var table = new dd.Table({
      rows: [new dd.TableRow({ children: headCells, tableHeader: true })].concat(bodyRows),
      width: { size: 100, type: dd.WidthType.PERCENTAGE }
    });
    var children = [
      title('Current and Pending (Other) Support — ' + name),
      note('Draft table generated by GrantPilot. The official NSF/NIH Current and Pending (Other) Support document must be generated and certified in SciENcv (https://www.ncbi.nlm.nih.gov/sciencv/). Use this as your working checklist of entries.'),
      table
    ];
    return finishDoc(children, 'Current and Pending Support — ' + name);
  }

  /* Generic text document (bios, letters, skeletons). */
  function buildTextDocx(docTitle, text) {
    var children = [title(docTitle)];
    String(text || '').split(/\n{2,}/).forEach(function (block) {
      var lines = block.split('\n');
      if (lines.length === 1) {
        children.push(para(lines[0]));
      } else {
        lines.forEach(function (l) { children.push(para(l, { spacing: { after: 40 } })); });
        children.push(para('', { spacing: { after: 80 } }));
      }
    });
    return finishDoc(children, docTitle);
  }

  /* Returns Promise<Blob>. */
  function exportDocx(documentObj) {
    return G.loadDocx().then(function () {
      return global.docx.Packer.toBlob(documentObj);
    });
  }

  G.buildNsfBiosketchDocx = buildNsfBiosketchDocx;
  G.buildNihBiosketchDocx = buildNihBiosketchDocx;
  G.buildSupportDocx = buildSupportDocx;
  G.buildTextDocx = buildTextDocx;
  G.exportDocx = exportDocx;
})(typeof window !== 'undefined' ? window : globalThis);
