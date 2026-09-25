#!/usr/bin/env python3
import datetime as dt
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

WIDGET_DIR = Path(__file__).resolve().parent
APP_DIR = Path.home() / "Library" / "Application Support" / "RecruitingCalendar"
CONFIG_FILE = APP_DIR / "config.json"
STATE_FILE = APP_DIR / "state.json"
CACHE_FILE = APP_DIR / "last_good.json"
POSITION_FILE = APP_DIR / "position.json"
ADAPTER_FILE = WIDGET_DIR / "source_adapter.py"

DEFAULT_CONFIG = {
    "notificationsEnabled": True,
    "notificationOnlyFavorites": False,
    "favoriteCompanies": [],
    "newBadgeHours": 36,
    "maxNotificationItems": 4,
    "hoverEnabled": True,
}


def ensure_app_dir():
    APP_DIR.mkdir(parents=True, exist_ok=True)


def read_json(path, default):
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def write_json(path, value):
    ensure_app_dir()
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def load_config():
    ensure_app_dir()
    if not CONFIG_FILE.exists():
        write_json(CONFIG_FILE, DEFAULT_CONFIG)
        return dict(DEFAULT_CONFIG)

    value = read_json(CONFIG_FILE, {})
    result = dict(DEFAULT_CONFIG)
    if isinstance(value, dict):
        result.update(value)
    return result


def load_position():
    value = read_json(POSITION_FILE, {"left": 18, "top": 18})
    try:
        return {
            "left": max(0, int(value.get("left", 18))),
            "top": max(0, int(value.get("top", 18))),
        }
    except Exception:
        return {"left": 18, "top": 18}


def normalize_date(value):
    if not value:
        return ""

    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return dt.datetime.strptime(text[:10], fmt).date().isoformat()
        except Exception:
            pass
    return ""


def make_job_id(job):
    material = "\x1f".join(
        [
            str(job.get("url", "")),
            str(job.get("company", "")),
            str(job.get("title", "")),
            str(job.get("closesAt", "")),
        ]
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:24]


