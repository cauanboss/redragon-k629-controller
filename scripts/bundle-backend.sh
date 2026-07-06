#!/usr/bin/env bash
# Bundles the compiled backend + production node_modules for Tauri release.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/bundle/backend"

echo "[bundle-backend] Cleaning $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/dist"

echo "[bundle-backend] Compiling TypeScript"
pnpm --dir "$ROOT" build:backend

echo "[bundle-backend] Copying dist and udev rules"
cp -r "$ROOT/dist/." "$OUT/dist/"
mkdir -p "$OUT/config"
cp "$ROOT/backend/config/99-redragon.rules" "$OUT/config/"

cat > "$OUT/package.json" <<'EOF'
{
  "name": "redragon-backend-bundle",
  "private": true,
  "type": "module",
  "dependencies": {
    "chalk": "^5.4.0",
    "commander": "^13.0.0",
    "express": "^5.1.0",
    "node-hid": "^3.1.0",
    "ws": "^8.18.0"
  }
}
EOF

echo "[bundle-backend] Installing production dependencies"
(cd "$OUT" && npm install --omit=dev --no-fund --no-audit)

echo "[bundle-backend] Done → $OUT"
