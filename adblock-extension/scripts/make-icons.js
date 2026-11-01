#!/usr/bin/env node
/**
 * Generates icons/icon-16.png, icon-48.png and icon-128.png with no image
 * library: draws a red shield with a white bar into an RGBA buffer and
 * encodes it as PNG using only zlib and a CRC32 table.
 *
 * Run: node scripts/make-icons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Returns true when pixel (x, y) in a size×size grid is inside a shield shape. */
function insideShield(x, y, size) {
  const nx = (x + 0.5) / size;          // 0..1
  const ny = (y + 0.5) / size;
  if (ny < 0.08) return false;
  // Upper part is a rectangle with margins, lower part tapers to a point.
  const halfWidth = ny < 0.55 ? 0.40 : 0.40 * (1 - (ny - 0.55) / 0.40);
  if (halfWidth <= 0) return false;
  return Math.abs(nx - 0.5) <= halfWidth;
}

function render(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte: none
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const ny = (y + 0.5) / size;
      if (insideShield(x, y, size)) {
        const bar = ny > 0.42 && ny < 0.56 && Math.abs((x + 0.5) / size - 0.5) < 0.25;
        if (bar) { raw[o] = 255; raw[o + 1] = 255; raw[o + 2] = 255; }
        else { raw[o] = 0xc0; raw[o + 1] = 0x39; raw[o + 2] = 0x2b; }
        raw[o + 3] = 255;
      } else {
        raw[o + 3] = 0; // transparent
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function main() {
  const dir = path.join(__dirname, '..', 'icons');
  fs.mkdirSync(dir, { recursive: true });
  for (const size of [16, 48, 128]) {
    const file = path.join(dir, `icon-${size}.png`);
    fs.writeFileSync(file, render(size));
    console.log('wrote', file);
  }
}

if (require.main === module) main();
module.exports = { render, insideShield };
