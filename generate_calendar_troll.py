"""
365+ Day Organic Slow-Burn Calendar Generator (.ics)
100% Anonymous Stealth & Deadpan Edition:
- Zero references to Jessie Mitchell (total plausible deniability).
- All 103 hilarious entities preserved.
- Bespoke, deadpan, bureaucratic, dry official memos embedded into the DESCRIPTION of every event.
- Organic gaps (3 to 11 days):
  * Some weeks have 2 events.
  * Some weeks have 1 event.
  * Some weeks have ZERO events (silent periods for false sense of security).
- First strike delayed to Thursday, November 12, 2026 (13 days of stealth silence).
- Spans ~18 months naturally across 2026, 2027, and 2028 in strict chronological order.
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
    tap_date = date(2026, 10, 30)  # Day target tapped the NFC card

    # 1. Generate Organic Gaps (3 to 11 days)
    random.seed(42)  # Fixed seed for a stable, perfectly balanced roadmap
    start_date = date(2026, 11, 12)  # Thursday, November 12, 2026 (First strike)
    current = start_date
    dates = [current]

    gap_choices = [3, 4, 5, 6, 7, 8, 9, 10, 11]
    weights =     [15, 20, 25, 15, 10, 6, 4, 3, 2]

    for _ in range(len(FUNNY_CONTACTS_DATA) - 1):
        gap = random.choices(gap_choices, weights=weights)[0]
        current += timedelta(days=gap)
        dates.append(current)

    # 2. Add all 103 hilarious entities with deadpan memos (Strict Chronological Order)
    for i, contact in enumerate(FUNNY_CONTACTS_DATA):
        fn, org, title, email = contact
        bday_date = dates[i]

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

        # Calculate gap: for the very first event, gap from NFC tap date; for subsequent, gap from previous event
        if i == 0:
            event_gap = (bday_date - tap_date).days  # Exactly 13 days of radio silence
        else:
            event_gap = (bday_date - dates[i - 1]).days

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
    print("🚀 Generating 100% Anonymous Deadpan Slow-Burn Calendar (.ics & JSON)...")
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

    print(f"\n🎉 All {len(schedule_data)} events generated in strict chronological order!")


if __name__ == "__main__":
    main()
