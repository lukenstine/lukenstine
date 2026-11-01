'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { AD_DOMAINS, REGEX_FILTERS, buildRules } = require('../scripts/generate-rules.js');

const VALID_TYPES = new Set(['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
  'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'webtransport', 'webbundle', 'other']);

const rulesPath = path.join(__dirname, '..', 'rules', 'ad-networks.json');

test('generated rule file exists, parses, and matches the generator output', () => {
  const onDisk = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  assert.deepEqual(onDisk, buildRules(), 'run `node scripts/generate-rules.js` to refresh rules/ad-networks.json');
});

test('rule ids are unique positive integers', () => {
  const ids = buildRules().map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(Number.isInteger(id) && id > 0);
});

test('every rule has a valid shape for declarativeNetRequest', () => {
  for (const rule of buildRules()) {
    assert.equal(rule.action.type, 'block');
    assert.ok(Array.isArray(rule.condition.resourceTypes) && rule.condition.resourceTypes.length > 0);
    for (const t of rule.condition.resourceTypes) assert.ok(VALID_TYPES.has(t), `bad resource type ${t}`);
    const hasDomains = Array.isArray(rule.condition.requestDomains);
    const hasRegex = typeof rule.condition.regexFilter === 'string';
    assert.ok(hasDomains !== hasRegex, 'rule must use exactly one of requestDomains / regexFilter');
  }
});

test('ad domains are lower-case bare hostnames with no duplicates', () => {
  assert.equal(new Set(AD_DOMAINS).size, AD_DOMAINS.length, 'duplicate domain in AD_DOMAINS');
  for (const d of AD_DOMAINS) {
    assert.match(d, /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, `bad domain ${d}`);
  }
});

test('regex filters compile and hit known Adsterra-style hosts without hitting normal sites', () => {
  const regexes = REGEX_FILTERS.map((r) => new RegExp(r, 'i'));
  const shouldBlock = [
    'https://pl1234567.profitablegatecpm.com/ab/cd.js',
    'https://www.highperformanceformat.com/abc/invoke.js',
    'https://effectivecpmrate.com/x',
    'https://cdn.example.com/popunder.js?v=2',
    'https://cdn.example.com/popads2.js'
  ];
  const shouldAllow = [
    'https://cinejoy.pk/assets/player.js',
    'https://cinejoy.pk/assets/popup.js',
    'https://www.youtube.com/watch?v=1',
    'https://cdn.example.com/popular.js'
  ];
  for (const url of shouldBlock) assert.ok(regexes.some((re) => re.test(url)), `expected block: ${url}`);
  for (const url of shouldAllow) assert.ok(!regexes.some((re) => re.test(url)), `expected allow: ${url}`);
});
