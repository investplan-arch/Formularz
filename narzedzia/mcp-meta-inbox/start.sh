#!/usr/bin/env bash
# Uruchamia serwer MCP skrzynki Messengera. Przy pierwszym starcie instaluje
# zależności (SDK MCP i zod) z package-lock.json.
set -euo pipefail
cd "$(dirname "$0")"
# Aktualny token z ~/.zshrc, żeby nowy token działał bez restartu Claude Code
# (wystarczy ponownie połączyć serwer w /mcp).
if [ -f "$HOME/.zshrc" ] && command -v zsh >/dev/null; then
  tok=$(zsh -c 'source "$HOME/.zshrc" >/dev/null 2>&1; printf %s "${META_PAGE_ACCESS_TOKEN:-}"' 2>/dev/null || true)
  [ -n "$tok" ] && export META_PAGE_ACCESS_TOKEN="$tok"
fi
if [ ! -d node_modules ]; then
  npm ci --omit=dev --silent >&2
fi
exec node build/index.js
