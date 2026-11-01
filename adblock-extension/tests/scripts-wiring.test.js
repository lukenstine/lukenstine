'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

test('page-hooks.js exists, is registered by the background in the MAIN world, and is not a static content script', () => {
  assert.ok(fs.existsSync(path.join(root, 'src/content/page-hooks.js')));
  const bg = read('src/background/background.js');
  assert.match(bg, /js: \['src\/content\/page-hooks\.js'\]/);
  assert.match(bg, /world: 'MAIN'/);
  for (const cs of manifest.content_scripts) {
    assert.ok(!cs.js.includes('src/content/page-hooks.js'), 'page-hooks must be dynamic so it can be unregistered');
  }
});

test('manifest grants the permissions the background relies on', () => {
  for (const p of ['declarativeNetRequest', 'scripting', 'storage', 'tabs']) {
    assert.ok(manifest.permissions.includes(p), `missing permission ${p}`);
  }
});

test('page hooks and bridge agree on the event name', () => {
  const hooks = read('src/content/page-hooks.js');
  const bridge = read('src/content/popup-guard.js');
  const name = /EVENT_NAME = '([^']+)'/.exec(hooks)[1];
  assert.ok(bridge.includes(`EVENT_NAME = '${name}'`));
});

test('no content script uses innerHTML or eval', () => {
  for (const rel of ['src/content/page-hooks.js', 'src/content/popup-guard.js', 'src/content/overlay-cleaner.js', 'popup/popup.js']) {
    const src = read(rel);
    assert.ok(!/innerHTML|\beval\(|new Function\(/.test(src), `${rel} must not use innerHTML/eval`);
  }
});
