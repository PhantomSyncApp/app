# 🏷️ NFC Prank Contact Suite

A complete toolkit for generating viral prank contact files (`.vcf`), crafting deceptive NFC payloads, and programming NTAG213/215 stickers, smartphones, or Flipper Zero devices in seconds.

---

## ⚡ Quick Start

### 1. Generate All Presets & Files
Run the generator to produce all full vCards (with embedded photo badges), compact vCards, and Flipper Zero `.nfc` dumps:

```bash
python generate_pranks.py
```

### 2. Launch the Web Studio & Local Test Server
Start the local server. It detects your Wi-Fi LAN IP and prints an **ASCII QR Code** in your terminal so you can scan it directly with your phone camera:

```bash
python server.py
```

- **Web Studio (PC):** `http://localhost:8080/web/index.html`
- **Victim Landing Page (Phone):** `http://<your-ip>:8080/web/prank.html?preset=fbi`

---

## 🎭 Built-in Prank Presets

| Preset | Display Name | Organization | Phone / Effect |
| :--- | :--- | :--- | :--- |
| **🕵️ FBI Wiretap** | `Special Agent FBI Surveillance Van #404` | Federal Bureau of Investigation | `+1-800-225-5324` &bull; Classified active wiretap warning |
| **🚗 Auto Warranty** | `FINAL NOTICE: Auto Warranty Department` | National Vehicle Protection Bureau | `+1-888-555-0199` &bull; Urgent factory warranty expiration notice |
| **🕺 Rick Astley** | `Rick Astley (Official)` | Never Gonna Give You Up Worldwide | `+1-248-434-5508` (Working Rickroll hotline!) |
| **🎈 The Clown** | `Bojangles The Friendly Clown` | Midnight Closet Entertainment Co. | `+1-666-555-0133` &bull; "I'm outside your window right now" |
| **⚖️ IRS Audit** | `IRS Delinquent Tax Enforcement Officer` | Internal Revenue Service | `+1-800-829-1040` &bull; Notice CP-504 delinquent tax seizure |
| **🍕 Pizza 911** | `Emergency Pizza Dispatch 911 🍕` | Rapid Dough & Cheese Relief Agency | `+1-800-555-PIZZA` &bull; Stuffed crust resuscitation |
| **👽 Area 51** | `Commander Xylar-9 (Area 51 Liaison)` | Galactic Federation Observation Council | `+1-555-ET-PHONE` &bull; Earth free trial expired notice |

---

## 💣 100 - 200 Contact Overload Packs (With Birthday Alerts)

Want to overload someone's contact book with 50, 100, or 200 hilarious fake contacts that randomly trigger native birthday calendar notifications throughout the year?

```bash
python generate_multi_contacts.py
```

- **Staggered Annual Birthdays (`BDAY`):** Every contact has a birthday distributed every 2-3 days across all 12 months. When imported, Apple Calendar and Google Calendar automatically set up annual reminders: *"Today is Basement Crawlspace Goblin's Birthday!"* or *"Today is Sentient Roomba's Birthday!"*
- **Humorous Personas:** CIA Pigeons, Wi-Fi Routers at 3 AM, Area 51 Custodians, competitive nappers, and mythical creatures.
- **Harmless Cleanup Tag:** Every contact is tagged with `CATEGORIES:PrankSquad`. If the friend ever wants to delete them all, they can search `PrankSquad` in Contacts and delete them in one multi-select swoop!
- **Overload Files:**
  - `presets/prank_pack_50.vcf` (159 KB)
  - `presets/prank_pack_100.vcf` (320 KB)
  - `presets/prank_pack_200.vcf` (640 KB)

---

## 📡 The 3 Methods to Flash onto NFC

### 🥇 Method 1: The Universal URL Method *(Best for iPhone & Android)*
> **Why?** iOS background NFC scanning automatically triggers notifications for **URLs**, but ignores raw `text/vcard` data unless a 3rd-party scanner app is open.
1. Download **NFC Tools** (Free on iOS App Store and Google Play).
2. Host `web/prank.html` or your `.vcf` file (on GitHub Pages, Cloudflare Pages, Vercel, or local server).
3. Open **NFC Tools** &rarr; **Write** &rarr; **Add a record** &rarr; **URL / URI**.
4. Paste the link (e.g. `https://your-domain.com/prank.html?preset=fbi`).
5. Tap **Write** and hold your NTAG tag against the top edge of your iPhone or back of your Android.

### 🥈 Method 2: Raw NDEF vCard *(For Android & Flipper Zero)*
> **Note on Tag Memory:** Standard **NTAG213** tags only hold **144 bytes**. **NTAG215** tags hold **504 bytes**.
- Use the **`_compact.vcf`** files (under 220 bytes) to write directly into NTAG215 or NTAG216 chips without overflowing memory.
- In **NFC Tools**, select **Write** &rarr; **Add a record** &rarr; **Contact** (or Custom MIME `text/vcard`), paste the text, and write.

### 🐬 Method 3: Flipper Zero Emulation
1. Run `python generate_pranks.py` to create the `.nfc` files in the `flipper/` folder.
2. Connect your Flipper Zero via USB (qFlipper) or Bluetooth (Flipper mobile app).
3. Copy the `.nfc` file into `SD Card / nfc /`.
4. On your Flipper Zero, go to **NFC** &rarr; **Saved** &rarr; select the file &rarr; **Emulate**.
5. Tap your Flipper against any phone to trigger the contact card!

---

## 📁 Repository Structure

```text
├── generate_pranks.py       # Python script generating all .vcf, .nfc, and avatars
├── server.py                # Local testing server with auto LAN IP and terminal QR code
├── presets/                 # Pre-generated full and compact .vcf contact files
│   ├── fbi_full.vcf
│   ├── fbi_compact.vcf
│   ├── car_warranty_full.vcf
│   ├── rickroll_full.vcf
│   └── ...
├── flipper/                 # Flipper Zero NTAG215 dumps ready to emulate
│   ├── fbi.nfc
│   ├── car_warranty.nfc
│   └── ...
├── web/
│   ├── index.html           # Full Web Studio, Live Preview & Web NFC Writer
│   └── prank.html           # Mobile victim landing page with sound effects & auto-download
└── README.md                # This guide
```

---

## 🎯 High-Impact Placement Ideas
- **Under a desk corner / tabletop**: Tap when someone rests their phone down.
- **Inside a coffee coaster**: Triggers when a mug or phone is placed on it.
- **Back of a conference badge or lanyard**: Tap during networking.
- **Behind a business card holder or phone case**.
