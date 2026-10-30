"""
365-Day Undetected Slow-Burn Calendar Generator (.ics)
Generic system name: "Mobile Directory Sync" (Zero mention of user name or "birthday" in series title).
Events: All 103 hilarious entities with annual recurring days and 9:00 AM lock-screen alarms.
Auto-updates subscribed devices via GitHub Pages.
"""

import os
import sys
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
        "PRODID:-//Mobile Directory//System Sync Feed//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Mobile Directory Sync",
        "X-WR-CALDESC:Automated directory synchronization feed.",
        "X-WR-TIMEZONE:America/Chicago"
    ]

    # 1. Jessie Mitchell's Real Birthday (April 30)
    lines.extend([
        "BEGIN:VEVENT",
        "UID:jessie-real-bday@jessiemitchell.sync",
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
        "TRIGGER:-PT9H",
        "END:VALARM",
        "END:VEVENT"
    ])

    # 2. Evenly distribute all funny entities across 365 days
    total_contacts = len(FUNNY_CONTACTS_DATA)
    start_date = date(2026, 1, 2)

    for i, contact in enumerate(FUNNY_CONTACTS_DATA):
        fn, org, title, email = contact
        day_index = int((i * 364) / total_contacts)
        bday_date = start_date + timedelta(days=day_index)

        # Skip Jessie's April 30
        if bday_date.month == 4 and bday_date.day in [29, 30]:
            bday_date = date(2026, 5, 2)

        dt_str = bday_date.strftime("%Y%m%d")
        next_day = (bday_date + timedelta(days=1)).strftime("%Y%m%d")
        uid = f"prank-dir-{i:03d}@mobiledirectory.sync"

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            "DTSTAMP:20260101T000000Z",
            f"DTSTART;VALUE=DATE:{dt_str}",
            f"DTEND;VALUE=DATE:{next_day}",
            "RRULE:FREQ=YEARLY",
            f"SUMMARY:🎂 {fn}'s Birthday",
            f"DESCRIPTION:Annual directory reminder: {fn} ({org}).",
            "TRANSP:TRANSPARENT",
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Today is {fn}'s Birthday!",
            "TRIGGER:-PT9H",
            "END:VALARM",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    lines.append("")
    return "\r\n".join(lines)


def main():
    print("🚀 Generating Anonymous 'Mobile Directory Sync' Calendar...")
    ics_content = generate_ics_calendar()
    out_path = os.path.join(PRESETS_DIR, "jessie_mitchell_birthdays.ics")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(ics_content)
    print(f"  ✅ [Calendar] Saved to {out_path} ({len(ics_content) // 1024} KB)")


if __name__ == "__main__":
    main()
