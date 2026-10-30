"""
365-Day Undetected Slow-Burn Birthday Calendar Generator (.ics)
Creates an RFC 5545 iCalendar file that:
1. Puts Jessie Mitchell's real birthday (April 30) as Event #1.
2. Injects 100 hilarious unique contacts with annual recurring birthdays staggered every 2-3 days all year.
3. Includes 9:00 AM morning lock-screen notifications (VALARM).
4. Disguised as "Jessie Mitchell • Birthday & Event Sync".
5. Deletes in 1 click via Settings -> Calendar -> Subscriptions whenever desired.
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
    uid_jessie = str(uuid.uuid4())
    lines.extend([
        "BEGIN:VEVENT",
        f"UID:{uid_jessie}@jessiemitchell.sync",
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
        "TRIGGER:-PT9H",  # 9 AM morning alert
        "END:VALARM",
        "END:VEVENT"
    ])

    # 2. 100 Hilarious Staggered Birthdays
    start_date = date(2026, 1, 2)
    step_days = max(1, 360 // len(FUNNY_CONTACTS_DATA))

    for i, contact in enumerate(FUNNY_CONTACTS_DATA):
        fn, org, title, email = contact
        bday_offset = (i * step_days) % 360
        bday_date = start_date + timedelta(days=bday_offset)
        # Avoid overriding Jessie's April 30
        if bday_date.month == 4 and bday_date.day == 30:
            bday_date += timedelta(days=2)

        dt_str = bday_date.strftime("%Y%m%d")
        next_day = (bday_date + timedelta(days=1)).strftime("%Y%m%d")
        uid = str(uuid.uuid4())

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}@cloudsync.events",
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
            "TRIGGER:-PT9H",  # 9 AM morning lock screen alert
            "END:VALARM",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    lines.append("")
    return "\r\n".join(lines)


def main():
    print("🚀 Generating Undetected Slow-Burn Birthday Calendar (.ics)...")
    ics_content = generate_ics_calendar()
    out_path = os.path.join(PRESETS_DIR, "jessie_mitchell_birthdays.ics")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(ics_content)
    print(f"  ✅ [Calendar] Saved to {out_path} ({len(ics_content) // 1024} KB)")


if __name__ == "__main__":
    main()
