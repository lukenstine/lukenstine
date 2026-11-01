# Stream Ad Shield

A small Manifest V3 browser extension that blocks the ads streaming sites
throw at you: ad-network requests, pop-under tabs, invisible click-trap
overlays, "disable your ad blocker" modals and notification permission prompts.

One codebase loads in Chromium browsers (Chrome, Edge, Kiwi, Brave) and in
Firefox 128 or newer, including Firefox for Android.

**Honest comparison:** uBlock Origin in Firefox for Android blocks more than
this extension does and is maintained by a large community. Use this when you
want something you control and can read in an afternoon, or when uBlock Origin
is not an option in your browser.

## What it does, and how

| Problem on the page | Mechanism | File |
| --- | --- | --- |
| Ad scripts, iframes, pixels from known networks | `declarativeNetRequest` static rules, 96 domains plus regexes for rotating Adsterra hosts | `rules/ad-networks.json` |
| Pop-under tab opened by `window.open` | `window.open` is wrapped in the page MAIN world; third-party targets get a closed dummy window | `src/content/page-hooks.js` |
| Hidden link clicked by script | Clicks with `isTrusted === false` on third-party links are cancelled | `src/content/popup-guard.js` |
| "Allow notifications?" prompts | `Notification.requestPermission` always resolves `denied` (MAIN world) | `src/content/page-hooks.js` |
| Invisible full-screen click traps, anti-adblock modals, locked scrolling | Full-viewport fixed layers are classified and removed; `overflow:hidden` is undone | `src/content/overlay-cleaner.js`, `src/lib/overlay-heuristics.js` |
| Turning it off, allowing a site | Toolbar popup writes to `storage.local`; background toggles the ruleset, adds allow rules, and (un)registers the MAIN-world script | `popup/`, `src/background/background.js` |

Network ads blocked by the rules are not counted on the badge. Only the
popups and overlays stopped by the content scripts are, because MV3 gives no
cross-browser way to count matched rules in a shipped extension.

## Project layout

```
adblock-extension/
├── manifest.json              Extension manifest (MV3, Chromium + Firefox keys)
├── rules/ad-networks.json     Generated network rules; do not edit by hand
├── src/
│   ├── lib/url-utils.js       Hostname / third-party helpers (shared, tested)
│   ├── lib/overlay-heuristics.js  Pure overlay decision logic (tested)
│   ├── content/page-hooks.js      MAIN-world script registered by the background
│   ├── content/popup-guard.js     Isolated-world bridge, document_start, all frames
│   ├── content/overlay-cleaner.js document_idle script, top frame
│   └── background/background.js   Settings, dynamic rules, badge
├── popup/                     Toolbar UI (html, css, js)
├── icons/                     Generated PNGs
├── scripts/
│   ├── generate-rules.js      Domain list lives here; writes rules JSON
│   ├── make-icons.js          Writes icons without image libraries
│   └── build.sh               Tests, then zips to dist/
├── tests/                     node --test unit tests
├── diagnostics.php            Verifies files, folders and JSON
├── changelog.md
└── package.json
```

## Requirements

- Node.js 20 or newer (only for tests and building; the extension itself needs nothing).
- `zip` on your PATH for `scripts/build.sh`.
- PHP 8.0 or newer to run `diagnostics.php` (optional).

No npm dependencies. There is no `npm install` step.

## Setup and build

```bash
cd adblock-extension
npm test              # runs 23 unit tests with node --test
npm run build         # regenerates rules + icons, runs tests, writes dist/*.zip and dist/*.xpi
npm run diagnose      # php diagnostics.php
```

To change which networks are blocked, edit `AD_DOMAINS` or `REGEX_FILTERS` in
`scripts/generate-rules.js`, then run `npm run rules`. The test suite fails if
the JSON on disk is out of date with the generator.

## Installing on Android

Chrome for Android cannot load extensions of any kind. Pick one of these.

### Firefox for Android (recommended)

Firefox for Android only installs **signed** extensions. Signing is free and
takes a few minutes through Mozilla's add-on service.

1. Create a free account at <https://addons.mozilla.org> and generate API
   credentials under *Tools → Manage API Keys*.
