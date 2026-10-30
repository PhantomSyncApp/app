"""
Multi-Contact Prank Generator (100+ Handcrafted Contacts Pack)
Generates multi-vCard (.vcf) files containing unique, hilarious contacts,
staggered birthday notifications (BDAY) across the whole calendar year,
and subtle cleanup tags.
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

FUNNY_CONTACTS_DATA = [
    # Government & Surveillance
    ("FBI Surveillance Van #4", "Federal Bureau of Investigation", "Dept of Homeland Memes", "wiretap4@fbi.gov"),
    ("FBI Surveillance Van #9 (Undercover Prius)", "Federal Bureau of Investigation", "Mobile Operations", "prius.surveillance@fbi.gov"),
    ("CIA Operative Pigeon #42", "Central Intelligence Agency", "Avian Drone Reconnaissance", "pigeon42@cia.gov"),
    ("NSA Microphone Inspector", "National Security Agency", "Audio Calibration Div", "mic.check@nsa.gov"),
    ("Area 51 Janitorial Services", "US Space Command", "Toxic Slime Maintenance", "janitor@groomlake.mil"),
    ("IRS Audit SWAT Team", "Internal Revenue Service", "Delinquent Asset Seizure", "pay.up@irs.gov"),
    ("Department of Redundancy Department", "Federal Bureau of Redundant Affairs", "Office of Repetition", "redo@redundant.gov"),
    ("Pentagon Snack Room Attendant", "Department of Defense", "Tactical Cheetos Division", "snacks@pentagon.mil"),
    ("Undercover Squirrel Division", "Wildlife Espionage Bureau", "Acorn Stash Surveillance", "nuts@squirrel-spy.net"),

    # Telemarketing & Scams
    ("Car Warranty Dispatcher (FINAL NOTICE)", "National Auto Protection", "Urgent Renewal Desk", "warranty1@finalnotice.com"),
    ("Car Warranty Specialist #44", "Vehicle Service Bureau", "Powertrain Expiration Unit", "renew@warranty-alert.org"),
    ("Student Loan Forgiveness Goblin", "Department of Fictional Relief", "Magic Debt Eraser", "loans@forgive.net"),
    ("Health Insurance Telemarketer", "Global Robocall Center", "Pre-existing Meme Coverage", "quote@robocall.biz"),
    ("Nigerian Prince (Legitimate)", "Royal Treasury of Lagos", "Gold Ingot Disbursement", "prince.wealth@legit-wealth.ng"),
    ("The Final Boss of Extended Warranties", "Warranty Citadel", "Supreme Renewal Overlord", "boss@warranty-eternity.org"),

    # Tech & Household Demons
    ("The Sentient Roomba", "Living Room Patrol", "Dust Bunny Annihilation Unit", "beeps@roomba.ai"),
    ("Smart Fridge (Judging Your Diet)", "Kitchen Appliances Union", "Midnight Snack Police", "diet.shame@fridge.iot"),
    ("Printer That Won't Connect to Wi-Fi", "Office Hardware Demons", "Offline Status Desk", "offline@error-code-99.net"),
    ("Printer: Low on Cyan (Won't Print Black)", "Hardware Cartridge Cartel", "Mandatory Color Extortion", "cyan@printer-rage.com"),
    ("The Duolingo Owl (Unforgiving)", "Duolingo Threat Bureau", "Spanish Lesson Enforcer", "streak.broken@duo.org"),
    ("Guy Who Stares at Microwaves", "Midnight Kitchen Observers", "Hot Pocket Quality Control", "radiation@pocket.hot"),
    ("Your Wi-Fi Router at 3 AM", "Packet Drop Services", "Random Reboot Division", "disconnect@192-168-1-1.lan"),
    ("Bluetooth Speaker That Paired to Stranger", "Unsolicited Audio Inc.", "Bathroom Wall Piercing", "speaker@paired.bt"),
    ("Smoke Detector (Low Battery Chirp 2 AM)", "Ceiling Terror Logistics", "30-Second Intermittent Chirps", "chirp@battery-low.alarm"),
    ("Phone Charger Cable (Only Works Bent)", "Copper Fatigue Association", "Specific Angle Specialists", "bent@charging-struggle.net"),
    ("Hotel Keycard That De-magnetized", "Front Desk Relay", "Locked Out in Towel Dept", "demag@hotel-hallway.org"),
    ("Smart TV Updating at Worst Moment", "Firmware Overlords", "Climax Scene Interrupter", "reboot@smart-tv.update"),
    ("Microwave Clock (Never Set Correctly)", "Kitchen Time Fabricators", "Permanent 12:00 Flasher", "flashing@microwave-time.net"),

    # Odd Personas & Annoyances
    ("Guy Who Calls Everyone 'Chief'", "Casual Acquaintances LLC", "Forearm Slapping Division", "chief@hey-there.buddy"),
    ("Neighbor With The 6 AM Leaf Blower", "Saturday Morning Ruiners", "Decibel Maximization", "blower@lawn-rage.com"),
    ("Emotional Support Possum", "Backyard Marsupial Guild", "Hissing & Screaming Dept", "screams@trash-can.possum"),
    ("Guy Who Breathes Loudly on Elevators", "Vertical Transit Awkwardness", "Heavy Respiratory Guild", "pant@elevator-corner.net"),
    ("The Guy She Told You Not To Worry About", "Insecurity Amplification LLC", "Jawline & Confidence Dept", "chad@dont-worry.cool"),
    ("Spotify DJ (Giving Unsolicited Recs)", "Algorithm Overreach", "Indie Rock Enforcer", "listen@spotify-dj.music"),
    ("Air Fryer Enthusiast Club President", "Crispy Carbs Movement", "Crispy Without Oil Evangelist", "crispy@airfryer.fan"),
    ("Guy Who Says 'Living the Dream'", "Corporate Coping Group", "Cubicle Despair Associates", "monday@cubicle-life.biz"),
    ("Subway Sandwich Artist (Over-Mustarder)", "Condiment Velocity Lab", "Soggy Bread Engineering", "mustard@footlong.sub"),
    ("Self-Checkout Voice: 'UNEXPECTED ITEM'", "Retail Robot Harassment", "Bagging Area Accusations", "item@checkout-alarm.store"),
    ("Guy Wearing Sunglasses Indoors", "Fluorescent Light Defiance", "Questionable Confidence Co.", "shades@indoor-night.net"),
    ("Unsolicited Crypto Advice Cousin", "Thanksgiving Table Ruiners", "Web3 Blockchain Evangelist", "hodl@crypto-cousin.web3"),
    ("Person Who Texts 'K' After 2 Paragraphs", "Dry Texting League", "Monosyllabic Destruction", "k@dry-reply.sms"),
    ("Overconfident IKEA Furniture Builder", "Allen Wrench Warriors", "Leftover Screws Mystery", "ikea@extra-parts.flatpack"),
    ("Guy Who Overexplains Board Games", "Game Night Ruiners", "Rulebook Page 74 Enforcement", "rules@monopoly-ruiner.com"),
    ("Self-Appointed Elevators Captain", "Vertical Transit Guild", "Floor Button Overseer", "ding@elevators.press"),
    ("Cat Running at 3:14 AM", "Feline Zoomies Brigade", "Hallway Drift Specialist", "zoom@midnight.cat"),
    ("Person Who Waves Back When Wasn't For Them", "Awkward Social Encounters", "Hand Retreat Unit", "wave@awkward-retreat.org"),
    ("Dad Groaning While Sitting on Couch", "Living Room Acoustics", "Spine Decompression Sound", "groan@dad-couch.living"),
    ("Guy Who Asks 'Working Hard or Hardly Working?'", "Water Cooler Cliché Institute", "Unfunny Banter Syndicate", "banter@water-cooler.office"),
    ("Your Left Earbud (Lost Under Car Seat)", "Bluetooth Separation Logistics", "Single-Audio Purgatory", "lost@under-seat.bt"),
    ("Person Who Puts Empty Milk Jug Back in Fridge", "Domestic Betrayal Agency", "Zero Milk Remnants", "empty@fridge-disappointment.net"),
    ("The Guy Who Always Says 'I Know a Guy'", "Questionable Sourcing Guild", "Unlicensed Professional Bro", "guy@i-know-a-guy.deal"),
    ("Weather App Saying 0% Rain While Pouring", "Meteorological Gaslighting", "Soaked Umbrella-less Victims", "dry@forecast-lies.weather"),
    ("Conference Call: 'Can Everyone See My Screen?'", "Corporate Virtual Meetings", "Screen Sharing Anxiety", "screenshare@zoom-mute.work"),
    ("Guy Who Brings Acoustic Guitar to Campfire", "Uninvited Wonderwall Corp", "Chord Progression Monopoly", "wonderwall@campfire-trap.music"),
    ("Gas Station Sushi Quality Inspector", "Digestive Roulette Associates", "Expiring Mayonnaise Bureau", "sushi@gas-station.risk"),
    ("The Capybara Emotional Center", "Zen Animal Logistics", "Zero Drama Sanctuary", "chill@capybara-zen.peace"),
    ("Uber Driver Sharing Wild Conspiracy Theories", "Rideshare Debates", "Flat Earth Transit Division", "theories@rideshare-cab.drive"),
    ("Target Cashier Asking About RedCard", "Cash Register Pitches", "1% Savings Evangelism", "save5@target-redcard.store"),
    ("Avocado That Ripened for 4 Minutes", "Produce Timing Hazards", "Instant Brown Mush Alert", "brown@ripe-avocado.guac"),
    ("Dog Who Barks at Literally Nothing", "Ghost Detection Division", "Empty Wall Alarm System", "woof@empty-hallway.dog"),
    ("Self-Proclaimed Barbecue Master", "Backyard Charcoal Syndicate", "Tongs Clicking Twice Dept", "tongs@smoke-ribs.bbq"),
    ("Overpriced Coffee Barista (Spelled Name Wrong)", "Espresso Sarcasm Guild", "Oat Milk Upcharge Unit", "barista@latte-name.cafe"),

    # Mythical & Supernatural
    ("Basement Crawlspace Goblin", "Subterranean Creatures LLC", "Cobweb Architect", "hiss@underfloor.creatures"),
    ("Friendly Neighborhood Cryptid", "Appalachian Forest Guild", "Blurry Photo Consultant", "mothman@cryptid.org"),
    ("Bigfoot's Public Relations Rep", "Forest PR Associates", "Footprint Fabrication", "bigfoot@sightings.wild"),
    ("Sleep Paralysis Demon", "Night Terror Logistics", "Corner of Ceiling Spectator", "midnight@shadow.realm"),
    ("The Tooth Fairy (Foreclosure Div)", "Mythical Dental Exchange", "Enamel Re-possession", "cash@under-pillow.fairy"),
    ("Loch Ness Monster ($3.50 Collector)", "Scottish Waters Inc.", "Tree Fiddy Collection Agency", "three.fiddy@nessie.lake"),
    ("Local Raccoon Syndicate Local 404", "Dumpster Diving Union", "Midnight Trash Audit", "bandit@trash-panda.co"),
    ("Ghost in the Guest Bathroom", "Haunted Property Holdings", "Flickering Vanity Light", "spooky@cold-spot.ghost"),
    ("Competitive Lawn Mower Racer", "Suburban Speed League", "Zero-Turn Velocity", "mow@grass-speed.fast"),

    # Food & Urgent Deliveries
    ("Emergency Pizza Dispatcher 911", "Rapid Crust Response", "Stuffed Crust ICU", "crust@pizza911.org"),
    ("Taco Bell Night Shift Philosopher", "Baja Blast R&D", "Crunchwrap Wisdom Dept", "deepthoughts@tacobell.com"),
    ("Emotional Support Burrito", "Comfort Food Associates", "Guacamole Subsidies", "burrito@carbs.heal"),
    ("Waffle House Parking Lot Referee", "24/7 Combat Sports", "Late Night Griddle Ring", "referee@wafflecombat.org"),
    ("Spicy Ramen Tolerance Coach", "Extreme Scoville League", "Milk Chug Facilitator", "capsaicin@noodlez.org"),
    ("Emergency Sriracha Dispatch", "Condiment Emergency Response", "Red Pepper Immediate Supply", "hot@sriracha-supply.spice"),
    ("Sock Lost in Dryer (Still Alive)", "Laundry Bermuda Triangle", "Single Sock Liberation", "missing@dryer-lint.org"),
    ("Professional Ceiling Fan Styler", "Interior Aerodynamics", "Speed 3 Enthusiast", "wobble@ceilingfan.co"),
    ("Chief Executive Vibes Officer", "Corporate Nonsense Corp", "Synergy & Aura Dept", "vibes@synergy.biz"),
    ("Unopened Tupperware from 2021", "Refrigerator Archeology", "Unknown Science Project", "fuzzy@tupperware-mold.sci"),
    ("Gym Bro Who Doesn't Re-rack Weights", "Plate Abandonment Society", "Trip Hazard Coordinator", "plates@heavy-gym.lift"),
    ("Person Typing IN ALL CAPS ON FACEBOOK", "Senior Internet Battalion", "Caps Lock Permanent Glitch", "shout@facebook-grandma.net"),
    ("Vending Machine That Stole Your Dollar", "Snack Highway Robbery", "Spiral Stuck Mid-Rotation", "stuck@vending-trap.coin"),
    ("Competitive Napper", "International Snooze Federation", "Horizontal Endurance", "nap@snooze-federation.zzz"),
    ("Spaghetti Straightener", "Pasta Alignment Bureau", "Rigid Carbs Compliance", "straight@noodle-alignment.gov"),
    ("Certified Fortune Cookie Writer", "Vague Destiny Ltd", "Ambiguous Prediction Unit", "destiny@fortune-cookie.mystic"),
    ("Professional Bubble Wrap Popper", "Stress Relief Union", "Air Pocket Demolition", "pop@bubble-wrap.fun"),
    ("Elevator Button Double-Presser", "Impatience Logistics", "Speed Acceleration Myth", "press@rapid-elevator.rush"),
    ("Person Who Microwave Fish at Work", "Breakroom Hazard Division", "Permanent Salmon Aroma", "salmon@breakroom-scandal.fish"),
    ("Sir Bojangles The Third", "Royal Court of Absurdity", "Chief Mischief Architect", "jester@prank-kingdom.crown"),
    ("Guy Who Taps You on Left Shoulder and Looks Right", "Middle School Pranksters Guild", "Directional Confusion Unit", "tap@shoulder-prank.joke"),
    ("The Over-Polite Automated Call Center Voice", "Robotic Courtesy Systems", "Infinite Hold Music Specialist", "hold@robot-courtesy.telecom"),
    ("Person Eating Soup in Quiet Office", "Breakroom Decibel Amplification", "Slurp Resonance Testing", "slurp@soup-noise.office"),
    ("The Ghost of Internet Explorer", "Legacy Browser Afterlife", "Still Loading Webpage from 2004", "loading@ie-ghost.microsoft"),
    ("Self-Appointed Neighborhood HOA Watchdog", "Suburban Lawn Tape Measurers", "Grass Blade Height Compliance", "hoa@lawn-fines.suburb"),
    ("Guy Who Still Uses BlackBerry", "Physical QWERTY Nostalgia", "Trackball Clicking Brigade", "bbm@blackberry-never-die.rim"),
    ("Automatic Door That Refuses to Open", "Sensor Blindspot Dynamics", "Awkward Nose Bump Dept", "stuck@automatic-glass.door"),
    ("AirPods Low Battery Boop (Ear Piercing)", "Sudden Cardiac Panic Logistics", "10% Battery Chime Alert", "boop@airpods-dead.apple"),
    ("The One Unopened Email from 2017", "Inbox Guilt Repository", "Unsubscribe Button Phobia", "unread@deep-inbox.guilt"),
    ("GPS Recalculating (Lost in Cornfield)", "Navigation Re-routing Unit", "Turn Right into Swamp Command", "reroute@gps-confused.map"),
    ("Person Who Claps When Plane Lands", "Aviation Applause Society", "Turbulence Relief Guild", "clap@landing-applause.flight"),
    ("Guy Who Explains The Joke You Just Made", "Comedy Theft Syndicate", "Slower Comprehension Desk", "repeat@joke-ruiner.laugh")
]

EMOJIS = ["🤡", "🕵️", "👻", "🍕", "🤖", "👽", "🦉", "🎈", "🚗", "🤠", "👑", "🦖", "🧌", "🦝", "🌯", "🦆", "🦈", "🦥"]


def create_mini_avatar(symbol_emoji, bg_color):
    """Creates a tiny 96x96 avatar badge compressed to JPEG (~2.5 KB)."""
    img = Image.new("RGB", (96, 96), bg_color)
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 91, 91], outline=(255, 255, 255), width=3)
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=65)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def generate_prank_pack(count=100, include_avatars=True):
    """Generates multi-vCard string containing `count` unique hilarious contacts."""
    contacts = []
    start_date = date(2000, 1, 1)
    step_days = max(1, 365 // count)

    bg_palette = [
        (220, 38, 38), (234, 88, 12), (202, 138, 4), (22, 163, 74),
        (13, 148, 136), (37, 99, 235), (124, 58, 237), (219, 39, 119), (30, 41, 59)
    ]
    avatar_pool = []
    if include_avatars:
        for i, bg in enumerate(bg_palette):
            avatar_pool.append(create_mini_avatar(EMOJIS[i % len(EMOJIS)], bg))

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
            "NOTE:Contact reference: CLOUD-SYNC-NODE-7.",
            "CATEGORIES:CloudSync"
        ]

        if include_avatars and avatar_pool:
            vcard_lines.append(f"PHOTO;TYPE=JPEG;ENCODING=b:{avatar_pool[i % len(avatar_pool)]}")

        vcard_lines.append("END:VCARD")
        contacts.append("\r\n".join(vcard_lines))

    return "\r\n".join(contacts)


def main():
    print("🚀 Generating Enhanced Multi-Contact Prank Packs...")
    p100_path = os.path.join(PRESETS_DIR, "prank_pack_100.vcf")
    pack100 = generate_prank_pack(100, include_avatars=True)
    with open(p100_path, "w", encoding="utf-8") as f:
        f.write(pack100)
    print(f"  ✅ [100 Pack] Saved to {p100_path} ({len(pack100) // 1024} KB)")


if __name__ == "__main__":
    main()