def load_source_adapter():
    if not ADAPTER_FILE.exists():
        raise RuntimeError(
            "Private source adapter is not installed. "
            "Create RecruitingCalendar.widget/source_adapter.py locally. "
            "See source_adapter.example.py for the expected interface."
        )

    spec = importlib.util.spec_from_file_location(
        "recruiting_calendar_source_adapter",
        ADAPTER_FILE,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load source_adapter.py")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    fetch = getattr(module, "fetch_jobs", None)
    if not callable(fetch):
        raise RuntimeError("source_adapter.py must define fetch_jobs()")

    return module, fetch


def normalize_jobs(raw_jobs):
    if not isinstance(raw_jobs, list):
        raise RuntimeError("source_adapter.fetch_jobs() must return a list")

    jobs = []
    seen = set()

    for obj in raw_jobs:
        if not isinstance(obj, dict):
            continue

        company = str(obj.get("company", "")).strip()
        title = str(obj.get("title", "")).strip()
        if not company or not title:
            continue

        job = {
            "company": company,
            "title": title,
            "url": str(obj.get("url", "")).strip(),
            "kind": str(obj.get("kind", "")).strip(),
            "origin": str(obj.get("origin", "")).strip(),
            "category": str(obj.get("category", "")).strip(),
            "employment": str(obj.get("employment", "")).strip(),
            "region": str(obj.get("region", "")).strip(),
            "closesAt": normalize_date(obj.get("closesAt")),
            "closeType": str(obj.get("closeType", "")).strip(),
            "memo": str(obj.get("memo", "")).strip(),
            "pinned": bool(obj.get("pinned", False)),
        }

        job["id"] = make_job_id(job)
        if job["id"] in seen:
            continue

        seen.add(job["id"])
        jobs.append(job)

    jobs.sort(
        key=lambda j: (
            j["closesAt"] == "",
            j["closesAt"] or "9999-12-31",
            j["company"],
            j["title"],
        )
    )
    return jobs


def js_escape(text):
    return str(text).replace("\\", "\\\\").replace('"', '\\"')


def mac_notify(title, message):
    script = (
        f'display notification "{js_escape(message)}" '
        f'with title "{js_escape(title)}"'
    )
    try:
        subprocess.run(
            ["osascript", "-e", script],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
        )
    except Exception:
        pass


def apply_seen_state(jobs, cfg):
    state = read_json(STATE_FILE, {"initialized": False, "seen": {}})
    if not isinstance(state, dict):
        state = {"initialized": False, "seen": {}}

    initialized = bool(state.get("initialized"))
    old_seen = state.get("seen") if isinstance(state.get("seen"), dict) else {}
    now = dt.datetime.now().astimezone()
    now_iso = now.isoformat(timespec="seconds")
    new_seen = dict(old_seen)
    current_ids = {job["id"] for job in jobs}
    new_jobs = []

    for job in jobs:
        jid = job["id"]
        entry = old_seen.get(jid)

        if entry is None:
            first_seen = now_iso if initialized else None
            new_seen[jid] = {"firstSeen": first_seen}
            if initialized:
                new_jobs.append(job)
        else:
            first_seen = entry.get("firstSeen") if isinstance(entry, dict) else None
            new_seen[jid] = {"firstSeen": first_seen}

        job["firstSeen"] = new_seen.get(jid, {}).get("firstSeen")
        job["isNew"] = False

        if job["firstSeen"]:
            try:
                first = dt.datetime.fromisoformat(job["firstSeen"])
                age_hours = (now - first).total_seconds() / 3600
                job["isNew"] = (
                    0
                    <= age_hours
                    <= float(cfg.get("newBadgeHours", 36))
                )
            except Exception:
                pass

    if len(new_seen) > 5000:
        preserved = {
            jid: new_seen[jid]
            for jid in current_ids
            if jid in new_seen
        }
        extras = [
            (jid, value)
            for jid, value in new_seen.items()
            if jid not in current_ids
        ]
        extras = extras[-max(0, 5000 - len(preserved)) :]
        preserved.update(dict(extras))
        new_seen = preserved

    write_json(
        STATE_FILE,
        {
            "initialized": True,
            "seen": new_seen,
            "lastRun": now_iso,
        },
    )
    return new_jobs


def maybe_notify(new_jobs, cfg):
    if not cfg.get("notificationsEnabled", True) or not new_jobs:
        return

    favorites = [
        str(value).strip()
        for value in cfg.get("favoriteCompanies", [])
        if str(value).strip()
    ]

    notify_jobs = new_jobs
    if cfg.get("notificationOnlyFavorites", False):
        notify_jobs = [
            job
            for job in new_jobs
            if job.get("company") in favorites
        ]

    if not notify_jobs:
        return

    max_items = max(
        1,
        min(int(cfg.get("maxNotificationItems", 4) or 4), 8),
    )

    if len(notify_jobs) == 1:
        job = notify_jobs[0]
        mac_notify(
            f"신규 채용 · {job['company']}",
            job["title"],
        )
        return

    names = []
    for job in notify_jobs[:max_items]:
        if job["company"] not in names:
            names.append(job["company"])

    suffix = (
        ""
        if len(notify_jobs) <= max_items
        else f" 외 {len(notify_jobs) - max_items}개"
    )
    mac_notify(
        f"신규 채용공고 {len(notify_jobs)}개",
        " · ".join(names) + suffix,
    )


def decorate(jobs, cfg):
    favorites = {
        str(value).strip()
        for value in cfg.get("favoriteCompanies", [])
        if str(value).strip()
    }
    today = dt.date.today()

    for job in jobs:
        job["favorite"] = job.get("company") in favorites
        job["daysLeft"] = None

        close = job.get("closesAt", "")
        if close:
            try:
                job["daysLeft"] = (
                    dt.date.fromisoformat(close) - today
                ).days
            except Exception:
                pass

    return jobs


def main():
    cfg = load_config()
    position = load_position()
    used_cache = False
    warning = ""
    source_label = "private-adapter"

    try:
        module, fetch = load_source_adapter()
        source_label = str(
            getattr(module, "SOURCE_LABEL", "private-adapter")
        )

        jobs = normalize_jobs(fetch())
        if not jobs:
            raise RuntimeError("The source adapter returned no jobs")

        write_json(
            CACHE_FILE,
            {
                "jobs": jobs,
                "savedAt": dt.datetime.now()
                .astimezone()
                .isoformat(timespec="seconds"),
            },
        )
    except Exception as exc:
        cached = read_json(CACHE_FILE, {})
        cached_jobs = (
            cached.get("jobs")
            if isinstance(cached, dict)
            else None
        )

        if isinstance(cached_jobs, list) and cached_jobs:
            jobs = cached_jobs
            used_cache = True
            warning = (
                "실시간 갱신 실패 — 마지막 저장 데이터를 표시합니다. "
                f"({type(exc).__name__})"
            )
        else:
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": f"{type(exc).__name__}: {exc}",
                        "jobs": [],
                        "count": 0,
                        "source": source_label,
                        "hoverEnabled": bool(
                            cfg.get("hoverEnabled", True)
                        ),
                        "configPath": str(CONFIG_FILE),
                        "widgetPosition": position,
                    },
                    ensure_ascii=False,
                )
            )
            return

    new_jobs = apply_seen_state(jobs, cfg)
    maybe_notify(new_jobs, cfg)
    jobs = decorate(jobs, cfg)

    now = dt.datetime.now().astimezone()
    print(
        json.dumps(
            {
                "ok": True,
                "jobs": jobs,
                "count": len(jobs),
                "newCount": len(new_jobs),
                "fetchedAt": now.isoformat(timespec="minutes"),
                "source": source_label,
                "usedCache": used_cache,
                "warning": warning,
                "favorites": cfg.get("favoriteCompanies", []),
                "notificationsEnabled": bool(
                    cfg.get("notificationsEnabled", True)
                ),
                "notificationOnlyFavorites": bool(
                    cfg.get("notificationOnlyFavorites", False)
                ),
                "hoverEnabled": bool(
                    cfg.get("hoverEnabled", True)
                ),
                "configPath": str(CONFIG_FILE),
                "widgetPosition": position,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
