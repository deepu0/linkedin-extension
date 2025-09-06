console.debug('[LI Applicant Counter] content.js loaded');

let enabled = false;
let hookInjected = false;
let currentJobId = null;
let lastUrl = location.href;
let debTimer = null;
const PROCESS_DEBOUNCE_MS = 700;
const countsCache = new Map();

function debounceProcess() {
  clearTimeout(debTimer);
  debTimer = setTimeout(processCurrentPage, PROCESS_DEBOUNCE_MS);
}

function extractJobId(url = window.location.href) {
  const patterns = [/\/jobs\/view\/(\d+)/, /currentJobId=(\d+)/, /\/jobs\/collections\/.*\/(\d+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractApplicantCount(data) {
  try {
    // Common locations
    const direct =
      data?.data?.jobInsightsV2?.topApplicantCounts?.numOfApplicants ??
      data?.data?.applies ??
      data?.applies;

    if (typeof direct === 'number') return direct;

    // Sometimes in "included"
    const maybe = Array.isArray(data?.included) ? data.included.find(x =>
      (x?.$type || '').includes('jobs.JobPosting') && typeof x?.applies === 'number'
    ) : null;
    if (maybe?.applies != null) return maybe.applies;
  } catch {}
  return null;
}

async function getCSRFToken() {
  try {
    const cookies = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getCookies', domain: 'www.linkedin.com' }, resolve);
    });
    const js = cookies?.find(c => c.name === 'JSESSIONID') || cookies?.[0];
    return js?.value ? js.value.replace(/"/g, '') : null;
  } catch {
    const val = document.cookie.split('; ').find(r => r.startsWith('JSESSIONID='))?.split('=')[1];
    return val ? val.replace(/"/g, '') : null;
  }
}

async function fetchApplicantCount(jobId) {
  try {
    const csrf = await getCSRFToken();
    if (!csrf) return null;

    const url = `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65`;
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'csrf-token': csrf,
        'x-restli-protocol-version': '2.0.0',
        'accept': 'application/vnd.linkedin.normalized+json+2.1'
      },
      // Avoid LinkedIn prefetch heuristics
      cache: 'no-store'
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data ? extractApplicantCount(data) : null;
  } catch (e) {
    console.debug('[LI Applicant Counter] fetch error', e);
    return null;
  }
}

function ensureBadge() {
  let badge = document.getElementById('linkedin-exact-applicant-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'linkedin-exact-applicant-badge';
    badge.className = 'linkedin-exact-applicant-badge';
    document.body.appendChild(badge);
  }
  return badge;
}

function hideBadge() {
  let fancyBadge = fitLevelDiv.querySelector('.li-applicant-fancy-badge');
  if (fancyBadge) fancyBadge.style.display = 'none';

  const badge = document.getElementById('linkedin-exact-applicant-badge');
  if (badge) badge.style.display = 'none';
}

function updateUI(count) {
  
  if (!enabled || typeof count !== 'number') return;

  // const badge = ensureBadge();
  // const prev = badge.textContent;
  // badge.textContent = `Exact applicants: ${count.toLocaleString()}`;
  // badge.style.display = 'block';
  // if (prev && prev !== badge.textContent) {
  //   badge.classList.remove('updated'); // restart animation
  //   void badge.offsetWidth;
  //   badge.classList.add('updated');
  // }

   const fitLevelDiv = document.querySelector('.job-details-fit-level-preferences');
  if (fitLevelDiv) {
    let fancyBadge = fitLevelDiv.querySelector('.li-applicant-fancy-badge');
    const fancyText = `👥 ${count.toLocaleString()} applicants`;
    if (!fancyBadge) {
      fancyBadge = document.createElement('span');
      fancyBadge.className = 'li-applicant-fancy-badge';
      fancyBadge.textContent = fancyText;
      fancyBadge.style.cssText = `
        display: inline-block;
        margin-left: 8px;
        padding: 4px 12px;
        border-radius: 16px;
        background: linear-gradient(90deg, #0073b1 0%, #00c6fb 100%);
        color: #fff;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        user-select: none;
        pointer-events: none;
      `;
      fitLevelDiv.appendChild(fancyBadge);
    } else {
      const prevFancy = fancyBadge.textContent;
      if (prevFancy !== fancyText) {
        fancyBadge.textContent = fancyText;
        fancyBadge.classList.remove('updated'); // restart animation
        void fancyBadge.offsetWidth;
        fancyBadge.classList.add('updated');
      }
    }
  }


}

function processCurrentPage() {
  if (!enabled) return;

  const jobId = extractJobId();
  if (!jobId) {
    hideBadge();
    return;
  }

  if (countsCache.has(jobId)) {
    currentJobId = jobId;
    updateUI(countsCache.get(jobId));
    return;
  }

  // Ask page hook first (fast path)
  requestIntercepted(jobId).then(intercepted => {
    if (typeof intercepted === 'number') {
      countsCache.set(jobId, intercepted);
      currentJobId = jobId;
      updateUI(intercepted);
      return;
    }
    // Fallback to direct fetch
    fetchApplicantCount(jobId).then(count => {
      if (typeof count === 'number') {
        countsCache.set(jobId, count);
        if (jobId === extractJobId()) updateUI(count);
      }
    });
  });
}

function requestIntercepted(jobId) {
  return new Promise(resolve => {
    const handler = (evt) => {
      const d = evt.data;
      if (d && d.type === 'LINKEDIN_API_RESPONSE' && d.jobId === jobId) {
        window.removeEventListener('message', handler);
        resolve(d.count);
      }
    };
    window.addEventListener('message', handler, { once: true });

    window.postMessage({ type: 'REQUEST_APPLICANT_COUNT', jobId }, '*');

    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 1200);
  });
}

function injectHookOnce() {
  if (hookInjected) return;
  hookInjected = true;
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('pageHook.js');
  s.onload = function () { this.remove(); };
  (document.head || document.documentElement).appendChild(s);
}

let observer = null;
function startObserving() {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      debounceProcess();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  debounceProcess();
}

function stopObserving() {
  if (observer) observer.disconnect();
  observer = null;
}

// Listen for popup toggle
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'toggleEnabled') {
    enabled = !!req.enabled;
    console.debug('[LI Applicant Counter] enabled:', enabled);

    if (enabled) {
      injectHookOnce();
      startObserving();
      debounceProcess();
    } else {
      stopObserving();
      hideBadge();
    }
  }
});
