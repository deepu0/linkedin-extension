async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getEnabled(tabId) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getTabEnabled', tabId }, resp => {
      resolve(Boolean(resp && resp.enabled));
    });
  });
}

async function setEnabled(tabId, enabled) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'setTabEnabled', tabId, enabled }, () => resolve());
  });
}

function renderButton(enabled) {
  const btn = document.getElementById('toggleBtn');
  btn.textContent = enabled ? 'Hide count' : 'Show count';
  btn.className = enabled ? 'secondary' : 'primary';
}

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getActiveTab();
  if (!tab) return;

  const enabled = await getEnabled(tab.id);
  renderButton(enabled);

  document.getElementById('toggleBtn').addEventListener('click', async () => {
    const nowEnabled = !(await getEnabled(tab.id));
    await setEnabled(tab.id, nowEnabled);

    // Tell the content script to toggle
    chrome.tabs.sendMessage(tab.id, { action: 'toggleEnabled', enabled: nowEnabled });

    renderButton(nowEnabled);
  });
});
