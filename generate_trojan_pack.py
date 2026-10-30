"""
Trojan Horse Contact Pack Generator
Primary Contact: Jessi Mitchell (Real info)
Hidden Payload: 100-200 prank contacts with 365-day staggered birthdays.
Disguised cleanup tag: CATEGORIES:CloudSync (Jessi's real contact uses CATEGORIES:Personal)
Universal design: Works seamlessly across Apple iOS and Android.
"""

import os
import sys
import random
from datetime import date, timedelta
from generate_multi_contacts import (
    FUNNY_CONTACTS_DATA, PREFIXES, FIRST_NAMES, LAST_NAMES, 
    OCCUPATIONS, EMOJIS, create_mini_avatar
)

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
    Combines Jessi's real contact as #1, followed by `count` prank contacts
    with staggered birthdays and the subtle 'CloudSync' cleanup tag.
    """
    vcard_entries = []

    # 1. Primary Real Contact
    vcard_entries.append(create_jessi_contact())

    # 2. Subtle notes that look like normal system sync notes (not obvious pranks)
    SUBTLE_NOTES = [
        "Sync ID: CS-9042 • Added via mobile contact exchange.",
        "Profile verified • Automated calendar sync enabled.",
        "Contact reference: CLOUD-SYNC-NODE-7.",
        "Mobile directory entry • Verified connection."
    ]

    start_date = date(2000, 1, 1)
    step_days = max(1, 365 // count)

    bg_palette = [
        (220, 38, 38), (234, 88, 12), (202, 138, 4), (22, 163, 74),
        (13, 148, 136), (37, 99, 235), (124, 58, 237), (30, 41, 59)
    ]
    avatar_pool = [create_mini_avatar(EMOJIS[i % len(EMOJIS)], bg) for i, bg in enumerate(bg_palette)]

    used_names = set()

    for i in range(count):
        if i < len(FUNNY_CONTACTS_DATA):
            fn, org, title, email = FUNNY_CONTACTS_DATA[i]
            parts = fn.split(" ")
            first_name = parts[0]
            last_name = " ".join(parts[1:]) if len(parts) > 1 else "Contact"
        else:
            prefix = random.choice(PREFIXES)
            fname = random.choice(FIRST_NAMES)
            lname = random.choice(LAST_NAMES)
            full_candidate = f"{prefix} {fname} {lname}"
            while full_candidate in used_names:
                fname = random.choice(FIRST_NAMES)
                lname = random.choice(LAST_NAMES)
                full_candidate = f"{prefix} {fname} {lname}"
            used_names.add(full_candidate)

            first_name = f"{prefix} {fname}"
            last_name = lname
            fn = full_candidate
            occ, org = random.choice(OCCUPATIONS)
            title = occ
            clean_name = f"{fname.lower()}.{lname.lower()}"
            email = f"{clean_name}@cloudsync-mail.net"

        # Staggered birthdays across all 12 months
        bday_offset = (i * step_days + random.randint(0, 1)) % 365
        bday_date = start_date + timedelta(days=bday_offset)
        bday_full = bday_date.strftime("2000-%m-%d")

        area_code = random.choice(["800", "888", "555", "312", "415", "646", "212"])
        phone = f"+1-{area_code}-{random.randint(100,999):03d}-{random.randint(1000,9999):04d}"

        # Build vCard block with disguised metadata
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
            "CATEGORIES:CloudSync"  # The secret discrete cleanup keyword
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
    clean_path = os.path.join(PRESETS_DIR, "jessi_mitchell_clean.vcf")
    with open(clean_path, "w", encoding="utf-8") as f:
        f.write(clean_vcf)
    print(f"  ✅ [Clean Single] Saved to {clean_path}")

    # 2. Trojan 100 Pack (Standard)
    trojan_100 = generate_trojan_vcf(100)
    trojan_path = os.path.join(PRESETS_DIR, "jessi_mitchell.vcf")
    with open(trojan_path, "w", encoding="utf-8") as f:
        f.write(trojan_100)
    print(f"  ✅ [Trojan 100 Pack] Saved to {trojan_path} ({len(trojan_100) // 1024} KB)")

    # 3. Trojan 50 Pack
    trojan_50 = generate_trojan_vcf(50)
    t50_path = os.path.join(PRESETS_DIR, "jessi_mitchell_50.vcf")
    with open(t50_path, "w", encoding="utf-8") as f:
        f.write(trojan_50)
    print(f"  ✅ [Trojan 50 Pack] Saved to {t50_path} ({len(trojan_50) // 1024} KB)")

    # 4. Trojan 200 Pack
    trojan_200 = generate_trojan_vcf(200)
    t200_path = os.path.join(PRESETS_DIR, "jessi_mitchell_200.vcf")
    with open(t200_path, "w", encoding="utf-8") as f:
        f.write(trojan_200)
    print(f"  ✅ [Trojan 200 Pack] Saved to {t200_path} ({len(trojan_200) // 1024} KB)")

    print("\n✨ Trojan Horse packs generated successfully!")


if __name__ == "__main__":
    main()
