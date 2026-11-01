#!/usr/bin/env bash
# Packages the extension into dist/ as a Chromium zip and a Firefox xpi.
# Both archives contain the same files; Firefox simply expects the .xpi name.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -e "process.stdout.write(require('./manifest.json').version)")"
mkdir -p dist
rm -f "dist/stream-ad-shield-${VERSION}.zip" "dist/stream-ad-shield-${VERSION}.xpi"

node scripts/generate-rules.js >/dev/null
node scripts/make-icons.js >/dev/null
node --test tests/*.test.js

FILES=(manifest.json rules src popup icons)
zip -qr "dist/stream-ad-shield-${VERSION}.zip" "${FILES[@]}" -x '*.DS_Store'
cp "dist/stream-ad-shield-${VERSION}.zip" "dist/stream-ad-shield-${VERSION}.xpi"

echo "Built:"
ls -la dist/
