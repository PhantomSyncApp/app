"""
NFC Prank Contact Suite Generator
Generates high-quality vCard (.vcf) files with embedded Base64 avatar badges,
compact NDEF payloads for NTAG chips, and Flipper Zero .nfc files.
"""

import os
import sys
import io
import base64
from PIL import Image, ImageDraw, ImageFont

# Set UTF-8 encoding for standard output on Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
PRESETS_DIR = os.path.join(OUTPUT_DIR, "presets")
FLIPPER_DIR = os.path.join(OUTPUT_DIR, "flipper")
WEB_DIR = os.path.join(OUTPUT_DIR, "web")

os.makedirs(PRESETS_DIR, exist_ok=True)
os.makedirs(FLIPPER_DIR, exist_ok=True)
os.makedirs(WEB_DIR, exist_ok=True)


def create_avatar(bg_color, fg_color, symbol_type, title_text=""):
    """Creates a high-contrast 256x256 circular badge as JPEG bytes."""
    size = (256, 256)
    img = Image.new("RGB", size, (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Draw rounded/circular background
    draw.ellipse([8, 8, 248, 248], fill=bg_color, outline=fg_color, width=6)

    # Draw symbol based on type
    if symbol_type == "fbi":
        # FBI Shield shape
        draw.polygon([(128, 40), (195, 65), (180, 160), (128, 215), (76, 160), (61, 65)], fill=fg_color)
        draw.polygon([(128, 55), (180, 75), (168, 150), (128, 198), (88, 150), (76, 75)], fill=bg_color)
        draw.ellipse([115, 95, 141, 121], fill=fg_color)
        draw.rectangle([105, 125, 151, 165], fill=fg_color)
    elif symbol_type == "warning":
        # Warning triangle
        draw.polygon([(128, 48), (210, 190), (46, 190)], fill=fg_color)
        draw.polygon([(128, 68), (192, 180), (64, 180)], fill=bg_color)
        # Exclamation point
        draw.rectangle([122, 90, 134, 142], fill=fg_color)
        draw.ellipse([122, 152, 134, 164], fill=fg_color)
    elif symbol_type == "music":
        # Retro sunglasses / musical note
        draw.ellipse([85, 120, 115, 150], fill=fg_color)
        draw.ellipse([145, 100, 175, 130], fill=fg_color)
        draw.rectangle([107, 70, 117, 130], fill=fg_color)
        draw.rectangle([167, 50, 177, 110], fill=fg_color)
        draw.polygon([(107, 70), (177, 50), (177, 65), (107, 85)], fill=fg_color)
    elif symbol_type == "clown":
        # Creepy clown face / red nose & balloon
        draw.ellipse([100, 75, 156, 131], fill=(255, 255, 255))
        # Red nose
        draw.ellipse([116, 115, 140, 139], fill=(230, 30, 30))
        # Creepy wide smile
        draw.arc([80, 110, 176, 185], start=20, end=160, fill=(230, 30, 30), width=6)
        # Eyes
        draw.ellipse([102, 95, 114, 110], fill=(0, 0, 0))
        draw.ellipse([142, 95, 154, 110], fill=(0, 0, 0))
    elif symbol_type == "alien":
        # Alien face
        draw.polygon([(128, 55), (185, 95), (165, 185), (128, 215), (91, 185), (71, 95)], fill=fg_color)
        # Large black eyes
        draw.ellipse([88, 110, 118, 155], fill=(10, 10, 10))
        draw.ellipse([138, 110, 168, 155], fill=(10, 10, 10))
    elif symbol_type == "pizza":
        # Pizza slice
        draw.polygon([(65, 70), (191, 70), (128, 205)], fill=(255, 193, 7))
        # Crust
        draw.chord([60, 55, 196, 85], start=0, end=180, fill=(193, 119, 39))
        # Pepperonis
        draw.ellipse([110, 95, 130, 115], fill=(200, 35, 35))
        draw.ellipse([90, 125, 108, 143], fill=(200, 35, 35))
        draw.ellipse([135, 135, 153, 153], fill=(200, 35, 35))
    elif symbol_type == "irs":
        # Eagle / scales / gov seal
        draw.polygon([(128, 55), (170, 85), (160, 155), (128, 190), (96, 155), (86, 85)], fill=fg_color)
        draw.polygon([(128, 65), (160, 92), (150, 145), (128, 178), (106, 145), (96, 92)], fill=bg_color)
        # Scales beam
        draw.line([(95, 115), (161, 115)], fill=fg_color, width=4)
        draw.line([(128, 95), (128, 150)], fill=fg_color, width=4)
    else:
        # Default monogram
        draw.ellipse([90, 90, 166, 166], fill=fg_color)

    # Save as compressed JPEG
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


PRESETS = [
    {
        "id": "fbi",
        "name_last": "Surveillance Van #404",
        "name_first": "Special Agent FBI",
        "display_name": "Special Agent FBI Surveillance Van #404",
        "org": "Federal Bureau of Investigation;Cyber Threat Division",
        "title": "Senior Wiretap & Surveillance Operative",
        "phone": "+1-800-225-5324",
        "email": "active.wiretap@fbi.gov",
        "url": "https://www.fbi.gov",
        "note": "🚨 CLASSIFIED NOTICE: This mobile device has been paired with Department of Justice Field Wiretap Unit 404. All audio, location pings, and browser cookies are currently transmitting to HQ. DO NOT DELETE THIS CONTACT.",
        "avatar_bg": (15, 23, 42),      # Dark navy
        "avatar_fg": (234, 179, 8),     # Gold
        "symbol": "fbi"
    },
    {
        "id": "car_warranty",
        "name_last": "Warranty Department",
        "name_first": "FINAL NOTICE: Auto",
        "display_name": "FINAL NOTICE: Auto Warranty Department",
        "org": "National Vehicle Protection Bureau",
        "title": "Senior Policy Expiration Supervisor",
        "phone": "+1-888-555-0199",
        "email": "urgent.finalnotice@warranty-bureau.com",
        "url": "https://en.wikipedia.org/wiki/Vehicle_service_contract",
        "note": "⚠️ URGENT AUTOMOTIVE NOTICE: This is our FINAL ATTEMPT to contact you regarding your vehicle's expired factory warranty. If you do not save this contact immediately, roadside assistance and engine replacement coverage will be permanently forfeited.",
        "avatar_bg": (220, 38, 38),     # Red
        "avatar_fg": (255, 255, 255),   # White
        "symbol": "warning"
    },
    {
        "id": "rickroll",
        "name_last": "Astley",
        "name_first": "Rick",
        "display_name": "Rick Astley (Official)",
        "org": "Never Gonna Give You Up Worldwide",
        "title": "Chief Executive Groove Officer",
        "phone": "+1-248-434-5508",     # Famous Rickroll hotline
        "email": "rick@nevergonna.giveyouup.com",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "note": "🕺 You've been NFC-Rickrolled! You know the rules and so do I. A full commitment's what I'm thinking of! You wouldn't get this from any other guy. Call the phone number above for live vocal proof! 🎶",
        "avatar_bg": (99, 102, 241),    # Indigo
        "avatar_fg": (255, 255, 255),   # White
        "symbol": "music"
    },
    {
        "id": "clown",
        "name_last": "The Friendly Clown",
        "name_first": "Bojangles",
        "display_name": "Bojangles The Friendly Clown",
        "org": "Midnight Closet Entertainment Co.",
        "title": "Director of 3 AM Window Peeking",
        "phone": "+1-666-555-0133",
        "email": "under.your.bed@circusnightmare.com",
        "url": "https://en.wikipedia.org/wiki/Coulrophobia",
        "note": "🎈 Hello my sweet friend! I saw you tap this tag! I'm standing right outside your front porch right now! Don't look behind your bedroom curtains tonight! Honk honk! 🤡🎈",
        "avatar_bg": (30, 41, 59),      # Slate
        "avatar_fg": (239, 68, 68),     # Bright Red
        "symbol": "clown"
    },
    {
        "id": "irs_audit",
        "name_last": "Tax Enforcement Officer",
        "name_first": "IRS Delinquent",
        "display_name": "IRS Delinquent Tax Enforcement Officer",
        "org": "Internal Revenue Service;Criminal Investigation Division",
        "title": "Special Case Manager #9042",
        "phone": "+1-800-829-1040",
        "email": "seizure-notice@irs.gov",
        "url": "https://www.irs.gov",
        "note": "⚖️ NOTICE CP-504 INTENT TO SEIZE: An unresolved discrepancy of $42,069.17 has been linked to this device's owner. Failure to keep this contact active will trigger immediate garnishment of bank accounts and crypto wallets.",
        "avatar_bg": (6, 78, 59),       # Dark Forest Green
        "avatar_fg": (245, 158, 11),    # Amber
        "symbol": "irs"
    },
    {
        "id": "pizza_emergency",
        "name_last": "Dispatch 911",
        "name_first": "Emergency Pizza",
        "display_name": "Emergency Pizza Dispatch 911 🍕",
        "org": "Rapid Dough & Cheese Relief Agency",
        "title": "Senior Crust Paramedic",
        "phone": "+1-800-555-PIZZA",
        "email": "extra-cheese@crust-dispatch.org",
        "url": "https://en.wikipedia.org/wiki/Pizza",
        "note": "🍕 IN CASE OF EMOTIONAL CRISIS: Dial this contact for rapid deployment of an 18-inch wood-fired stuffed crust pepperoni pizza. Side of garlic butter is included free of charge.",
        "avatar_bg": (180, 83, 9),      # Amber/Brown
        "avatar_fg": (254, 240, 138),   # Yellow
        "symbol": "pizza"
    },
    {
        "id": "alien_contact",
        "name_last": "Xylar-9",
        "name_first": "Commander",
        "display_name": "Commander Xylar-9 (Area 51 Liaison)",
        "org": "Galactic Federation Observation Council",
        "title": "Chief Earthling Specimen Evaluator",
        "phone": "+1-555-ET-PHONE",
        "email": "mothership@alpha-centauri.space",
        "url": "https://en.wikipedia.org/wiki/Extraterrestrial_life",
        "note": "🛸 GREETINGS HUMAN: Your species' free trial of Planet Earth has officially expired. Maintain this contact saved on your communicator to receive beam extraction coordinates.",
        "avatar_bg": (15, 23, 42),      # Dark Space
        "avatar_fg": (34, 197, 94),     # Neon Alien Green
        "symbol": "alien"
    }
]


def generate_vcard_content(preset, include_photo=True):
    """Generates standard RFC 2426 vCard 3.0 content."""
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"N:{preset['name_last']};{preset['name_first']};;;",
        f"FN:{preset['display_name']}",
        f"ORG:{preset['org']}",
        f"TITLE:{preset['title']}",
        f"TEL;TYPE=CELL,VOICE:{preset['phone']}",
        f"EMAIL;TYPE=INTERNET,WORK:{preset['email']}",
        f"URL:{preset['url']}",
        f"NOTE:{preset['note']}"
    ]

    if include_photo:
        photo_bytes = create_avatar(preset['avatar_bg'], preset['avatar_fg'], preset['symbol'])
        b64_photo = base64.b64encode(photo_bytes).decode('ascii')
        # Format photo with standard line wrapping (75 chars per RFC)
        lines.append(f"PHOTO;TYPE=JPEG;ENCODING=b:{b64_photo}")

    lines.append("END:VCARD")
    lines.append("")
    return "\r\n".join(lines)


def generate_compact_vcard(preset):
    """Generates an ultra-compact vCard designed to fit into NTAG213 (<144 bytes) or NTAG215."""
    # Ultra short fields
    note_short = preset['note'][:60] + "..."
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{preset['display_name'][:30]}",
        f"TEL:{preset['phone']}",
        f"URL:{preset['url']}",
        f"NOTE:{note_short}",
        "END:VCARD\r\n"
    ]
    return "\r\n".join(lines)


