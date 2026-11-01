/**
 * Pure decision functions for the overlay cleaner. Kept free of DOM access so
 * they can be unit-tested under Node without a browser.
 *
 * Defines global `StreamShieldOverlay` in the extension, CommonJS export in Node.
 */
(function (root) {
  'use strict';

  /** Fraction of the viewport an element must cover to count as "full screen". */
  const COVERAGE_THRESHOLD = 0.8;
  /** Elements below this z-index are ordinary layout, not overlays. */
  const MIN_Z_INDEX = 100;

  /**
   * Decides whether an element is a click-hijacking overlay or anti-adblock
   * modal that should be removed.
   *
   * @param {object} info  Plain description of the element, gathered by the caller:
   *   position   {string}  computed CSS position
   *   width      {number}  bounding box width in px
   *   height     {number}  bounding box height in px
   *   viewportW  {number}
   *   viewportH  {number}
   *   zIndex     {number}  computed z-index (NaN when "auto")
   *   opacity    {number}  computed opacity 0..1
   *   containsVideo {boolean}  true if a <video> lives inside the element
   *   isVideoAncestorOfPlayer {boolean} true if the element wraps the main player
   *   hasThirdPartyLink {boolean} true if it contains an <a> or <iframe> to another site
   *   pointerEvents {string} computed pointer-events
   * @returns {{remove: boolean, reason: string}}
   */
  function classifyOverlay(info) {
    if (!info || typeof info !== 'object') return { remove: false, reason: 'no-info' };

    const fixedOrAbsolute = info.position === 'fixed' || info.position === 'absolute';
    if (!fixedOrAbsolute) return { remove: false, reason: 'not-positioned' };

    if (info.pointerEvents === 'none') return { remove: false, reason: 'not-clickable' };

    if (info.containsVideo || info.isVideoAncestorOfPlayer) {
      return { remove: false, reason: 'wraps-player' };
    }

    const vw = Number(info.viewportW) || 0;
    const vh = Number(info.viewportH) || 0;
    if (vw <= 0 || vh <= 0) return { remove: false, reason: 'no-viewport' };

    const coverage = (Number(info.width) * Number(info.height)) / (vw * vh);
    if (!Number.isFinite(coverage) || coverage < COVERAGE_THRESHOLD) {
      return { remove: false, reason: 'too-small' };
    }

    const z = Number(info.zIndex);
    const highZ = Number.isFinite(z) && z >= MIN_Z_INDEX;
    const nearlyInvisible = Number(info.opacity) <= 0.05;

    // A full-screen, nearly invisible, clickable layer is the classic
    // pop-under trap: it exists only to catch the user's first tap.
    if (nearlyInvisible) return { remove: true, reason: 'invisible-click-trap' };

    // A full-screen high-z layer that links off-site is an ad interstitial.
    if (highZ && info.hasThirdPartyLink) return { remove: true, reason: 'third-party-interstitial' };

    // A full-screen high-z layer with no video and no off-site link is most
    // often an anti-adblock or "disable your blocker" modal.
    if (highZ) return { remove: true, reason: 'blocking-modal' };

    return { remove: false, reason: 'ordinary-layer' };
  }

  /**
   * True when the page has locked scrolling with overflow:hidden on html or
   * body, which anti-adblock modals do to trap the user.
   */
  function isScrollLocked(htmlOverflow, bodyOverflow) {
    return htmlOverflow === 'hidden' || bodyOverflow === 'hidden';
  }

  const api = { classifyOverlay, isScrollLocked, COVERAGE_THRESHOLD, MIN_Z_INDEX };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.StreamShieldOverlay = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
