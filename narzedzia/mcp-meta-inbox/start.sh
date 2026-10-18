#!/usr/bin/env bash
# Uruchamia serwer MCP skrzynki Messengera. Przy pierwszym starcie instaluje
# zależności (SDK MCP i zod) z package-lock.json.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm ci --omit=dev --silent >&2
fi
exec node build/index.js
