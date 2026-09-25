#!/usr/bin/env python3
import json
import sys
from pathlib import Path

APP_DIR = Path.home() / "Library" / "Application Support" / "RecruitingCalendar"
POSITION_FILE = APP_DIR / "position.json"
DEFAULT = {"left": 18, "top": 18}


def main():
    APP_DIR.mkdir(parents=True, exist_ok=True)

    if len(sys.argv) >= 2 and sys.argv[1] == "reset":
        value = dict(DEFAULT)
    elif len(sys.argv) >= 3:
        try:
            value = {
                "left": max(0, int(round(float(sys.argv[1])))),
                "top": max(0, int(round(float(sys.argv[2])))),
            }
        except Exception:
            value = dict(DEFAULT)
    else:
        value = dict(DEFAULT)

    tmp = POSITION_FILE.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
    tmp.replace(POSITION_FILE)

    print(json.dumps(value, ensure_ascii=False))


if __name__ == "__main__":
    main()