2. On a computer:
   ```bash
   npx web-ext sign --source-dir adblock-extension --channel unlisted \
     --api-key YOUR_JWT_ISSUER --api-secret YOUR_JWT_SECRET
   ```
   This writes a signed `.xpi` into `web-ext-artifacts/`.
3. Copy that `.xpi` to the phone (email it to yourself, or any file transfer).
4. In Firefox for Android: *Settings → About Firefox*, tap the Firefox logo
   five times to unlock the debug menu, go back to *Settings*, choose
   **Install extension from file**, and pick the `.xpi`.
5. Open *Settings → Extensions → Stream Ad Shield* and set site access to
   **Allow on all sites**. Firefox makes host permissions optional on Android
   and the content scripts do nothing until you allow them.

Alternative without signing: install **Firefox Nightly**, open `about:config`,
set `xpinstall.signatures.required` to `false`, then use the same
"Install extension from file" step with the unsigned `dist/*.xpi`.

### Microsoft Edge Canary for Android

1. Install Edge Canary from the Play Store.
2. *Settings → About Microsoft Edge*, tap the build number five times to
   unlock *Developer options*.
3. *Developer options → Extension install by crx* and choose
   `dist/stream-ad-shield-<version>.zip` (rename it to `.crx` if the picker
   insists).

### Kiwi Browser

Kiwi is no longer maintained, so prefer the two options above. If you already
have it: open `chrome://extensions`, enable *Developer mode*, choose
**+ (from .zip/.crx/.user.js)** and pick the zip from `dist/`.

## Installing on desktop (for testing)

- **Chrome / Edge / Brave:** `chrome://extensions` → Developer mode →
  **Load unpacked** → select the `adblock-extension` folder.
- **Firefox:** `about:debugging#/runtime/this-firefox` → **Load Temporary
  Add-on** → select `manifest.json`. Temporary add-ons are removed on restart.

## Using it

- The toolbar icon shows a red badge with the number of popups and overlays
  stopped on the current tab.
- Click the icon to turn blocking off globally or to **Allow this site** when
  a site you trust breaks. Allowing a site adds it to a list in
  `storage.local`; the background script turns the list into
  `allowAllRequests` dynamic rules and the content scripts stand down.

## Testing

```bash
npm test
```

The extension was also verified end to end in headless Chromium against a
local page that opens a pop-under, fires a synthetic click, loads a Google ad
script, shows an invisible click trap and an anti-adblock modal, and locks
scrolling. Enabled: all six were stopped and the video element survived.
Allowed site or disabled: all six passed through. Re-enabled: all stopped again.

Covers: URL helpers, overlay classification, rule-file validity and freshness,
regex hit/miss lists, manifest references, PNG output. Tests need no browser.

For a manual end-to-end check load the extension unpacked in desktop Chrome,
open a streaming site, and watch the badge count and the browser console
(`[Stream Ad Shield]` messages appear only on errors).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Nothing is blocked in Firefox for Android | Host permissions not granted | Extensions → Stream Ad Shield → Allow on all sites |
| Video player disappears | Overlay heuristic removed a wrapper that had no `<video>` yet | Toggle **Allow this site**, reload, report the site |
| Badge always 0 but ads are gone | Expected: network blocks are not counted | None |
| "Install extension from file" is missing | Debug menu not unlocked | Settings → About → tap logo 5 times |
| Edge Canary rejects the zip | Needs a `.crx` name | Rename `dist/*.zip` to `.crx` |
| `npm test` says rules are stale | You edited the generator | `npm run rules` |
| `scripts/build.sh` fails on `zip` | `zip` not installed | `sudo apt install zip` or use any archiver on the same folders |

## Security notes

- Content scripts never use `innerHTML` or `eval`; all page text is written with `textContent`.
- The popup escapes nothing by hand because it never inserts markup; hostnames go through `textContent`.
- The allowlist is validated as a hostname before it is stored.
- `diagnostics.php` escapes every value with `htmlspecialchars` when rendering HTML and emits no user-supplied content from the request except the `format` switch.
- The page cannot switch the MAIN-world hooks off by faking a message: on/off and the allowlist are applied by registering or not registering the script, which only the background can do.
- No data leaves the browser. There is no remote config, no analytics, no update check.

## License

MIT.
