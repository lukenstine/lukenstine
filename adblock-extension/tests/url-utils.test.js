'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { hostnameOf, baseDomain, isThirdParty, normaliseDomainInput } = require('../src/lib/url-utils.js');

test('hostnameOf returns lower-cased host for http(s) and null otherwise', () => {
  assert.equal(hostnameOf('HTTPS://Example.COM/path'), 'example.com');
  assert.equal(hostnameOf('javascript:void(0)'), null);
  assert.equal(hostnameOf('blob:https://site.com/abc'), null);
  assert.equal(hostnameOf(''), null);
  assert.equal(hostnameOf(null), null);
  assert.equal(hostnameOf('not a url'), null);
});

test('baseDomain collapses subdomains and respects two-level suffixes', () => {
  assert.equal(baseDomain('cdn.images.example.com'), 'example.com');
  assert.equal(baseDomain('www.bbc.co.uk'), 'bbc.co.uk');
  assert.equal(baseDomain('cinejoy.pk'), 'cinejoy.pk');
  assert.equal(baseDomain('a.b.something.com.pk'), 'something.com.pk');
  assert.equal(baseDomain('192.168.0.1'), '192.168.0.1');
  assert.equal(baseDomain('localhost'), 'localhost');
  assert.equal(baseDomain(''), '');
});

test('isThirdParty compares registrable domains', () => {
  const page = 'https://cinejoy.pk/watch/123';
  assert.equal(isThirdParty('https://cdn.cinejoy.pk/x.js', page), false);
  assert.equal(isThirdParty('https://pl123.profitablegatecpm.com/x', page), true);
  assert.equal(isThirdParty('/relative/path', page), false);
  assert.equal(isThirdParty('javascript:void(0)', page), false);
  assert.equal(isThirdParty('blob:https://cinejoy.pk/uuid', page), false);
  assert.equal(isThirdParty('https://evil.com', 'about:blank'), true);
});

test('normaliseDomainInput cleans user input and rejects garbage', () => {
  assert.equal(normaliseDomainInput('  HTTPS://WWW.Example.com/path?q=1 '), 'www.example.com');
  assert.equal(normaliseDomainInput('example.com:8080'), 'example.com');
  assert.equal(normaliseDomainInput(''), null);
  assert.equal(normaliseDomainInput(42), null);
  assert.equal(normaliseDomainInput('<script>alert(1)</script>'), null);
});
