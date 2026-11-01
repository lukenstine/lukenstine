/**
 * Overlay cleaner. Runs at document_idle in the top frame only.
 *
 * Finds full-viewport fixed layers that sit over the page (click traps and
 * anti-adblock modals), removes them, and unlocks scrolling. Decisions are
 * made by the pure functions in overlay-heuristics.js so they can be tested.
 */
(function () {
  'use strict';

  const urlUtils = window.StreamShieldUrl;
  const heuristics = window.StreamShieldOverlay;
  if (!urlUtils || !heuristics) return;

  const api = typeof browser !== 'undefined' ? browser : chrome;
  const pageUrl = window.location.href;
  const host = urlUtils.hostnameOf(pageUrl);
  let enabled = true;
  let siteAllowed = false;
  let scheduled = false;

  /** Debounce: MutationObserver can fire hundreds of times per second on a video page. */
  const SCAN_DELAY_MS = 250;
  /** Hard cap on elements inspected per scan to keep the main thread responsive. */
  const MAX_CANDIDATES = 400;

  function report(kind, detail) {
    try { api.runtime.sendMessage({ type: 'blocked', kind, detail: String(detail).slice(0, 200) }); }
    catch (_err) { /* ignore */ }
  }

  /** Builds the plain-object description that classifyOverlay expects. */
  function describe(el, mainPlayer) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const linkOrFrame = el.querySelector('a[href], iframe[src]');
    let hasThirdPartyLink = false;
    if (linkOrFrame) {
      const target = linkOrFrame.getAttribute('href') || linkOrFrame.getAttribute('src');
      hasThirdPartyLink = urlUtils.isThirdParty(target, pageUrl);
    }
    return {
      position: style.position,
      width: rect.width,
      height: rect.height,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      zIndex: parseInt(style.zIndex, 10),
      opacity: parseFloat(style.opacity),
      pointerEvents: style.pointerEvents,
      containsVideo: !!el.querySelector('video'),
      isVideoAncestorOfPlayer: !!mainPlayer && el.contains(mainPlayer),
      hasThirdPartyLink
    };
  }

  function scan() {
    scheduled = false;
    if (!enabled || siteAllowed || !document.body) return;
    try {
      const mainPlayer = document.querySelector('video');
      // Only elements that are direct-ish children of body are overlay candidates;
      // deep elements with position:fixed are usually UI inside the player.
      const candidates = document.querySelectorAll('body > *, body > * > *');
      let inspected = 0;
      for (const el of candidates) {
        if (inspected++ > MAX_CANDIDATES) break;
        if (el === mainPlayer || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
        const verdict = heuristics.classifyOverlay(describe(el, mainPlayer));
        if (verdict.remove) {
          el.remove();
          report('overlay', verdict.reason + ' ' + (el.id || el.className || el.tagName));
        }
      }
      // Anti-adblock modals lock scrolling; give it back.
      const htmlOverflow = window.getComputedStyle(document.documentElement).overflow;
      const bodyOverflow = window.getComputedStyle(document.body).overflow;
      if (heuristics.isScrollLocked(htmlOverflow, bodyOverflow)) {
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
        document.body.style.setProperty('overflow', 'auto', 'important');
      }
    } catch (_err) { /* never break the page */ }
  }

  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(scan, SCAN_DELAY_MS);
  }

  function applySettings(items) {
    enabled = items && items.enabled !== false;
    const list = Array.isArray(items && items.allowlist) ? items.allowlist : [];
    siteAllowed = !!host && list.some(function (d) { return host === d || host.endsWith('.' + d); });
    if (enabled && !siteAllowed) scheduleScan();
  }

  try {
    api.storage.local.get({ enabled: true, allowlist: [] }, applySettings);
    api.storage.onChanged.addListener(function (_changes, area) {
      if (area === 'local') api.storage.local.get({ enabled: true, allowlist: [] }, applySettings);
    });
  } catch (_err) { scheduleScan(); }

  // Overlays are injected after load and re-injected after being removed, so watch the DOM.
  try {
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  } catch (_err) { /* ignore */ }

  // First tap is when click traps fire; rescan right before it propagates.
  document.addEventListener('pointerdown', scheduleScan, true);
  window.addEventListener('load', scheduleScan);
})();
