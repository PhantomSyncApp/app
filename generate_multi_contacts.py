"""
Multi-Contact Prank Generator (100 - 200 Contacts Pack)
Generates a multi-vCard (.vcf) file containing 100-200 hilarious contacts,
staggered birthday notifications (BDAY) across the whole calendar year,
humorous notes, and unique tags for easy bulk cleanup if desired.
"""

import os
import sys
import io
import base64
import random
from datetime import date, timedelta
from PIL import Image, ImageDraw

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
PRESETS_DIR = os.path.join(OUTPUT_DIR, "presets")
os.makedirs(PRESETS_DIR, exist_ok=True)

# Thematic Name Generator Components
TITLES = [
    "Special Agent", "Chief Executive", "Senior", "Lead", "Commander", 
    "Undercover", "Certified", "Director of", "Regional", "Intergalactic"
]

FUNNY_CONTACTS_DATA = [
    # Surveillance / Government
    ("FBI Surveillance Van #4", "Federal Bureau of Investigation", "Dept of Homeland Memes", "wiretap4@fbi.gov"),
    ("FBI Surveillance Van #9 (Undercover Prius)", "Federal Bureau of Investigation", "Mobile Unit", "prius.surveillance@fbi.gov"),
    ("CIA Operative Pigeon #42", "Central Intelligence Agency", "Avian Drone Reconnaissance", "pigeon42@cia.gov"),
    ("NSA Microphone Inspector", "National Security Agency", "Audio Calibration Div", "mic.check@nsa.gov"),
    ("Area 51 Janitorial Services", "US Space Command", "Toxic Slime Maintenance", "janitor@groomlake.mil"),
    ("IRS Audit SWAT Team", "Internal Revenue Service", "Delinquent Asset Seizure", "pay.up@irs.gov"),
    ("Department of Redundancy Department", "Federal Bureau of Redundant Affairs", "Office of Repetition", "redo@redundant.gov"),
    ("Pentagon Snack Room Attendant", "Department of Defense", "Tactical Cheetos Division", "snacks@pentagon.mil"),

    # Car Warranty / Telemarketing
    ("Car Warranty Dispatcher (FINAL NOTICE)", "National Auto Protection", "Urgent Renewal Desk", "warranty1@finalnotice.com"),
    ("Car Warranty Specialist #44", "Vehicle Service Bureau", "Powertrain Expiration Unit", "renew@warranty-alert.org"),
    ("Student Loan Forgiveness Goblin", "Department of Fictional Relief", "Magic Debt Eraser", "loans@forgive.net"),
    ("Health Insurance Telemarketer", "Global Robocall Center", "Pre-existing Meme Coverage", "quote@robocall.biz"),
    ("Nigerian Prince (Legitimate)", "Royal Treasury of Lagos", "Gold Ingot Disbursement", "prince.wealth@legit-wealth.ng"),

    # Absurd Household & Tech
    ("The Sentient Roomba", "Living Room Patrol", "Dust Bunny Annihilation Unit", "beeps@roomba.ai"),
    ("Smart Fridge (Judging Your Diet)", "Kitchen Appliances Union", "Midnight Snack Police", "diet.shame@fridge.iot"),
    ("Printer That Won't Connect to Wi-Fi", "Office Hardware Demons", "Cyan Level Empty Dept", "offline@error-code-99.net"),
    ("The Duolingo Owl (Unforgiving)", "Duolingo Threat Bureau", "Spanish Lesson Enforcer", "streak.broken@duo.org"),
    ("Guy Who Stares at Microwaves", "Midnight Kitchen Observers", "Hot Pocket Quality Control", "radiation@pocket.hot"),
    ("Your Wi-Fi Router at 3 AM", "Packet Drop Services", "Random Reboot Division", "disconnect@192-168-1-1.lan"),
    ("Bluetooth Speaker That Paired to Stranger", "Unsolicited Audio Inc.", "Bathroom Wall Piercing", "speaker@paired.bt"),

    # Paranormal & Mythical
    ("Basement Crawlspace Goblin", "Subterranean Creatures LLC", "Cobweb Architect", "hiss@underfloor.creatures"),
    ("Friendly Neighborhood Cryptid", "Appalachian Forest Guild", "Blurry Photo Consultant", "mothman@cryptid.org"),
    ("Bigfoot's Public Relations Rep", "Forest PR Associates", "Footprint Fabrication", "bigfoot@sightings.wild"),
    ("Sleep Paralysis Demon", "Night Terror Logistics", "Corner of Ceiling Spectator", "midnight@shadow.realm"),
    ("The Tooth Fairy (Foreclosure Div)", "Mythical Dental Exchange", "Enamel Re-possession", "cash@under-pillow.fairy"),
    ("Loch Ness Monster ($3.50 Collector)", "Scottish Waters Inc.", "Tree Fiddy Collection Agency", "three.fiddy@nessie.lake"),

    # Food & Urgent Deliveries
    ("Emergency Pizza Dispatcher 911", "Rapid Crust Response", "Stuffed Crust ICU", "crust@pizza911.org"),
    ("Taco Bell Night Shift Philosopher", "Baja Blast R&D", "Crunchwrap Wisdom Dept", "deepthoughts@tacobell.com"),
    ("Emotional Support Burrito", "Comfort Food Associates", "Guacamole Subsidies", "burrito@carbs.heal"),
    ("Waffle House Parking Lot Referee", "24/7 Combat Sports", "Late Night Griddle Ring", "referee@wafflecombat.org"),
    ("Spicy Ramen Tolerance Coach", "Extreme Scoville League", "Milk Chug Facilitator", "capsaicin@noodlez.org"),

    # Weird Professionals
    ("Chief Executive Vibes Officer", "Corporate Nonsense Corp", "Synergy & Aura Dept", "vibes@synergy.biz"),
    ("Professional Ceiling Fan Styler", "Interior Aerodynamics", "Speed 3 Enthusiast", "wobble@ceilingfan.co"),
    ("Sock Lost in Dryer (Still Alive)", "Laundry Bermuda Triangle", "Single Sock Liberation", "missing@dryer-lint.org"),
    ("Guy Who Overexplains Board Games", "Game Night Ruiners", "Rulebook Page 74 Enforcement", "rules@monopoly-ruiner.com"),
    ("Self-Appointed Elevators Captain", "Vertical Transit Guild", "Floor Button Overseer", "ding@elevators.press"),
    ("Cat Running at 3:14 AM", "Feline Zoomies Brigade", "Hallway Drift Specialist", "zoom@midnight.cat")
]

