/**
 * Page hooks. Runs in the page's MAIN world at document_start, in every frame.
 *
 * Why a separate file: Chromium and Firefox run ordinary content scripts in an
 * isolated world with its own `window`. Wrapping `window.open` there changes
 * nothing for the page's scripts. This file is registered by the background
 * script with `world: "MAIN"` so its overrides apply to the real page.
 *
 * Main-world scripts have no extension APIs, so everything it stops is
 * announced with a DOM CustomEvent that popup-guard.js (isolated world)
 * forwards to the background for the badge counter.
 *
 * On/off and the allowlist are not handled here: the background simply does
 * not register this script for allowed sites, or at all when disabled, so a
 * page cannot spoof a "turn off" message.
 */
(function () {
  'use strict';

  const EVENT_NAME = 'stream-ad-shield:blocked';
  const pageUrl = window.location.href;

  // Minimal copy of url-utils so this file has no load-order dependency.
  function hostnameOf(url) {
    if (typeof url !== 'string' || url.length === 0) return null;
    try {
      const parsed = new URL(url, pageUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.hostname.toLowerCase();
    } catch (_err) { return null; }
  }
  function baseDomain(host) {
    const labels = host.split('.');
    return labels.length <= 2 ? host : labels.slice(-2).join('.');
  }
  function isThirdParty(targetUrl) {
    const target = hostnameOf(targetUrl);
    if (target === null) return false;
    const page = hostnameOf(pageUrl);
    if (page === null) return true;
    return baseDomain(target) !== baseDomain(page);
  }

  function report(kind, detail) {
    try {
      document.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: { kind, detail: String(detail).slice(0, 200) }
      }));
    } catch (_err) { /* ignore */ }
  }

  // --- window.open -------------------------------------------------------------
  try {
    const nativeOpen = window.open;
    const guardedOpen = function open(url, target, features) {
      try {
        if (isThirdParty(url)) {
          report('popup', url);
          // Return a closed dummy so `w.focus()` style code does not throw and
          // fall back to a full-page redirect.
          return { closed: true, focus() {}, blur() {}, close() {}, location: {}, document: null };
        }
      } catch (_err) { /* fall through */ }
      return nativeOpen.call(window, url, target, features);
    };
    // Make the wrapper look native so anti-adblock scripts that compare
    // `window.open.toString()` do not notice.
    try {
      Object.defineProperty(guardedOpen, 'toString', { value: () => nativeOpen.toString() });
      Object.defineProperty(guardedOpen, 'name', { value: 'open' });
    } catch (_err) { /* cosmetic only */ }
    Object.defineProperty(window, 'open', { configurable: true, writable: true, value: guardedOpen });
  } catch (_err) { /* page froze window; nothing to do */ }

  // --- Notification prompts -------------------------------------------------------
  try {
    if (window.Notification && typeof window.Notification.requestPermission === 'function') {
      const denied = function requestPermission(callback) {
        report('notification-prompt', pageUrl);
        if (typeof callback === 'function') { try { callback('denied'); } catch (_e) { /* ignore */ } }
        return Promise.resolve('denied');
      };
      Object.defineProperty(window.Notification, 'requestPermission', {
        configurable: true, writable: true, value: denied
      });
    }
  } catch (_err) { /* ignore */ }
})();