def generate_flipper_nfc(preset, vcard_text, filename):
    """
    Creates a valid Flipper Zero .nfc file (NTAG215 simulation)
    containing an NDEF record with the text/vcard MIME or URI.
    """
    # Build NDEF message
    # For Flipper Zero NTAG215: 135 pages of 4 bytes = 540 bytes
    # Page 0-2: Serial, Internal, Lock
    # Page 3: Capability Container (E1 10 3E 00 for NTAG215 = 504 bytes user mem)
    # Page 4+: NDEF TLV
    
    # We create a URL NDEF record pointing to the prank page, or MIME vcard
    payload_bytes = vcard_text.encode('utf-8')
    
    # Cap to fit NTAG215 (max 480 bytes data TLV)
    if len(payload_bytes) > 460:
        # Use compact vcard
        payload_bytes = generate_compact_vcard(preset).encode('utf-8')
    
    # NDEF Record header:
    # TNF = 0x02 (MIME media), Type = "text/vcard"
    type_field = b"text/vcard"
    # Header: MB=1, ME=1, CF=0, SR=1 (Short Record), IL=0, TNF=0x02 => 0xD2
    ndef_record = bytearray([0xD2, len(type_field), len(payload_bytes)])
    ndef_record.extend(type_field)
    ndef_record.extend(payload_bytes)
    
    # TLV wrapper: 0x03 (NDEF Message), Length, Data, 0xFE (Terminator)
    tlv = bytearray([0x03, len(ndef_record)])
    tlv.extend(ndef_record)
    tlv.append(0xFE)
    
    # Pad to pages of 4 bytes
    while len(tlv) % 4 != 0:
        tlv.append(0x00)
        
    pages = {}
    # Page 0-3:
    pages[0] = "04 42 13 5A"
    pages[1] = "20 6B 80 00"
    pages[2] = "48 00 00 00"
    pages[3] = "E1 10 3E 00" # CC for NTAG215
    
    # Fill data pages starting at Page 4
    page_idx = 4
    for i in range(0, len(tlv), 4):
        chunk = tlv[i:i+4]
        pages[page_idx] = " ".join(f"{b:02X}" for b in chunk)
        page_idx += 1
        
    # Fill remaining pages up to 134 with 00
    for p in range(page_idx, 135):
        pages[p] = "00 00 00 00"
        
    flipper_content = [
        "Filetype: Flipper NFC device",
        "Version: 4",
        "Device type: NTAG215",
        "UID: 04 42 13 5A 20 6B 80",
        "ATQA: 44 00",
        "SAK: 00",
        "Signature: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00",
        "Mifare version: 00 04 04 02 01 00 11 03",
        "Counter 0: 0",
        "Tearing 0: 00",
        "Counter 1: 0",
        "Tearing 1: 00",
        "Counter 2: 0",
        "Tearing 2: 00",
        "Pages total: 135"
    ]
    for p in range(135):
        flipper_content.append(f"Page {p}: {pages.get(p, '00 00 00 00')}")
        
    flipper_content.append("")
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(flipper_content))


def main():
    print("🚀 Generating NFC Prank Contact Presets...")
    for p in PRESETS:
        # 1. Full .vcf (with avatar)
        full_vcf_path = os.path.join(PRESETS_DIR, f"{p['id']}_full.vcf")
        full_content = generate_vcard_content(p, include_photo=True)
        with open(full_vcf_path, "w", encoding="utf-8") as f:
            f.write(full_content)
            
        # 2. Compact .vcf (no avatar, lightweight)
        compact_vcf_path = os.path.join(PRESETS_DIR, f"{p['id']}_compact.vcf")
        compact_content = generate_compact_vcard(p)
        with open(compact_vcf_path, "w", encoding="utf-8") as f:
            f.write(compact_content)
            
        # 3. Flipper Zero .nfc file
        flipper_path = os.path.join(FLIPPER_DIR, f"{p['id']}.nfc")
        generate_flipper_nfc(p, compact_content, flipper_path)
        
        print(f"  ✅ [{p['id']}] Generated full .vcf ({len(full_content)} bytes), compact ({len(compact_content)} bytes), and Flipper .nfc")

    print("\n✨ All presets generated successfully!")


if __name__ == "__main__":
    main()
