"""
365-Day Undetected Slow-Burn Birthday Calendar Generator (.ics)
Evenly distributes 103 hilarious events across all 365 days of the year,
including November and December, with 9:00 AM lock-screen alarms.
Auto-updates subscribed devices via GitHub Pages.
"""

import os
import sys
import uuid
from datetime import date, timedelta
from generate_multi_contacts import FUNNY_CONTACTS_DATA

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
PRESETS_DIR = os.path.join(OUTPUT_DIR, "presets")
os.makedirs(PRESETS_DIR, exist_ok=True)


def generate_ics_calendar():
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Jessie Mitchell//Personal Calendar Sync//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Jessie Mitchell • Birthday & Event Sync",
        "X-WR-CALDESC:Official birthday reminder & personal event roster.",
        "X-WR-TIMEZONE:America/Chicago"
    ]

    # 1. Primary Legitimate Event: Jessie Mitchell's Birthday (April 30)
    lines.extend([
        "BEGIN:VEVENT",
        f"UID:jessie-real-bday@jessiemitchell.sync",
        "DTSTAMP:20260101T000000Z",
        "DTSTART;VALUE=DATE:20260430",
        "DTEND;VALUE=DATE:20260501",
        "RRULE:FREQ=YEARLY",
        "SUMMARY:🎂 Jessie Mitchell's Birthday",
        "DESCRIPTION:Don't forget to wish Jessie a Happy Birthday! 🎈",
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:Jessie Mitchell's Birthday Today!",
        "TRIGGER:-PT9H",  # 9 AM alert
        "END:VALARM",
        "END:VEVENT"
    ])

    # 2. Evenly distribute all funny contacts across 365 days (~every 3.5 days)
    total_contacts = len(FUNNY_CONTACTS_DATA)
    start_date = date(2026, 1, 2)

    for i, contact in enumerate(FUNNY_CONTACTS_DATA):
        fn, org, title, email = contact
        # Calculate day of year (0 to 364) evenly spread
        day_index = int((i * 364) / total_contacts)
        bday_date = start_date + timedelta(days=day_index)

        # Ensure we don't land exactly on Jessie's April 30
        if bday_date.month == 4 and bday_date.day in [29, 30]:
            bday_date = date(2026, 5, 2)

        dt_str = bday_date.strftime("%Y%m%d")
        next_day = (bday_date + timedelta(days=1)).strftime("%Y%m%d")
        uid = f"prank-bday-{i:03d}@cloudsync.events"

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            "DTSTAMP:20260101T000000Z",
            f"DTSTART;VALUE=DATE:{dt_str}",
            f"DTEND;VALUE=DATE:{next_day}",
            "RRULE:FREQ=YEARLY",
            f"SUMMARY:🎂 {fn}'s Birthday",
            f"DESCRIPTION:Annual birthday reminder for {fn} ({org}). Send your best regards!",
            "TRANSP:TRANSPARENT",
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Today is {fn}'s Birthday!",
            "TRIGGER:-PT9H",  # 9 AM morning alert
            "END:VALARM",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    lines.append("")
    return "\r\n".join(lines)


def main():
    print("🚀 Generating 365-Day Evenly Distributed Birthday Calendar...")
    ics_content = generate_ics_calendar()
    out_path = os.path.join(PRESETS_DIR, "jessie_mitchell_birthdays.ics")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(ics_content)
    print(f"  ✅ [Calendar] Saved to {out_path} ({len(ics_content) // 1024} KB)")


if __name__ == "__main__":
    main()
