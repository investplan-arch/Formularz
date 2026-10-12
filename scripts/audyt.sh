#!/bin/sh
# Audyt Lighthouse (profil telefonu) dla kluczowych podstron wersji produkcyjnej.
# Użycie: npm run audyt   (wymaga php i Chromium; CHROME_PATH wskazuje przeglądarkę)
set -e
OUT=$(mktemp -d)
node site/build.mjs --mode=production --local --out="$OUT/site" > /dev/null
php -S 127.0.0.1:8099 -t "$OUT/site" > /dev/null 2>&1 &
PID=$!
trap 'kill $PID' EXIT
sleep 1
: "${CHROME_PATH:=$(ls -d ${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)}"
export CHROME_PATH
for p in / /finansowanie-na-start/ /zamow/ /kontakt/; do
  npx lighthouse "http://127.0.0.1:8099$p" --quiet --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="$OUT/r.json" > /dev/null 2>&1
  node -e "const r=require('$OUT/r.json');console.log('$p', Object.values(r.categories).map(c=>c.id+' '+Math.round(c.score*100)).join(', '))"
done
