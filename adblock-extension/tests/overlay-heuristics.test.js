'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyOverlay, isScrollLocked } = require('../src/lib/overlay-heuristics.js');

const base = {
  position: 'fixed', width: 412, height: 915, viewportW: 412, viewportH: 915,
  zIndex: 9999, opacity: 1, pointerEvents: 'auto',
  containsVideo: false, isVideoAncestorOfPlayer: false, hasThirdPartyLink: false
};

test('invisible full-screen clickable layer is removed as a click trap', () => {
  const v = classifyOverlay({ ...base, opacity: 0, zIndex: NaN });
  assert.equal(v.remove, true);
  assert.equal(v.reason, 'invisible-click-trap');
});

test('full-screen high-z layer linking off-site is removed', () => {
  const v = classifyOverlay({ ...base, hasThirdPartyLink: true });
  assert.deepEqual(v, { remove: true, reason: 'third-party-interstitial' });
});

test('full-screen high-z layer with nothing else is treated as a blocking modal', () => {
  assert.equal(classifyOverlay(base).remove, true);
});

test('anything wrapping the video player is never removed', () => {
  assert.equal(classifyOverlay({ ...base, containsVideo: true }).remove, false);
  assert.equal(classifyOverlay({ ...base, isVideoAncestorOfPlayer: true, opacity: 0 }).remove, false);
});

test('static, small, or non-clickable elements are left alone', () => {
  assert.equal(classifyOverlay({ ...base, position: 'static' }).remove, false);
  assert.equal(classifyOverlay({ ...base, width: 300, height: 250 }).remove, false);
  assert.equal(classifyOverlay({ ...base, pointerEvents: 'none', opacity: 0 }).remove, false);
  assert.equal(classifyOverlay({ ...base, zIndex: 1 }).remove, false);
});

test('bad input never throws', () => {
  assert.equal(classifyOverlay(null).remove, false);
  assert.equal(classifyOverlay({}).remove, false);
  assert.equal(classifyOverlay({ ...base, viewportW: 0 }).remove, false);
  assert.equal(classifyOverlay({ ...base, width: 'x' }).remove, false);
});

test('isScrollLocked detects overflow hidden on html or body', () => {
  assert.equal(isScrollLocked('hidden', 'auto'), true);
  assert.equal(isScrollLocked('visible', 'hidden'), true);
  assert.equal(isScrollLocked('auto', 'visible'), false);
});
