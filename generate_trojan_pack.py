"""
Trojan Horse Contact Pack Generator
Primary Contact: Jessi Mitchell (Real info)
Hidden Payload: 100 completely unique handcrafted funny contacts with staggered birthdays.
Disguised cleanup tag: CATEGORIES:CloudSync
"""

import os
import sys
import random
from datetime import date, timedelta
from generate_multi_contacts import FUNNY_CONTACTS_DATA, EMOJIS, create_mini_avatar

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
PRESETS_DIR = os.path.join(OUTPUT_DIR, "presets")
os.makedirs(PRESETS_DIR, exist_ok=True)


def create_jessi_contact():
    """Generates the primary legitimate contact card for Jessi Mitchell."""
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Mitchell;Jessi;;;",
        "FN:Jessi Mitchell",
        "TEL;TYPE=CELL,VOICE:+1-256-822-4733",
        "EMAIL;TYPE=INTERNET,HOME:jessiwayne430@gmail.com",
        "BDAY:1990-04-30",
        "NOTE:Personal Contact",
        "CATEGORIES:Personal",
        "END:VCARD"
    ]
    return "\r\n".join(lines)


def generate_trojan_vcf(count=100):
    """
    Combines Jessi's real contact as #1, followed by `count` unique funny contacts
    with staggered birthdays and the subtle 'CloudSync' cleanup tag.
    """
    vcard_entries = []
    # 1. Primary Real Contact
    vcard_entries.append(create_jessi_contact())

    SUBTLE_NOTES = [
        "Sync ID: CS-9042 • Added via mobile contact exchange.",
        "Profile verified • Automated calendar sync enabled.",
        "Contact reference: CLOUD-SYNC-NODE-7.",
        "Mobile directory entry • Verified connection."
    ]

    start_date = date(2000, 1, 1)
    step_days = max(1, 365 // max(1, count))

    bg_palette = [
        (220, 38, 38), (234, 88, 12), (202, 138, 4), (22, 163, 74),
        (13, 148, 136), (37, 99, 235), (124, 58, 237), (30, 41, 59)
    ]
    avatar_pool = [create_mini_avatar(EMOJIS[i % len(EMOJIS)], bg) for i, bg in enumerate(bg_palette)]

    for i in range(min(count, len(FUNNY_CONTACTS_DATA))):
        fn, org, title, email = FUNNY_CONTACTS_DATA[i]
        parts = fn.split(" ")
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else "Contact"

        bday_offset = (i * step_days) % 365
        bday_date = start_date + timedelta(days=bday_offset)
        bday_full = bday_date.strftime("2000-%m-%d")

        area_code = random.choice(["800", "888", "555", "312", "415", "646", "212"])
        phone = f"+1-{area_code}-{random.randint(100,999):03d}-{random.randint(1000,9999):04d}"

        vcard_lines = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            f"N:{last_name};{first_name};;;",
            f"FN:{fn}",
            f"ORG:{org}",
            f"TITLE:{title}",
            f"TEL;TYPE=CELL,VOICE:{phone}",
            f"EMAIL;TYPE=INTERNET:{email}",
            f"BDAY:{bday_full}",
            f"NOTE:{random.choice(SUBTLE_NOTES)}",
            "CATEGORIES:CloudSync"
        ]

        if avatar_pool:
            vcard_lines.append(f"PHOTO;TYPE=JPEG;ENCODING=b:{avatar_pool[i % len(avatar_pool)]}")

        vcard_lines.append("END:VCARD")
        vcard_entries.append("\r\n".join(vcard_lines))

    return "\r\n".join(vcard_entries)


def main():
    print("🚀 Generating Jessi Mitchell Trojan Contact Packs...")

    # 1. Clean Single Contact
    clean_vcf = create_jessi_contact()
    with open(os.path.join(PRESETS_DIR, "jessi_mitchell_clean.vcf"), "w", encoding="utf-8") as f:
        f.write(clean_vcf)

    # 2. Stealth 10 Pack
    t10 = generate_trojan_vcf(9) # Jessi + 9 = 10 total
    with open(os.path.join(PRESETS_DIR, "jessi_mitchell_10.vcf"), "w", encoding="utf-8") as f:
        f.write(t10)
    print(f"  ✅ [Stealth 10 Pack] (Jessi + 9 hilarious contacts)")

    # 3. Stealth 25 Pack
    t25 = generate_trojan_vcf(24) # Jessi + 24 = 25 total
    with open(os.path.join(PRESETS_DIR, "jessi_mitchell_25.vcf"), "w", encoding="utf-8") as f:
        f.write(t25)
    print(f"  ✅ [Stealth 25 Pack] (Jessi + 24 hilarious contacts)")

    # 4. Medium 50 Pack
    t50 = generate_trojan_vcf(49) # Jessi + 49 = 50 total
    with open(os.path.join(PRESETS_DIR, "jessi_mitchell_50.vcf"), "w", encoding="utf-8") as f:
        f.write(t50)
    print(f"  ✅ [Medium 50 Pack] (Jessi + 49 hilarious contacts)")

    # 5. Full 100 Pack (Default)
    t100 = generate_trojan_vcf(100) # Jessi + 100 = 101 total
    with open(os.path.join(PRESETS_DIR, "jessi_mitchell.vcf"), "w", encoding="utf-8") as f:
        f.write(t100)
    print(f"  ✅ [Full 100 Pack] (Jessi + 100 completely unique handcrafted contacts)")

    print("\n✨ All Trojan Horse packs updated successfully!")


if __name__ == "__main__":
    main()
