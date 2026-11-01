/**
 * Toolbar popup logic: global on/off, per-site allow, blocked counter.
 * All storage access is wrapped so a failure shows a message instead of a dead UI.
 */
(function () {
  'use strict';

  const api = typeof browser !== 'undefined' ? browser : chrome;
  const enabledToggle = document.getElementById('enabled-toggle');
  const siteToggle = document.getElementById('site-toggle');
  const siteHost = document.getElementById('site-host');
  const countEl = document.getElementById('count');
  const errorEl = document.getElementById('error');

  let currentHost = null;
  let currentTabId = null;

  function showError(message) {
    errorEl.textContent = message; // plain text assignment: hostnames are untrusted input
    errorEl.hidden = false;
  }

  function call(fn, thisArg, ...args) {
    return new Promise((resolve, reject) => {
      try {
        const p = fn.call(thisArg, ...args, (result) => {
          const err = api.runtime.lastError;
          if (err) reject(new Error(err.message)); else resolve(result);
        });
        if (p && typeof p.then === 'function') p.then(resolve, reject);
      } catch (err) { reject(err); }
    });
  }

  function hostnameOf(url) {
    try {
      const u = new URL(url);
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.hostname.toLowerCase() : null;
    } catch (_err) { return null; }
  }

  function syncAria() {
    enabledToggle.setAttribute('aria-checked', String(enabledToggle.checked));
    siteToggle.setAttribute('aria-checked', String(siteToggle.checked));
  }

  async function load() {
    try {
      const tabs = await call(api.tabs.query, api.tabs, { active: true, currentWindow: true });
      const tab = tabs && tabs[0];
      currentTabId = tab ? tab.id : null;
      currentHost = tab ? hostnameOf(tab.url || '') : null;
      siteHost.textContent = currentHost || 'not a web page';
      siteToggle.disabled = !currentHost;

      const items = await call(api.storage.local.get, api.storage.local, { enabled: true, allowlist: [] });
      enabledToggle.checked = items.enabled !== false;
      const list = Array.isArray(items.allowlist) ? items.allowlist : [];
      siteToggle.checked = !!currentHost && list.includes(currentHost);

      if (typeof currentTabId === 'number') {
        const res = await call(api.runtime.sendMessage, api.runtime, { type: 'getTabCount', tabId: currentTabId });
        countEl.textContent = String((res && res.count) || 0);
      }
      syncAria();
    } catch (err) {
      showError('Could not read settings: ' + err.message);
    }
  }

  enabledToggle.addEventListener('change', async () => {
    try {
      await call(api.storage.local.set, api.storage.local, { enabled: enabledToggle.checked });
      syncAria();
    } catch (err) { showError('Could not save: ' + err.message); }
  });

  siteToggle.addEventListener('change', async () => {
    if (!currentHost) return;
    try {
      const items = await call(api.storage.local.get, api.storage.local, { allowlist: [] });
      const set = new Set(Array.isArray(items.allowlist) ? items.allowlist : []);
      if (siteToggle.checked) set.add(currentHost); else set.delete(currentHost);
      await call(api.storage.local.set, api.storage.local, { allowlist: Array.from(set) });
      syncAria();
    } catch (err) { showError('Could not save: ' + err.message); }
  });

  load();
})();
