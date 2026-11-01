'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render, insideShield } = require('../scripts/make-icons.js');

test('rendered icons are valid PNG files of the right size', () => {
  for (const size of [16, 48, 128]) {
    const png = render(size);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test('shield shape covers the centre and not the corners', () => {
  assert.equal(insideShield(64, 50, 128), true);
  assert.equal(insideShield(0, 0, 128), false);
  assert.equal(insideShield(127, 127, 128), false);
});
