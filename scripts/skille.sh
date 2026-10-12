#!/bin/sh
# Odtworzenie lub aktualizacja skilli projektu (Claude Code, zakres projektu, kopie plików).
# Skille są zapisane w .claude/skills/, a źródła i sumy kontrolne w skills-lock.json.
# Uruchamiaj z katalogu głównego repozytorium. Impeccable instalowany jest bez hooków.
set -e
export DISABLE_TELEMETRY=1
npx -y skills add vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code --copy -y
npx -y skills add leonxlnx/taste-skill --skill minimalist-ui --agent claude-code --copy -y
npx -y skills add coreyhaines31/marketingskills --skill seo-audit --agent claude-code --copy -y
npx -y skills add pbakaus/impeccable --skill impeccable --agent claude-code --copy -y
