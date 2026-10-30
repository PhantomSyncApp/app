"""
365+ Day Organic Slow-Burn Calendar Generator (.ics)
Deadpan Edition:
- Zero contacts deleted (all 103 hilarious entities preserved).
- Bespoke, deadpan, bureaucratic, dry official memos embedded into the DESCRIPTION of every event.
- Organic gaps (3 to 11 days):
  * Some weeks have 2 events.
  * Some weeks have 1 event.
  * Some weeks have ZERO events (silent periods for false sense of security).
- First strike delayed to Thursday, November 12, 2026.
- Spans ~18 months naturally across 2026, 2027, and 2028.
- Jessie Mitchell's real birthday on April 30.
- Anonymous container: "Mobile Directory Sync".
- Automatically exports both .ics and schedule_data.json to all targets.
"""

import os
import sys
import json
import random
import shutil
from datetime import date, timedelta
from generate_multi_contacts import FUNNY_CONTACTS_DATA
from deadpan_memos import DEADPAN_MEMOS

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PRESETS_DIR = os.path.join(ROOT_DIR, "presets")
os.makedirs(PRESETS_DIR, exist_ok=True)


def generate_ics_and_schedule():
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

    schedule_data = []

    # 1. Jessie Mitchell's Real Birthday (April 30, Annual)
    jessie_desc = "Don't forget to wish Jessie a Happy Birthday! 🎈 Call, text, or buy him a drink."
    lines.extend([
        "BEGIN:VEVENT",
        "UID:jessie-real-bday@jessiemitchell.sync",
        "DTSTAMP:20260101T000000Z",
        "DTSTART;VALUE=DATE:20260430",
        "DTEND;VALUE=DATE:20260501",
        "RRULE:FREQ=YEARLY",
        "SUMMARY:🎂 Jessie Mitchell's Birthday",
        f"DESCRIPTION:{jessie_desc}",
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:Jessie Mitchell's Birthday Today!",
        "TRIGGER:-PT9H",
        "END:VALARM",
        "END:VEVENT"
    ])

    schedule_data.append({
        "date": "20260430",
        "summary": "Jessie Mitchell's Birthday",
        "desc": jessie_desc,
        "gap": 0
    })

    # 2. Generate Organic Gaps (3 to 11 days)
    random.seed(42)  # Fixed seed for a stable, perfectly balanced roadmap
    start_date = date(2026, 11, 12)
    current = start_date
    dates = [current]

    gap_choices = [3, 4, 5, 6, 7, 8, 9, 10, 11]
    weights =     [15, 20, 25, 15, 10, 6, 4, 3, 2]

    for _ in range(len(FUNNY_CONTACTS_DATA) - 1):
        gap = random.choices(gap_choices, weights=weights)[0]
        current += timedelta(days=gap)
        dates.append(current)

    # 3. Add all 103 hilarious entities with deadpan memos
    for i, contact in enumerate(FUNNY_CONTACTS_DATA):
        fn, org, title, email = contact
        bday_date = dates[i]

        # Avoid collision on Jessie's April 30
        if bday_date.month == 4 and bday_date.day in [29, 30]:
            bday_date += timedelta(days=2)

        dt_str = bday_date.strftime("%Y%m%d")
        next_day = (bday_date + timedelta(days=1)).strftime("%Y%m%d")
        uid = f"prank-dir-{i:03d}@mobiledirectory.sync"

        # Lookup custom deadpan memo
        memo = DEADPAN_MEMOS.get(fn, f"System memo: Mobile directory record for {fn} ({org}).")

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            "DTSTAMP:20260101T000000Z",
            f"DTSTART;VALUE=DATE:{dt_str}",
            f"DTEND;VALUE=DATE:{next_day}",
            "RRULE:FREQ=YEARLY",
            f"SUMMARY:🎂 {fn}'s Birthday",
            f"DESCRIPTION:{memo}",
            "TRANSP:TRANSPARENT",
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Today is {fn}'s Birthday!",
            "TRIGGER:-PT9H",
            "END:VALARM",
            "END:VEVENT"
        ])

        # Calculate gap from previous event
        if i == 0:
            event_gap = (bday_date - date(2026, 4, 30)).days
        else:
            prev_bday = dates[i - 1]
            if prev_bday.month == 4 and prev_bday.day in [29, 30]:
                prev_bday += timedelta(days=2)
            event_gap = (bday_date - prev_bday).days

        schedule_data.append({
            "date": dt_str,
            "summary": f"{fn}'s Birthday",
            "desc": memo,
            "gap": event_gap
        })

    lines.append("END:VCALENDAR")
    lines.append("")
    ics_text = "\r\n".join(lines)
    return ics_text, schedule_data


def main():
    print("🚀 Generating Deadpan Slow-Burn Calendar (.ics & JSON)...")
    ics_content, schedule_data = generate_ics_and_schedule()

    # 1. Save presets/jessie_mitchell_birthdays.ics
    out_ics = os.path.join(PRESETS_DIR, "jessie_mitchell_birthdays.ics")
    with open(out_ics, "w", encoding="utf-8") as f:
        f.write(ics_content)
    print(f"  ✅ [Calendar] Saved to {out_ics} ({len(ics_content) // 1024} KB)")

    # 2. Save schedule_data.json
    out_json = os.path.join(ROOT_DIR, "schedule_data.json")
    json_str = json.dumps(schedule_data, indent=2, ensure_ascii=False)
    with open(out_json, "w", encoding="utf-8") as f:
        f.write(json_str)
    print(f"  ✅ [Schedule JSON] Saved to {out_json} ({len(schedule_data)} events)")

    # 3. Sync to public_deploy/ and web/
    deploy_dirs = [os.path.join(ROOT_DIR, "public_deploy"), os.path.join(ROOT_DIR, "web")]
    for d in deploy_dirs:
        if os.path.exists(d):
            # Sync json
            shutil.copy(out_json, os.path.join(d, "schedule_data.json"))
            # Sync ics
            d_presets = os.path.join(d, "presets")
            os.makedirs(d_presets, exist_ok=True)
            shutil.copy(out_ics, os.path.join(d_presets, "jessie_mitchell_birthdays.ics"))
            print(f"  ✅ [Synced] Assets updated in {os.path.basename(d)}/")

    print("\n🎉 All 104 events generated with deadpan bureaucratic memos!")


if __name__ == "__main__":
    main()
