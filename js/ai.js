/* GrantPilot — js/ai.js
 * Optional AI assist (BYO key, OpenAI-compatible chat-completions endpoint).
 * Settings are stored ONLY in this browser's localStorage and the key is sent
 * ONLY to the endpoint the user configures. Every feature has a template
 * fallback, so the app is fully functional without a key.
 * Exposed as window.GrantPilotAI.
 */
(function (global) {
  'use strict';

  var LS_KEY = 'grantpilot.ai.v1';

  function getSettings() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      var s = raw ? JSON.parse(raw) : {};
      return { endpoint: s.endpoint || '', model: s.model || '', key: s.key || '' };
    } catch (e) { return { endpoint: '', model: '', key: '' }; }
  }

  function saveSettings(s) {
    localStorage.setItem(LS_KEY, JSON.stringify({
      endpoint: String(s.endpoint || '').trim(),
      model: String(s.model || '').trim(),
      key: String(s.key || '').trim()
    }));
  }

  function isConfigured() {
    var s = getSettings();
    return !!(s.endpoint && s.key);
  }

  function clearSettings() { localStorage.removeItem(LS_KEY); }

  /* One chat-completions call; resolves to the assistant message text. */
  function chat(systemPrompt, userPrompt) {
    var s = getSettings();
    if (!s.endpoint || !s.key) {
      return Promise.reject(new Error('No AI endpoint configured. The template output is already shown; configure a key in the AI tab for assisted drafting.'));
    }
    var url = s.endpoint.replace(/\/+$/, '') + '/chat/completions';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.key },
      body: JSON.stringify({
        model: s.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4
      })
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('AI endpoint returned HTTP ' + r.status + (t ? ' — ' + t.slice(0, 200) : ''));
        });
      }
      return r.json();
    }).then(function (j) {
      var msg = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!msg) { throw new Error('AI endpoint returned an unexpected response shape.'); }
      return msg.trim();
    });
  }

  /* Prompt builders used by the document generators' "AI assist" buttons. */
  function profileDigest(profile, project) {
    var b = profile.basics;
    var pubs = profile.publications.slice(0, 8).map(function (p) {
      return '- ' + p.title + (p.venue ? ' (' + p.venue + (p.year ? ', ' + p.year : '') + ')' : '');
    }).join('\n');
    return [
      'Name: ' + (b.fullName || ''),
      'Role: ' + [b.title, b.department, b.institution].filter(Boolean).join(', '),
      'ORCID: ' + (b.orcid || 'n/a'),
      'Research notes: ' + (profile.bioNotes || 'n/a'),
      'Keywords: ' + (profile.keywords || []).join(', '),
      'Publications (sample):\n' + (pubs || 'n/a'),
      'Metrics: ' + (profile.metrics ? JSON.stringify(profile.metrics) : 'n/a'),
      'Project title: ' + (project && project.title || 'n/a'),
      'Project abstract/aims: ' + (project && project.abstract || 'n/a'),
      'Budget category: ' + (project && project.budget || 'n/a'),
      'Collaborators: ' + (project && project.collaborators || 'n/a')
    ].join('\n');
  }

  var SYS = 'You are an expert academic grant-writing assistant. Write concise, truthful, funder-appropriate text. Never invent credentials, results, or citations. Use only the facts provided.';

  function draftBio(profile, project, targetWords, style) {
    return chat(SYS,
      'Write a ' + targetWords + '-word ' + (style === 'journal' ? 'journal author bio' : 'grant-style professional bio') +
      ' in third person for the researcher below. Hard word limit: ' + targetWords + ' words.\n\n' + profileDigest(profile, project));
  }

  function refineText(kind, currentText, profile, project, grant) {
    return chat(SYS,
      'Improve the following ' + kind + (grant ? ' for ' + grant.funder + ' (' + grant.name + ')' : '') +
      '. Keep every factual placeholder like [bracketed] intact. Return only the revised document text.\n\nCONTEXT\n' +
      profileDigest(profile, project) + '\n\nCURRENT DRAFT\n' + currentText);
  }

  global.GrantPilotAI = {
    getSettings: getSettings,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    isConfigured: isConfigured,
    chat: chat,
    draftBio: draftBio,
    refineText: refineText
  };
})(typeof window !== 'undefined' ? window : globalThis);