# Generate funny generated names to easily scale up to 100 - 200 contacts
PREFIXES = ["Sir", "Dr.", "Captain", "Lord", "Coach", "Professor", "Uncle", "Inspector", "Grandmaster", "Chef"]
FIRST_NAMES = [
    "Barnaby", "Ignatius", "Cletus", "Garth", "Bartholomew", "Mortimer", "Ziggy", "Waldo", 
    "Cornelius", "Gulliver", "Reginald", "Archibald", "Ferdinand", "Aloysius", "Bojangles", 
    "Chadwick", "Ebenezer", "Rupert", "Tadpole", "Bramble", "Scrump", "Waffles", "Beef", "Porkchop"
]
LAST_NAMES = [
    "McTickle", "Sourdough", "Fidgetspinner", "Wobblebottom", "Beefington", "Thunderpants", 
    "Butterfingers", "Noodleman", "Cheesepuff", "Van Der Hiss", "Pumpernickel", "Twinkletoes", 
    "Crabgrass", "Picklejuice", "Pantsworth", "Flapjack", "Munchausen", "Baggins", "O'Hooligan"
]
OCCUPATIONS = [
    ("Competitive Napper", "International Snooze Federation"),
    ("Bubble Wrap Pop Inspector", "Stress Relief Union"),
    ("Couch Potato Consultant", "Living Room Sloth LLC"),
    ("Ghost Hunter (Scared of Dark)", "Spooky Investigations"),
    ("Penguin Translator", "Antarctic Diplomatic Corps"),
    ("Professional Third Wheel", "Awkward Dates Inc"),
    ("Spaghetti Straightener", "Pasta Alignment Bureau"),
    ("Unsolicited Advice Dispenser", "Every Family Gathering"),
    ("Ketchup Bottle Shaker Specialist", "Condiment Velocity Lab"),
    ("Extreme Thumb Wrestler", "Underground Finger League"),
    ("Certified Fortune Cookie Writer", "Vague Destiny Ltd"),
    ("Professional Bubble Blower", "Soapy Spheres Co.")
]

EMOJIS = ["🤡", "🕵️", "👻", "🍕", "🤖", "👽", "🦉", "🎈", "🚗", "🤠", "👑", "🦖", "🧌", "🦝", "🌯"]


