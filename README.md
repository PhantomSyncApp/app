# ⚡ PhantomSync & Stealth Operations Suite

A commercial stealth digital prank platform and operations toolkit. Features anonymous `webcal://` Trojan subscription feeds, slow-burn 18-month calendar deployments, AI-personalized strike generators, remote kill switches, and hardware NFC payloads.

---

## 🌐 Live Production Services

- **Commercial Storefront:** [phantomsyncapp.github.io/app/](https://phantomsyncapp.github.io/app/)
- **Campaign Studio (AI Generator):** [phantomsyncapp.github.io/app/phantomsync_studio.html](https://phantomsyncapp.github.io/app/phantomsync_studio.html)
- **Pranker Mission Control Dashboard:** [phantomsyncapp.github.io/app/dashboard.html](https://phantomsyncapp.github.io/app/dashboard.html)
- **Disguised Edge API (Cloudflare Worker):** `https://phantomsync-api.sys-directory.workers.dev`

---

## 🎭 Core Mechanics

### 1. The Trojan Horse Subscription Shield
- When a target subscribes (via direct link, QR code, or NFC tap), their phone initially displays **only 1 innocent routine system verification event** (or a custom social engineering decoy such as *Sophia's Baby Shower*, *Wedding Itinerary*, or *Mobile Directory Sync*).
- After the initial stealth window, the feed silently expands in the background into an **18-month slow-burn schedule of 100 hyper-realistic, deadpan appointments and citations**.

### 2. Bespoke AI Strike Engine
- Uses **Google Gemini 3.1 Flash-Lite** through our Cloudflare Worker edge backend.
- Generates 25 bespoke events tailored to the victim's exact quirks, workplace lore, and habits, interleaved seamlessly with 75 vetted events from our 1,000+ item vault.
- **Strict Anti-Detection Rule:** Zero "birthday party" or silly clown tropes. Every event reads like an authentic municipal citation, HR memo, or corporate audit.

### 3. Mission Control Dashboard
- **Zero Friction Isolation:** Each campaign receives a unique tokenized identifier (`ps_xxxxxxxx`).
- **Telemetry Monitoring:** Live device user agent reporting (e.g. `iOS/18.2 Apple Calendar`), sync count tracker, and last check-in timestamps.
- **Remote Kill Switch:** One click remotely purges all calendar events from the victim's device.
- **Reaction Log:** Private autosaved notes to log funny messages and reactions.

---

## 📂 Repository Structure

```text
├── index.html                  # Official PhantomSync commercial landing page
├── phantomsync_studio.html     # AI campaign generator, themes, and checkout UI
├── dashboard.html              # Pranker Mission Control & telemetry tracker
├── card.html                   # Discrete personal contact card & vCard gateway
├── schedule_data.json          # Cached slow-burn campaign payload
├── server.py                   # Local testing HTTP server with ASCII QR terminal display
├── cloudflare_worker/
│   ├── worker.js               # Cloudflare Worker backend (v4.1.0)
│   ├── wrangler.toml           # Cloudflare deployment configuration
│   └── SETUP_GUIDE.md          # One-minute backend setup guide
├── presets/                    # Pre-generated .vcf packs and live .ics feeds
│   ├── jessie_mitchell_birthdays.ics   # 100-event live prototype schedule
│   ├── prank_pack_50.vcf       # 50 contact overload pack
│   ├── prank_pack_100.vcf      # 100 contact overload pack
│   └── prank_pack_200.vcf      # 200 contact overload pack
└── flipper/                    # Flipper Zero NTAG215 .nfc dumps
```

---

## 🛠️ Local Development & Testing

Start the local test server:
```bash
python server.py
```
This automatically detects your LAN IP and prints an interactive ASCII QR code in your terminal to test feeds on your smartphone camera.
