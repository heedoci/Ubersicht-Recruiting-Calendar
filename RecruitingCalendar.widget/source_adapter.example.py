"""Example local data adapter.

Copy this file to source_adapter.py and replace fetch_jobs() with your own
private source implementation. source_adapter.py is intentionally ignored
by Git.
"""

import json
from pathlib import Path

SOURCE_LABEL = "local-json"
DATA_FILE = (
    Path.home()
    / "Library"
    / "Application Support"
    / "RecruitingCalendar"
    / "jobs.json"
)


def fetch_jobs():
    """Return a list of job dictionaries.

    Required:
      company, title

    Optional:
      url, category, employment, region, closesAt, closeType,
      kind, origin, memo, pinned
    """
    with DATA_FILE.open("r", encoding="utf-8") as f:
        value = json.load(f)

    if not isinstance(value, list):
        raise ValueError("jobs.json must contain a JSON array")

    return value
