# Übersicht Recruiting Calendar

A desktop recruiting calendar widget for macOS [Übersicht](https://tracesof.net/uebersicht/).

This repository contains the **UI and generic job-processing layer only**. The private data-source implementation is intentionally excluded so source URLs, request headers, selectors, credentials, and site-specific scraping logic are not published.

## Features

- Monthly recruiting calendar
- Category filters with integrated color dots
- Closing-date D-day labels
- Closed-posting strikethrough styling
- Recent-postings list
- Scrollable ongoing / rolling recruitment list
- Optional date hover details with ON/OFF toggle
- Favorite companies
- macOS notifications for newly detected postings
- Draggable widget position with persistence
- Cached last-known-good data when the source is temporarily unavailable

## Installation

Copy `RecruitingCalendar.widget` into:

```text
~/Library/Application Support/Übersicht/widgets/
```

Then refresh widgets in Übersicht.

## Private data adapter

The widget expects a local file named:

```text
RecruitingCalendar.widget/source_adapter.py
```

That file is ignored by Git on purpose.

Start from the included example:

```bash
cp RecruitingCalendar.widget/source_adapter.example.py \
   RecruitingCalendar.widget/source_adapter.py
```

Then implement:

```python
def fetch_jobs():
    return [
        {
            "company": "Example Company",
            "title": "Research Associate",
            "url": "https://example.invalid/job/123",
            "category": "연구개발",
            "employment": "정규직",
            "region": "서울",
            "closesAt": "2026-10-31",
            "closeType": "마감일",
        }
    ]
```

Required fields are `company` and `title`. All other fields are optional.

### Supported fields

| Field | Purpose |
| --- | --- |
| `company` | Company name |
| `title` | Posting title |
| `url` | Original posting URL |
| `category` | Used by category filters |
| `employment` | Employment type |
| `region` | Region / location |
| `closesAt` | Closing date in `YYYY-MM-DD` format |
| `closeType` | Closing type, e.g. rolling / ongoing |
| `kind` | Optional source-specific classification |
| `origin` | Optional source label |
| `memo` | Optional memo |
| `pinned` | Optional pinned flag |

## Local configuration

Runtime configuration is stored outside the repository at:

```text
~/Library/Application Support/RecruitingCalendar/config.json
```

Default structure:

```json
{
  "notificationsEnabled": true,
  "notificationOnlyFavorites": false,
  "favoriteCompanies": [],
  "newBadgeHours": 36,
  "maxNotificationItems": 4,
  "hoverEnabled": true
}
```

## Privacy / source separation

The public code does **not** contain the original job board URL, embedded endpoints, HTTP headers, Referer values, selectors, or parsing logic for any specific website.

Keep those details only in your local `source_adapter.py`.