def create_mini_avatar(symbol_emoji, bg_color):
    """Creates an ultra-compact 96x96 avatar badge compressed to JPEG (~2.5 KB)."""
    img = Image.new("RGB", (96, 96), bg_color)
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 91, 91], outline=(255, 255, 255), width=3)
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=65)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def generate_prank_pack(count=150, include_avatars=True):
    """
    Generates a multi-vCard string containing `count` humorous contacts
    with staggered birthdays throughout the entire year.
    """
    contacts = []
    
    # Pre-calculate birthday dates distributed evenly across the year
    start_date = date(2000, 1, 1)
    # Step so birthdays hit every 2-3 days throughout the whole calendar!
    step_days = max(1, 365 // count)

    bg_palette = [
        (220, 38, 38),   # Red
        (234, 88, 12),   # Orange
        (202, 138, 4),   # Yellow-amber
        (22, 163, 74),   # Green
        (13, 148, 136),  # Teal
        (37, 99, 235),   # Blue
        (124, 58, 237),  # Purple
        (219, 39, 119),  # Pink
        (30, 41, 59)     # Slate
    ]

    # Pre-render a small pool of 8 reusable avatar badges to keep file size tiny!
    avatar_pool = []
    if include_avatars:
        for i, bg in enumerate(bg_palette):
            avatar_pool.append(create_mini_avatar(EMOJIS[i % len(EMOJIS)], bg))

    used_names = set()

    for i in range(count):
        # 1. Determine Contact Identity
        if i < len(FUNNY_CONTACTS_DATA):
            fn, org, title, email = FUNNY_CONTACTS_DATA[i]
            parts = fn.split(" ")
            first_name = parts[0]
            last_name = " ".join(parts[1:]) if len(parts) > 1 else "Prank"
        else:
            # Procedural hilarious name
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
            email = f"{clean_name}@pranksquad.fun"

        # 2. Distribute Birthdays across all 12 months!
        # Birthday calculation
        bday_offset = (i * step_days + random.randint(0, 1)) % 365
        bday_date = start_date + timedelta(days=bday_offset)
        bday_str = bday_date.strftime("--%m-%d") # Standard vCard recurring birthday without fixed year, or 2000-MM-DD
        bday_full = bday_date.strftime("2000-%m-%d")

        # 3. Phone number
        area_code = random.choice(["800", "888", "555", "312", "415", "646", "212"])
        phone = f"+1-{area_code}-{random.randint(100,999):03d}-{random.randint(1000,9999):04d}"

        # 4. Funny Note
        funny_notes = [
            f"🎉 Don't forget my birthday on {bday_date.strftime('%B %d')}! I accept high-fives and pizza.",
            "🚨 Prank Squad Member #404. Deleting this contact will reduce your phone's karma by 50 points.",
            "🎈 Certified associate of the International Prank Collective. Say hi next time you see me!",
            "⚠️ NOTICE: This contact has been legally embedded into your device registry. Have a wonderful day!"
        ]
        note = random.choice(funny_notes)

        # 5. Build RFC vCard block
        vcard_lines = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            f"N:{last_name};{first_name};;;",
            f"FN:{fn}",
            f"ORG:{org}",
            f"TITLE:{title}",
            f"TEL;TYPE=CELL,VOICE:{phone}",
            f"EMAIL;TYPE=INTERNET:{email}",
            f"BDAY:{bday_full}", # Causes native calendar birthday alerts!
            f"NOTE:{note}",
            "CATEGORIES:PrankSquad" # Allows instant bulk search & delete!
        ]

        # Attach avatar if enabled
        if include_avatars and avatar_pool:
            b64_avatar = avatar_pool[i % len(avatar_pool)]
            vcard_lines.append(f"PHOTO;TYPE=JPEG;ENCODING=b:{b64_avatar}")

        vcard_lines.append("END:VCARD")
        contacts.append("\r\n".join(vcard_lines))

    return "\r\n".join(contacts)


def main():
    print("🚀 Generating Multi-Contact Prank Packs...")
    
    # 1. 50 Contacts Pack
    print("  Creating 50 contacts pack...")
    pack50 = generate_prank_pack(50, include_avatars=True)
    p50_path = os.path.join(PRESETS_DIR, "prank_pack_50.vcf")
    with open(p50_path, "w", encoding="utf-8") as f:
        f.write(pack50)
    print(f"  ✅ [50 Pack] Saved to {p50_path} ({len(pack50) // 1024} KB)")

    # 2. 100 Contacts Pack (The Golden Standard)
    print("  Creating 100 contacts pack with 365-day staggered birthdays...")
    pack100 = generate_prank_pack(100, include_avatars=True)
    p100_path = os.path.join(PRESETS_DIR, "prank_pack_100.vcf")
    with open(p100_path, "w", encoding="utf-8") as f:
        f.write(pack100)
    print(f"  ✅ [100 Pack] Saved to {p100_path} ({len(pack100) // 1024} KB)")

    # 3. 200 Contacts Pack (Maximum Overload)
    print("  Creating 200 contacts pack...")
    pack200 = generate_prank_pack(200, include_avatars=True)
    p200_path = os.path.join(PRESETS_DIR, "prank_pack_200.vcf")
    with open(p200_path, "w", encoding="utf-8") as f:
        f.write(pack200)
    print(f"  ✅ [200 Pack] Saved to {p200_path} ({len(pack200) // 1024} KB)")

    print("\n✨ All multi-contact packs generated successfully!")


if __name__ == "__main__":
    main()
