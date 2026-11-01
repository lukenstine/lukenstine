# Changelog

All notable changes to the ad-blocking extension are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-11-01

### Added
- Manifest V3 extension that loads in Chromium browsers (Chrome, Edge, Kiwi) and Firefox 113+ from one codebase.
- Static network rules (`rules/ad-networks.json`) that block 90+ ad, pop-under and tracker networks commonly loaded by streaming sites, including Adsterra, PropellerAds/Monetag, PopAds, PopCash, ExoClick, HilltopAds, Clickadu, Google ad domains, MGID, Taboola and Outbrain.
- Regex rules for Adsterra's rotating `*cpm*` domains.
- Main-world script `page-hooks.js`, registered by the background with `scripting.registerContentScripts`, that blocks third-party `window.open` calls and refuses notification permission prompts.
- Isolated-world bridge `popup-guard.js` (document start, all frames) that cancels synthetic (non-user) clicks on third-party links and forwards blocked-event reports to the background.
- Content script `overlay-cleaner.js` that removes full-viewport fixed overlays and restores page scrolling when a site locks it.
- Background script that registers or unregisters the main-world script for the on/off switch and allowlist, keeps the on/off state and a per-site allowlist in storage, applies them as dynamic rules, and shows a per-tab count of stopped popups and overlays on the toolbar badge.
- Toolbar popup with a global on/off switch and an "allow this site" toggle.
- Unit tests (`node --test`, 27 tests) for the rule file, manifest, URL helpers, overlay heuristics, icon output and script wiring.
- `scripts/make-icons.js` that generates the PNG icons without any image library.
- `scripts/build.sh` that produces a Chromium zip and a Firefox xpi in `dist/`.
- `diagnostics.php` that verifies every required file and folder exists and that the JSON is well formed.
- README with install steps for Firefox for Android, Edge Canary for Android, Kiwi, and desktop browsers.

### Fixed (during initial verification)
- `window.open` override had no effect because content scripts run in an isolated world; moved it to a MAIN-world script registered from the background.
- Allowlist `allowAllRequests` rules matched on initiator domain, which is empty for top-level navigations, so network blocking stayed on for allowed sites; now matched on request domain.
- Pop-script regex matched any first-party `popup.js`; narrowed to popunder/popads/popcash/popmagic.
- Removed two invalid entries from the domain list and one redundant subdomain.
- Firefox minimum raised from 113 to 128, the first version with MAIN-world content script support.
