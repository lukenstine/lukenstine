/**
 * Popup guard bridge. Runs at document_start in every frame, in the isolated world.
 *
 * Two jobs:
 *   1. Cancel script-generated clicks on third-party links. A real user tap has
 *      `event.isTrusted === true`; an anchor built by a script and `.click()`ed
 *      has `isTrusted === false`. DOM events are shared between worlds, so this
 *      works from the isolated world and keeps the extension APIs available.
 *   2. Forward the "I stopped something" events that page-hooks.js (main world)
 *      dispatches, so the background can count them on the badge.
 *
 * Everything is wrapped in try/catch: a content script that throws on an odd
 * page breaks that page, which is worse than letting one popup through.
 */
(function () {
  'use strict';

  const urlUtils = window.StreamShieldUrl;
  if (!urlUtils) return;

  const api = typeof browser !== 'undefined' ? browser : chrome;
  const EVENT_NAME = 'stream-ad-shield:blocked';
  const pageUrl = window.location.href;
  const host = urlUtils.hostnameOf(pageUrl);
  let enabled = true;
  let siteAllowed = false;

  function report(kind, detail) {
    try { api.runtime.sendMessage({ type: 'blocked', kind, detail: String(detail).slice(0, 200) }); }
    catch (_err) { /* extension context may be gone during unload */ }
  }

  function active() { return enabled && !siteAllowed; }

  // --- 1. Synthetic clicks on third-party anchors --------------------------------
  document.addEventListener('click', function (event) {
    try {
      if (!active() || event.isTrusted) return;
      const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      if (urlUtils.isThirdParty(anchor.href, pageUrl)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        report('synthetic-click', anchor.href);
      }
    } catch (_err) { /* never break the page */ }
  }, true);

  // --- 2. Forward main-world reports --------------------------------------------------
  document.addEventListener(EVENT_NAME, function (event) {
    try {
      const d = event && event.detail;
      if (d && typeof d.kind === 'string') report(d.kind, d.detail || '');
    } catch (_err) { /* ignore */ }
  });

  // --- Settings sync -------------------------------------------------------------------
  function applySettings(items) {
    enabled = items && items.enabled !== false;
    const list = Array.isArray(items && items.allowlist) ? items.allowlist : [];
    siteAllowed = !!host && list.some(function (d) { return host === d || host.endsWith('.' + d); });
  }
  try {
    api.storage.local.get({ enabled: true, allowlist: [] }, applySettings);
    api.storage.onChanged.addListener(function (_changes, area) {
      if (area === 'local') api.storage.local.get({ enabled: true, allowlist: [] }, applySettings);
    });
  } catch (_err) { /* storage unavailable in sandboxed frames; defaults stay */ }
})();
