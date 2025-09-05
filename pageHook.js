// Runs in page context. Be polite: never break native fetch/XHR and never consume bodies unless cloned.
// Idempotent install
(function () {
  if (window.__LI_APPLICANT_HOOK_INSTALLED__) return;
  window.__LI_APPLICANT_HOOK_INSTALLED__ = true;

  console.debug('[LI Applicant Counter PageHook] installed');

  const intercepted = new Map();

  function extractApplicantCount(data) {
    try {
      const direct =
        data?.data?.jobInsightsV2?.topApplicantCounts?.numOfApplicants ??
        data?.data?.applies ?? data?.applies;
      if (typeof direct === 'number') return direct;

      if (Array.isArray(data?.included)) {
        const jp = data.included.find(x => (x?.$type || '').includes('jobs.JobPosting') && typeof x?.applies === 'number');
        if (jp?.applies != null) return jp.applies;
      }
    } catch {}
    return null;
  }

  function maybeHandleResponse(url, response, bodyReader) {
    try {
      if (typeof url !== 'string') return;
      if (!/\/voyager\/api\/jobs\/jobPostings\/\d+/.test(url)) return;
      if (!response || !response.ok) return;

      const ct = response.headers && response.headers.get && response.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) return;

      bodyReader().then(data => {
        const jobId = (url.match(/jobPostings\/(\d+)/) || [])[1];
        if (!jobId) return;
        const count = extractApplicantCount(data);
        if (typeof count === 'number') {
          intercepted.set(jobId, count);
          window.postMessage({ type: 'LINKEDIN_API_RESPONSE', jobId, count }, '*');
        }
      }).catch(() => { /* ignore parse errors */ });
    } catch {
      // Never throw
    }
  }

  // XHR
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__li_url = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', () => {
      try {
        if (!this.responseType || this.responseType === '' || this.responseType === 'text') {
          const text = this.responseText;
          if (!text) return;
          maybeHandleResponse(this.__li_url, { ok: true, headers: { get: () => 'application/json' } }, async () => JSON.parse(text));
        }
      } catch { /* never break the page */ }
    });
    return origSend.apply(this, arguments);
  };

  // fetch
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const [arg0] = args;
    const url = typeof arg0 === 'string' ? arg0 : (arg0 && arg0.url);
    return origFetch.apply(this, args).then(res => {
      try {
        const clone = res.clone();
        maybeHandleResponse(url, res, async () => {
          const text = await clone.text();
          try { return JSON.parse(text); } catch { return {}; }
        });
      } catch { /* ignore */ }
      return res;
    });
  };

  // Respond to content script request
  window.addEventListener('message', (evt) => {
    const d = evt.data;
    if (d && d.type === 'REQUEST_APPLICANT_COUNT') {
      const count = intercepted.get(d.jobId);
      if (typeof count === 'number') {
        window.postMessage({ type: 'LINKEDIN_API_RESPONSE', jobId: d.jobId, count }, '*');
      }
    }
  });
})();
