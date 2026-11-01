/**
 * Background script (service worker in Chromium, event page in Firefox).
 *
 * Responsibilities:
 *   - keep `enabled` and `allowlist` in storage.local
 *   - turn the static network ruleset on/off to match `enabled`
 *   - turn the allowlist into dynamic "allowAllRequests" rules
 *   - register page-hooks.js in the page MAIN world, skipping allowed sites,
 *     and unregister it entirely when disabled
 *   - count things the content scripts stopped and show them on the badge
 *
 * Firefox exposes `browser`, Chromium exposes `chrome`; both have the same
 * shape for the APIs used here.
 */
'use strict';

const api = typeof browser !== 'undefined' ? browser : chrome;

const STATIC_RULESET_ID = 'ad_networks';
const PAGE_HOOKS_SCRIPT_ID = 'stream-ad-shield-page-hooks';
/** Dynamic rule ids for the allowlist live in this range so they never clash with static ids. */
const ALLOWLIST_RULE_ID_BASE = 10000;
const ALLOWLIST_MAX = 500;
const DEFAULTS = { enabled: true, allowlist: [] };

/** Per-tab counters; reset when a tab navigates. */
const blockedCounts = new Map();

/** Promise wrapper so the same code works with callback-style chrome.* and promise-style browser.*. */
function call(fn, thisArg, ...args) {
  return new Promise((resolve, reject) => {
    try {
      const maybePromise = fn.call(thisArg, ...args, (result) => {
        const err = api.runtime.lastError;
        if (err) reject(new Error(err.message)); else resolve(result);
      });
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(resolve, reject);
      }
    } catch (err) { reject(err); }
  });
}

function isValidDomain(value) {
  return typeof value === 'string' && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(value) && value.length <= 253;
}

async function getSettings() {
  const items = await call(api.storage.local.get, api.storage.local, DEFAULTS);
  return {
    enabled: items.enabled !== false,
    allowlist: Array.isArray(items.allowlist) ? items.allowlist.filter(isValidDomain) : []
  };
}

/** Enables or disables the static ruleset to match `enabled`. */
async function applyEnabled(enabled) {
  const options = enabled
    ? { enableRulesetIds: [STATIC_RULESET_ID], disableRulesetIds: [] }
    : { enableRulesetIds: [], disableRulesetIds: [STATIC_RULESET_ID] };
  await call(api.declarativeNetRequest.updateEnabledRulesets, api.declarativeNetRequest, options);
}

/**
 * Rebuilds the allowlist dynamic rules from scratch: one allowAllRequests
 * rule per domain, keyed on the document being loaded, so every request
 * made by an allowed page (and its frames) passes.
 */
async function applyAllowlist(allowlist) {
  const existing = await call(api.declarativeNetRequest.getDynamicRules, api.declarativeNetRequest);
  const removeRuleIds = existing.map((r) => r.id).filter((id) => id >= ALLOWLIST_RULE_ID_BASE);
  const addRules = allowlist.slice(0, ALLOWLIST_MAX).map((domain, index) => ({
    id: ALLOWLIST_RULE_ID_BASE + index,
    priority: 100,
    action: { type: 'allowAllRequests' },
    condition: { requestDomains: [domain], resourceTypes: ['main_frame', 'sub_frame'] }
  }));
  await call(api.declarativeNetRequest.updateDynamicRules, api.declarativeNetRequest, { removeRuleIds, addRules });
}

/**
 * Registers page-hooks.js in the MAIN world, excluding allowed sites.
 * Registration persists across browser restarts, so this is idempotent:
 * unregister first, then register when enabled.
 */
async function applyPageHooks(enabled, allowlist) {
  if (!api.scripting || !api.scripting.registerContentScripts) {
    console.warn('[Stream Ad Shield] scripting API unavailable; popup blocking limited to synthetic clicks');
    return;
  }
  try {
    await call(api.scripting.unregisterContentScripts, api.scripting, { ids: [PAGE_HOOKS_SCRIPT_ID] });
  } catch (_err) { /* not registered yet */ }
  if (!enabled) return;
  const excludeMatches = allowlist.flatMap((d) => [`*://${d}/*`, `*://*.${d}/*`]);
  const script = {
    id: PAGE_HOOKS_SCRIPT_ID,
    js: ['src/content/page-hooks.js'],
    matches: ['<all_urls>'],
    allFrames: true,
    matchOriginAsFallback: true,
    runAt: 'document_start',
    world: 'MAIN',
    persistAcrossSessions: true
  };
  if (excludeMatches.length > 0) script.excludeMatches = excludeMatches;
  try {
    await call(api.scripting.registerContentScripts, api.scripting, [script]);
  } catch (err) {
    // Firefox before 128 rejects `world`; retry without it so the rest still works.
    if (String(err.message).toLowerCase().includes('world')) {
      delete script.world;
      await call(api.scripting.registerContentScripts, api.scripting, [script]);
    } else {
      throw err;
    }
  }
}

async function applyAll() {
  try {
    const settings = await getSettings();
    await applyEnabled(settings.enabled);
    await applyAllowlist(settings.allowlist);
    await applyPageHooks(settings.enabled, settings.allowlist);
  } catch (err) {
    console.error('[Stream Ad Shield] failed to apply settings:', err);
  }
}

function setBadge(tabId) {
  const count = blockedCounts.get(tabId) || 0;
  try {
    api.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' });
    api.action.setBadgeBackgroundColor({ tabId, color: '#c0392b' });
  } catch (_err) { /* tab may be gone */ }
}

// --- Event wiring ------------------------------------------------------------------

api.runtime.onInstalled.addListener(async () => {
  try {
    const stored = await call(api.storage.local.get, api.storage.local, null);
    const patch = {};
    if (typeof stored.enabled !== 'boolean') patch.enabled = DEFAULTS.enabled;
    if (!Array.isArray(stored.allowlist)) patch.allowlist = DEFAULTS.allowlist;
    if (Object.keys(patch).length > 0) await call(api.storage.local.set, api.storage.local, patch);
  } catch (err) {
    console.error('[Stream Ad Shield] could not initialise storage:', err);
  }
  applyAll();
});
api.runtime.onStartup.addListener(applyAll);
api.storage.onChanged.addListener((_changes, area) => { if (area === 'local') applyAll(); });

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'blocked' && sender.tab && typeof sender.tab.id === 'number') {
    const tabId = sender.tab.id;
    blockedCounts.set(tabId, (blockedCounts.get(tabId) || 0) + 1);
    setBadge(tabId);
    return false;
  }

  if (message.type === 'getTabCount' && typeof message.tabId === 'number') {
    sendResponse({ count: blockedCounts.get(message.tabId) || 0 });
    return false;
  }

  return false;
});

api.tabs.onRemoved.addListener((tabId) => blockedCounts.delete(tabId));
api.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    blockedCounts.set(tabId, 0);
    setBadge(tabId);
  }
});
