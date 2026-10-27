#!/usr/bin/env bash
# Regenerate the macOS app icon and DMG artwork from the SVG sources.
# Requires macOS (qlmanage, sips, iconutil).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

qlmanage -t -s 1024 -o "$tmp" build/icon.svg >/dev/null 2>&1
cp "$tmp/icon.svg.png" build/icon.png

rm -rf build/icon.iconset
mkdir -p build/icon.iconset
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" build/icon.png --out "build/icon.iconset/icon_${size}x${size}.png" >/dev/null
  doubled=$((size * 2))
  sips -z "$doubled" "$doubled" build/icon.png --out "build/icon.iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns build/icon.iconset -o build/icon.icns

qlmanage -t -s 1320 -o "$tmp" build/dmg-background.svg >/dev/null 2>&1
# qlmanage always renders a square thumbnail, and for a wide SVG it scales to
# fill the square's height and crops the sides. Render the artwork inside a
# square viewBox first, then crop the 1320x840 artwork back out. Without this
# the @2x layer has a different aspect ratio than the base image and tiffutil
# writes a broken retina background.
sed -E 's/width="1320" height="840" viewBox="0 0 1320 840"/width="1320" height="1320" viewBox="0 -240 1320 1320"/' \
  build/dmg-background.svg > "$tmp/dmg-square.svg"
qlmanage -t -s 1320 -o "$tmp" "$tmp/dmg-square.svg" >/dev/null 2>&1
sips -c 840 1320 "$tmp/dmg-square.svg.png" --out build/dmg-background@2x.png >/dev/null
sips -z 420 660 build/dmg-background@2x.png --out build/dmg-background.png >/dev/null

rm -rf build/icon.iconset
echo "Wrote build/icon.png, build/icon.icns, build/dmg-background.png, build/dmg-background@2x.png"
