'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function exists(rel) { return fs.existsSync(path.join(root, rel)); }

test('manifest is V3 and version matches package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, pkg.version);
});

test('every file the manifest references exists', () => {
  const refs = [
    manifest.background.service_worker,
    ...manifest.background.scripts,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
    ...manifest.declarative_net_request.rule_resources.map((r) => r.path),
    ...manifest.content_scripts.flatMap((cs) => cs.js)
  ];
  for (const rel of refs) assert.ok(exists(rel), `missing ${rel}`);
});

test('background entry is the same file for Chromium and Firefox', () => {
  assert.deepEqual(manifest.background.scripts, [manifest.background.service_worker]);
});

test('content scripts load their helper libraries before using them', () => {
  for (const cs of manifest.content_scripts) {
    const idx = cs.js.indexOf('src/lib/url-utils.js');
    assert.ok(idx === 0, 'url-utils.js must be first in ' + cs.js.join(','));
  }
});

test('Firefox add-on id and minimum versions are declared', () => {
  assert.ok(manifest.browser_specific_settings.gecko.id.includes('@'));
  assert.ok(manifest.browser_specific_settings.gecko.strict_min_version);
});
