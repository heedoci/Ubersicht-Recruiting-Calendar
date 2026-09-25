#!/usr/bin/env python3
import json
import sys
from pathlib import Path

APP_DIR = Path.home() / "Library" / "Application Support" / "RecruitingCalendar"
CONFIG_FILE = APP_DIR / "config.json"


def read_config():
    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as f:
            value = json.load(f)
            return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def write_config(value):
    APP_DIR.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG_FILE.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
    tmp.replace(CONFIG_FILE)


def main():
    raw = sys.argv[1].strip().lower() if len(sys.argv) >= 2 else "true"
    enabled = raw in ("1", "true", "yes", "on")

    cfg = read_config()
    cfg["hoverEnabled"] = enabled
    write_config(cfg)

    print(json.dumps({"hoverEnabled": enabled}, ensure_ascii=False))


if __name__ == "__main__":
    main()
