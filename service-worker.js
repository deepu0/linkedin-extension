// Per-tab enabled state kept in session storage
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'getCookies') {
    chrome.cookies.getAll({ domain: req.domain }, cookies => sendResponse(cookies));
    return true;
  }

  if (req.action === 'setTabEnabled') {
    const key = `tab:${req.tabId}`;
    chrome.storage.session.set({ [key]: req.enabled }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (req.action === 'getTabEnabled') {
    const key = `tab:${req.tabId}`;
    chrome.storage.session.get(key).then(obj => {
      sendResponse({ enabled: Boolean(obj[key]) });
    });
    return true;
  }
});
