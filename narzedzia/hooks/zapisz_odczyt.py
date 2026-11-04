#!/usr/bin/env python3
"""Hook PostToolUse dla mcp__meta-inbox__list_messages i get_conversation.

Zapisuje, który wątek i kiedy został przeczytany w całości. Hook wysyłki
sprawdza ten dziennik, żeby nie dało się odpisać na podstawie samego
podglądu z listy rozmów (błąd z 1.11.2026).
"""
import json
import sys
import time
from pathlib import Path

DZIENNIK = Path.home() / ".cache" / "kapitalownia" / "odczyty.jsonl"


def main():
    wejscie = json.load(sys.stdin)
    watek = (wejscie.get("tool_input") or {}).get("conversation_id")
    odp = wejscie.get("tool_response")
    ile = 0
    try:
        tekst = odp if isinstance(odp, str) else json.dumps(odp)
        ile = tekst.count('"created_time"') or tekst.count('created_time')
    except Exception:
        pass
    if watek:
        DZIENNIK.parent.mkdir(parents=True, exist_ok=True)
        with DZIENNIK.open("a") as f:
            f.write(json.dumps({"watek": watek, "czas": time.time(), "ile": ile}) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
