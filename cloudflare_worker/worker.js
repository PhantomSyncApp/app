/**
 * PhantomSync Cloudflare Worker API
 * 
 * Secure backend that combines Gemini Live AI for target-specific inside jokes
 * with a massive curated Goofy Library (85+ unique incidents) to deliver a full 100-event,
 * 18-month slow-burn prank master calendar in under 3 seconds!
 * 
 * Version 3.0.0 - Hybrid AI + Curated Masterpiece Engine
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "PhantomSync AI Backend",
          version: "3.0.0 (Hybrid Master Engine)",
          has_gemini_key: Boolean(env.GEMINI_API_KEY),
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Ping diagnostic
    if (url.pathname === "/api/ping-gemini") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) return new Response(JSON.stringify({ error: "No key" }), { status: 400 });
      const targetModel = url.searchParams.get("model") || "gemini-3.1-flash-lite";
      const t0 = Date.now();
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "PONG" }] }] }),
            signal: AbortSignal.timeout(6000),
          }
        );
        const text = await resp.text();
        return new Response(JSON.stringify({ model: targetModel, elapsed_ms: Date.now() - t0, status: resp.status, raw_response: text }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Generate Campaign Endpoint (Hybrid AI + Goofy Library)
    if (url.pathname === "/api/generate" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const {
        name = "Target",
        quirks = "",
        theme = "mixed",
        count = 100,
        delayDays = 14,
      } = body;

      const apiKey = env.GEMINI_API_KEY;
      let aiCustomEvents = [];
      let modelUsed = "smart_procedural";

      // 1. Generate 12-16 laser-personalized AI events from target's lore (fast sub-3s)
      if (apiKey && quirks.trim()) {
        try {
          const aiResult = await generatePersonalizedAIEvents(apiKey, {
            name,
            quirks,
            theme,
            count: 14,
          });
          if (aiResult && aiResult.events.length > 0) {
            aiCustomEvents = aiResult.events;
            modelUsed = aiResult.modelUsed;
          }
        } catch (err) {
          console.warn("AI generation error, using smart procedural lore parser:", err.message);
          aiCustomEvents = generateProceduralLoreEvents(name, quirks, 12);
        }
      } else {
        aiCustomEvents = generateProceduralLoreEvents(name, quirks, 12);
      }

      // 2. Interleave with our rich Goofy Library to hit requested total (e.g. 25, 50, 100)
      const targetTotal = Math.min(Math.max(count, 20), 103);
      const combinedSchedule = buildMasterpieceSchedule(aiCustomEvents, targetTotal, delayDays);

      return new Response(
        JSON.stringify({
          success: true,
          mode: aiCustomEvents.length > 0 ? "hybrid_ai_masterpiece" : "masterpiece_library",
          engine: `Google Gemini (${modelUsed}) + PhantomSync Master Library`,
          events: combinedSchedule,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};

/**
 * Calls Gemini for 12-14 hyper-tailored events from lore (takes ~2.5s).
 */
async function generatePersonalizedAIEvents(apiKey, { name, quirks, theme, count }) {
  const prompt = `
You are an elite satirical comedy writer designing stealth slow-burn calendar prank appointments for an iPhone calendar titled "Mobile Directory Sync".
The victim receives dry, clinical, institutional appointments directly weaponizing their embarrassing habits, lore, and backstory.

TARGET: ${name}
TARGET BACKSTORY & QUIRKS: ${quirks}
THEME: ${theme}
GENERATE EXACTLY ${count} UNIQUE, BRILLIANT EVENTS.

RULES:
1. NEVER use the word "Birthday" or celebrate anything.
2. DO NOT repeat the user's prompt sentences verbatim. DECONSTRUCT the target's lore into creative, ultra-specific institutional citations:
   - Workplace/OSHA infractions (breakroom microwave odors, fish reheating penalties, kitchen grievances)
   - Professional license audits (biological permit renewals, plankton handling lapses, lab compliance)
   - Social & relationship telemetry (wedding attendee frequency inquiries, tuxedo cummerbund disputes)
   - Municipal/State jurisdiction disputes (interstate relocation taxes, out-of-state dialect audits)
   - Smart appliance mutiny (connected appliances lodging formal complaints)
3. Tone: 100% deadpan, official, bureaucratic, straight-faced.
4. Titles: Include a punchy emoji.
5. Memos: 1-2 realistic, dry sentences.

Return ONLY a valid JSON array of ${count} objects (no markdown blocks, no text):
[
  {
    "title": "🐟 Breakroom Aquatic Protein Reheating Citation (OSHA Code 8)",
    "memo": "Facilities Notice: Office air scrubbers recorded 4.2 minutes of continuous salmon microwave exposure. Floor 3 evacuated until 14:00.",
    "category": "Sanitary Protocol"
  }
]
`;

  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 2500,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Google API ${response.status} (${model}): ${errText}`);
        continue;
      }

      const data = await response.json();
      const parsed = extractJsonArray(data);
      if (parsed && parsed.length > 0) {
        return {
          modelUsed: model,
          events: parsed,
        };
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

/**
 * Extracts and cleans JSON from LLM response.
 */
function extractJsonArray(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  if (!parts.length) return null;

  for (let i = parts.length - 1; i >= 0; i--) {
    const text = parts[i]?.text;
    if (!text) continue;

    let trimmed = text.trim();
    if (trimmed.startsWith("```")) {
      trimmed = trimmed.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    try {
      const res = JSON.parse(trimmed);
      if (Array.isArray(res) && res.length) return res;
    } catch {}

    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const slice = text.substring(firstBracket, lastBracket + 1);
      try {
        const res = JSON.parse(slice);
        if (Array.isArray(res) && res.length) return res;
      } catch {}
    }
  }

  return null;
}

/**
 * Fallback parser that breaks user lore into clean, witty topics if AI is unreachable.
 */
function generateProceduralLoreEvents(name, rawQuirks, count) {
  const phrases = (rawQuirks || "daily habits")
    .replace(/[.!?]+/g, ",")
    .split(/[,;\n]+/)
    .map(p => p.trim())
    .filter(p => p.length > 2 && p.length < 50);

  const getTopic = (idx) => phrases.length ? phrases[idx % phrases.length] : "daily habits";

  const templates = [
    {
      title: (t) => `🐟 Breakroom Olfactory Assessment: ${t}`,
      memo: (t) => `Facilities & Environmental Health: Airborne particulate sensors flagged prolonged heating of aquatic proteins regarding '${t}'. Charcoal ventilation cycle required.`,
      category: "Sanitary Protocol",
    },
    {
      title: (t) => `🔬 State Biological Research Permit Audit: ${t}`,
      memo: (t) => `Licensing Bureau: Credentials concerning '${t}' require recertification. Please verify no wild aquatic cultures were moved across state lines.`,
      category: "Regulatory Oversight",
    },
    {
      title: (t) => `🤵 Formal Wedding Attendance Frequency Review (${t})`,
      memo: (t) => `Bureau of Social Telemetry: Statistical anomaly detected in annual event attendance regarding '${t}'. RSVP audit placed on docket.`,
      category: "Social Oversight",
    },
    {
      title: (t) => `🚗 Interstate Relocation Tax Audit into ${name}'s ${t}`,
      memo: (t) => `State Comptroller: Cross-border assets and domicile transitions concerning '${t}' flagged for statutory administrative reconciliation.`,
      category: "Financial Audit",
    },
    {
      title: (t) => `📱 Cellular Texting Efficiency Evaluation: '${t}'`,
      memo: (t) => `Carrier Telemetry: Communication velocity regarding '${t}' scored 99.4% monosyllabic. Courtesy retraining course pending review.`,
      category: "Telecom Etiquette",
    },
    {
      title: (t) => `🔍 Optical Sensor Alignment: Blind Angle Review (${t})`,
      memo: (t) => `Surveillance Directive 802: Please maintain window blinds at a 45-degree angle. High-resolution telemetry on '${t}' requires line of sight.`,
      category: "Surveillance Directive",
    },
  ];

  const results = [];
  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length];
    const topic = getTopic(i);
    results.push({
      title: tmpl.title(topic),
      memo: tmpl.memo(topic),
      category: tmpl.category,
    });
  }
  return results;
}

/**
 * Combines personalized AI events with the massive Goofy Library and builds
 * a 100% chronological, organically paced 12-18 month slow-burn calendar.
 */
function buildMasterpieceSchedule(personalizedEvents, totalTarget, delayDays) {
  // 1. Shuffle the Goofy Library to ensure unique ordering every campaign
  const shuffledLibrary = [...GOOFY_INCIDENT_LIBRARY].sort(() => 0.5 - Math.random());

  // 2. Interleave: Insert a personalized AI event every 3-4 library events
  const interleaved = [];
  let aiIdx = 0;
  let libIdx = 0;

  for (let i = 0; i < totalTarget; i++) {
    // Inject personalized event on strike 0, and every 4th slot while AI events remain
    if ((i === 0 || i % 4 === 0) && aiIdx < personalizedEvents.length) {
      interleaved.push(personalizedEvents[aiIdx++]);
    } else if (libIdx < shuffledLibrary.length) {
      interleaved.push(shuffledLibrary[libIdx++]);
    } else if (aiIdx < personalizedEvents.length) {
      interleaved.push(personalizedEvents[aiIdx++]);
    }
  }

  // 3. Compute organic calendar pacing (3-7 day intervals across 12-18 months)
  const today = new Date();
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + delayDays);

  const gapPool = [3, 4, 5, 5, 6, 7];

  return interleaved.map((item, idx) => {
    const gap = idx === 0 ? delayDays : gapPool[Math.floor(Math.random() * gapPool.length)];

    if (idx > 0) {
      currentDate.setDate(currentDate.getDate() + gap);
    }

    const dateFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(currentDate);

    return {
      id: idx,
      dateObj: new Date(currentDate),
      dateStr: dateFormatted,
      title: item.title,
      memo: item.memo,
      category: item.category || "Scheduled Protocol",
      gap: gap,
    };
  });
}

/**
 * THE GOOFY LIBRARY (85+ Premium Handcrafted Slow-Burn Prank Incidents)
 * Deadpan, authentic-looking, and free of any birthday tropes.
 */
const GOOFY_INCIDENT_LIBRARY = [
  // Domestic & Sanitary
  {
    title: "🥛 Inspection of Empty 2% Milk Carton Left in Fridge",
    memo: "Resource Management: Exactly 0.04oz of liquid preserved in plastic jug. Technically not empty, thus avoiding statutory obligation to replace container.",
    category: "Domestic Review",
  },
  {
    title: "🧀 3:14 AM Shredded Cheese Transaction Telemetry Audit",
    memo: "Smart Fridge Telemetry: Door latch unsealed for 58 seconds. Weight sensor recorded heavy existential sigh before door re-latched.",
    category: "IoT Disciplinary",
  },
  {
    title: "🧼 BlenderBottle Biohazard Level 2 Quarantine & Swab Extraction",
    memo: "Public Health Notice: Organic protein residue left on metal shaker ball has developed independent motor reflexes. Submerge in boiling solvent immediately.",
    category: "Sanitary Protocol",
  },
  {
    title: "📦 47 Unbroken Amazon Cardboard Boxes Garage Intervention",
    memo: "Zoning Board Directive: Tower of uncollapsed shipping containers has achieved structural load-bearing classification in residential garage.",
    category: "Domestic Review",
  },
  {
    title: "🧼 Emergency Dishwasher Filter Decontamination Drill",
    memo: "Appliance Notice: Filter mesh contains archaeological food remnants dating back to Q3 2024. Diagnostic sanitize rinse engaged.",
    category: "Sanitary Protocol",
  },
  {
    title: "🧦 Stray Sock Sole Custody Arbitration Hearing",
    memo: "Appliance Grievance: Dryer drum telemetry indicates 1 navy crew sock was sacrificed to the internal heating shroud. No reunion possible.",
    category: "Domestic Review",
  },
  {
    title: "🥡 3-Week-Old Takeout Container Bio-Culture Review",
    memo: "Public Health Advisory: Styrofoam container in lower crisper drawer has formed a rudimentary legal government. Do not open lid.",
    category: "Sanitary Protocol",
  },
  {
    title: "🧊 Ice Maker 3:00 AM Hollow Ghost-Cube Dispensation",
    memo: "Freezer Telemetry: Ice tray harvested 2 cloudy, hollow ice pellets with the force of an artillery discharge. Sound verified in master bedroom.",
    category: "IoT Disciplinary",
  },

  // Municipal & Civil Citations
  {
    title: "🌿 Bermuda Turf Blade Elevation Citation (HOA Rule 4-B)",
    memo: "HOA Violation: Front lawn turf measured at 2.62 inches (allowable limit: 2.50 inches). Fine assessed. Trash cans placed out 11 minutes early.",
    category: "Municipal Citation",
  },
  {
    title: "🚗 Curb Decibel & Exhaust Compliance Sweep (City Code 404)",
    memo: "Acoustic Enforcement: Neighborhood complaints filed regarding cold-start acoustic vibration. Physical decibel meter test scheduled at curb.",
    category: "Municipal Citation",
  },
  {
    title: "🗑️ Recycling Bin Contamination Inquiry (Cardboard Pizza Grease)",
    memo: "Waste Management Directive: Greasy pizza box placed into clean paper bin. Forensic grease analysis traced to slice #3.",
    category: "Municipal Citation",
  },
  {
    title: "🚶 Walkway Step Cadence & Concrete Micro-Crack Assessment",
    memo: "Public Works Bureau: Front walkway paving inspected for irregular heel-strike impacts. Remediation sealant checklist issued.",
    category: "Municipal Citation",
  },
  {
    title: "📯 Mailbox Closing Velocity & Hinge Squeak Citation",
    memo: "Subdivision Compliance: Mailbox latch closed at 84 decibels. Dry graphite lubricant application mandated within 48 hours.",
    category: "Municipal Citation",
  },
  {
    title: "🍂 Unsolicited Leaf Drift Encroachment Hearing",
    memo: "Civil Arbitration: Exactly 14 maple leaves crossed the western property boundary into neighboring driveway without written permission.",
    category: "Municipal Citation",
  },

  // Smart Home & IoT Disciplinary Actions
  {
    title: "🤖 Sentient Roomba Bathmat Tassel Entanglement Hearing",
    memo: "Distress Bulletin: Unit has intentionally driven into high-pile bathroom rug. Spinning in circles until battery exhaustion. Salvage requested.",
    category: "IoT Disciplinary",
  },
  {
    title: "🚨 Smoke Detector 2:14 AM Battery Chirp Readiness Evaluation",
    memo: "Hardware Diagnostic: Cell voltage is at 96%. Single 115-decibel high-frequency pulse scheduled every 43 seconds to test tenant alertness.",
    category: "IoT Disciplinary",
  },
  {
    title: "🖨️ Mandatory Color Extortion: 0.002ml Sacrificial Cyan Required",
    memo: "Printer Compliance: Document contains 100% black text. However, internal aesthetic policy requires sacrificial yellow and cyan ink.",
    category: "Hardware Compliance",
  },
  {
    title: "📶 3:00 AM Wi-Fi Router Downstream Severance Drill",
    memo: "Chaos Maintenance: All downstream channels dropped for 19 seconds during critical online activity. Cable power cycling required.",
    category: "IoT Disciplinary",
  },
  {
    title: "📺 Smart TV Terms of Service Mandatory 48-Page Acceptance",
    memo: "Device Update: Firmware 14.2 requires explicit consent to microphone telemetry while eating chips on the sofa. Screen locked until accepted.",
    category: "IoT Disciplinary",
  },
  {
    title: "🌡️ Smart Thermostat Passive-Aggressive Temperature Drift",
    memo: "HVAC Telemetry: Ambient temperature set to 69°. Internal unit recalibrated to 73° citing 'efficiency concerns'. Override denied.",
    category: "IoT Disciplinary",
  },
  {
    title: "🔋 Device 2% Battery Defiance Inquest",
    memo: "Battery Health Council: Phone operated at 1% charge for 38 consecutive minutes. Low Power Mode brightness dimmed to 0.01 nits by force.",
    category: "Telecom Etiquette",
  },

  // Federal Surveillance Directives
  {
    title: "🔍 Optical Sensor Alignment: Maintain Blinds at Mandated 45° Angle",
    memo: "Surveillance Directive 802: Second-floor blinds must be held at exactly 45 degrees. Satellite optical telemetry requires clean line of sight.",
    category: "Surveillance Directive",
  },
  {
    title: "🐦 Avian Drone Perch Maintenance (CIA Operative Pigeon 42)",
    memo: "Avian Telemetry: Breadcrumb ingestion protocol complete. Aerial perch established on overhead utility wire. Do not make direct eye contact.",
    category: "Surveillance Directive",
  },
  {
    title: "🎙️ Living Room Acoustic Sound Check (NSA Domestic Audio Div)",
    memo: "Audio Calibration: Room reverberation tested. Please articulate slightly clearer when voicing private complaints to the household dog.",
    category: "Surveillance Directive",
  },
  {
    title: "🚙 Suspicious Unmarked White Van Parking Space Reservation",
    memo: "Federal Coordination: 2 parking spaces in front of residence reserved for HVAC technicians who will never exit the vehicle.",
    category: "Surveillance Directive",
  },
  {
    title: "📡 Microwave Door Radiation Line-of-Sight Calibration",
    memo: "Signal Intercept: Please avoid standing between the microwave door and the living room router during peak operational testing.",
    category: "Surveillance Directive",
  },

  // Corporate & Legal Purgatory
  {
    title: "📊 Q1 Unreconciled Taco Bell Debt Hearing ($20.00 + $4.12 Fees)",
    memo: "Accounting Directive: Unsettled 2024 Cheesy Gordita Crunch transaction has accrued statutory delinquency penalties. Formal settlement hearing.",
    category: "Financial Audit",
  },
  {
    title: "⚖️ County Tax Assessor Inquiry into Excessive Tupperware",
    memo: "Asset Review: Mismatched plastic food storage lids classified as taxable industrial inventory under County Code Section 12-A.",
    category: "Financial Audit",
  },
  {
    title: "💳 2023 Vending Machine $1.75 Trapped Snickers Arbitration",
    memo: "Commercial Claims: Spiral dispenser rotated 350 degrees leaving confection suspended against glass. Wage garnishment claim reviewed.",
    category: "Financial Audit",
  },
  {
    title: "📉 Statutory Review of Expired Grocery Store Reward Points",
    memo: "Loyalty Bureau: Exactly 42 fuel points expired at midnight without utilization. Formal notation entered on personal consumer record.",
    category: "Financial Audit",
  },
  {
    title: "🧾 Forgotten Subscription Auto-Renew Audit (Yearly Charge: $89.99)",
    memo: "Banking Alert: 14-day free trial from 2022 successfully renewed for 4th consecutive year. App functionality remains unknown.",
    category: "Financial Audit",
  },

  // Telecom & Communication Etiquette
  {
    title: "📱 Carrier Monosyllabic Texting Audit: 'k', 'yeah', 'cool'",
    memo: "Network Directive: Text reply pattern evaluated. Efficiency rating: 99.8%. Conversational enthusiasm rating: 0.02%. Retraining on docket.",
    category: "Telecom Etiquette",
  },
  {
    title: "💤 7:00 AM Consecutive Five-Alarm Snooze Disciplinary Hearing",
    memo: "Chronobiology Bureau: Alarm snoozed 6 times consecutively across two separate devices. Circadian rhythm permit temporarily suspended.",
    category: "Telecom Etiquette",
  },
  {
    title: "📞 47-Minute Customer Service On-Hold Acoustic Endurance Test",
    memo: "Telecom Standard: Mandated smooth jazz saxophone loop delivered at varying frequencies. Disconnection upon representative pickup scheduled.",
    category: "Telecom Etiquette",
  },
  {
    title: "✉️ Unread Email Inbox Exceeding 14,000 Mark Milestone",
    memo: "Digital Sanitation: 14,892 unread promotional newsletters from stores visited once in 2018. Bankruptcy filing recommended.",
    category: "Telecom Etiquette",
  },

  // Social & Modern Life Violations
  {
    title: "🎵 Unsolicited Campfire Wonderwall Acoustic Performance",
    memo: "Acoustic Notice: Campfire detected. G-chord struck without invitation. 'Anyway, here is Wonderwall for the fourth consecutive gathering.'",
    category: "Social Violation",
  },
  {
    title: "☕ Lukewarm Reheated Coffee Microwave Abstraction Review",
    memo: "Thermodynamics Bureau: Mug of coffee reheated 3 separate times across 5 hours, left in microwave until forgotten. Incident logged.",
    category: "Domestic Review",
  },
  {
    title: "🚗 14-Point Turn Parking Lot Embarrassment Inquiry",
    memo: "Traffic Safety Bureau: Attempt to parallel park between two SUVs witnessed by 4 pedestrians. Formal steering wheel surrender proposed.",
    category: "Municipal Citation",
  },
  {
    title: "👖 Fitting Into High School Jeans Failure Review Panel",
    memo: "Textile Arbitration: Denim seam stress test exceeded nominal tension tolerance. Pants returned to bottom drawer until next year.",
    category: "Domestic Review",
  },
  {
    title: "🍿 45-Minute Netflix Menu Browsing Without Watching Inspection",
    memo: "Streaming Telemetry: 1,400 film trailers previewed. Zero movies initiated. Target fell asleep on couch with remote in palm at 23:42.",
    category: "Social Violation",
  },
  {
    title: "🦷 Flossing Frequency Honest Assessment Hearing",
    memo: "Dental Board: Target affirmed flossing 'every single night'. Plaque telemetry indicates flossing occurs only 15 minutes before dental checkup.",
    category: "Sanitary Protocol",
  },
  {
    title: "🛒 Shopping Cart Squeaky Wheel Navigation Endurance Audit",
    memo: "Retail Telemetry: Grocery cart with 360-degree spinning front-left caster pushed through aisles for 38 minutes. Directional drift: 24° left.",
    category: "Domestic Review",
  },
  {
    title: "🔌 47 Tangled Mystery Cables in Cardboard Box Audit",
    memo: "Electronics Bureau: Storage container holds 12 Micro-USB cords, 3 RCA cables, and 1 proprietary charger for a camera lost in 2007.",
    category: "Domestic Review",
  },
  {
    title: "🧴 Shampoo Bottle Water Inversion Dilution Protocol",
    memo: "Resource Recovery: Water added to final 5% of shampoo bottle to prolong life for 18 additional showers. Soap viscosity rating: 0.04.",
    category: "Domestic Review",
  },
  {
    title: "🔑 Pocket Car Key Emergency Panic Button Accidental Trigger",
    memo: "Acoustic Advisory: Key fob pressed against thigh while carrying groceries. Horn honked 8 times before target located fob in pocket.",
    category: "Municipal Citation",
  },
  {
    title: "🌯 Burrito Structural Integrity Blowout Hearing (Bottom Foil Breach)",
    memo: "Culinary Failure Review: Tortilla rupture occurred at bite #6. Sour cream and black beans compromised napkin perimeter.",
    category: "Sanitary Protocol",
  },
  {
    title: "🕶️ Searching for Sunglasses Currently Resting on Head Inquest",
    memo: "Cognitive Telemetry: Target spent 14 minutes tearing apart vehicle interior searching for shades resting securely atop forehead.",
    category: "Domestic Review",
  },
  {
    title: "📺 Leaving Movie Subtitles On For English Speech Hearing",
    memo: "Audio Compliance: Dialogue volume set to 12. Explosions volume set to 94. Subtitles permanently engaged to discern mumbled dialogue.",
    category: "IoT Disciplinary",
  },
  {
    title: "👟 Sneaker Squeak on Wet Linoleum Tile Diagnostic Sweep",
    memo: "Acoustic Disciplinary: Rubber tread squeaked with every forward step across office lobby following rain shower. Stealth rating: 0%.",
    category: "Municipal Citation",
  },
  {
    title: "🍕 Third Slice of Pizza Regret Assessment Protocol",
    memo: "Gastrointestinal Advisory: Physiological satiety achieved at slice #2. Slice #3 consumed solely out of moral obligation.",
    category: "Domestic Review",
  },
  {
    title: "📱 Pocket Dialing Ex-Colleague at 11:42 PM Inquiry",
    memo: "Telecom Incident: Phone placed in back pocket without screen lock. 4-minute voicemail of car radio static and pocket rustling recorded.",
    category: "Telecom Etiquette",
  },
  {
    title: "🧊 Ice Cube Tray Refill Refusal Arbitration",
    memo: "Domestic Arbitration: Single ice cube harvested from 14-cube tray. Empty tray returned to freezer without water refill.",
    category: "Domestic Review",
  },
  {
    title: "🔌 Unplugging Wrong Cord from Power Strip Incident",
    memo: "Infrastructure Failure: Desktop computer power severed while attempting to unplug desk lamp. Unsaved document lost to the ether.",
    category: "Hardware Compliance",
  },
  {
    title: "🧼 Soap Dispenser Pump 3-Pump Frantic Priming Drill",
    memo: "Domestic Protocol: Plastic pump depressed 14 times with zero output before dispensing single watery bubble onto knuckles.",
    category: "Sanitary Protocol",
  },
  {
    title: "🛋️ Remote Control Deep Cushion Crevasse Retrieval Mission",
    memo: "Search & Rescue: TV remote located beneath sofa cushions alongside 3 pennies, a pretzel nugget, and a 2019 AAA battery.",
    category: "Domestic Review",
  },
  {
    title: "🛒 Target $100 Spending Threshold for Toothpaste Run Audit",
    memo: "Consumer Telemetry: Target entered store for toothpaste ($4.99). Total register checkout: $118.42 including decorative ceramic candle.",
    category: "Financial Audit",
  },
  {
    title: "🚗 Leaving Turn Signal On for 3.4 Miles Interstate Hearing",
    memo: "Highway Telemetry: Left directional blinker operated continuously across 4 highway exits with zero intention of lane change.",
    category: "Municipal Citation",
  },
  {
    title: "🎧 Headphone Wire Door Knob Entanglement Violence Review",
    memo: "Safety Notice: Wired earbuds violently wrenched from ears after cable caught on interior door handle during rapid stride.",
    category: "Domestic Review",
  },
  {
    title: "🥩 Frozen Ground Beef Countertop Thawing Negligence Review",
    memo: "Culinary Safety: 1lb beef block set on counter at 8:00 AM with intention of dinner preparation. Still frozen solid at 6:45 PM.",
    category: "Sanitary Protocol",
  },
  {
    title: "📦 Opening Shipping Box with Car Keys Emergency Protocol",
    memo: "Packaging Violation: Box cutter located 6 feet away. Packing tape breached using blunt end of Honda ignition key.",
    category: "Hardware Compliance",
  },
  {
    title: "🔋 Television Remote Battery Spin & Slap Calibration Drill",
    memo: "Hardware Repair: Depleted AA batteries spun 180 degrees in casing followed by firm palm strike. Functionality restored for 4 minutes.",
    category: "Hardware Compliance",
  },
  {
    title: "🚿 Shower Temperature Knob 1-Millimeter Arctic/Lava Threshold Review",
    memo: "Thermodynamics Notice: Knob rotated 0.5 millimeters left. Water temperature escalated from glacial meltwater to volcanic magma.",
    category: "Domestic Review",
  },
  {
    title: "🍞 Bread Bag Twist Tie Abandonment & Spin-Under Procedure",
    memo: "Packaging Review: Wire twist tie discarded. Loaf preserved by spinning plastic bag opening 3 times and tucking under loaf weight.",
    category: "Domestic Review",
  },
  {
    title: "🚪 Pushing 'Pull' Door in Front of Strangers Review Panel",
    memo: "Commercial Ingress: Glass door pushed with full body weight despite large brass 'PULL' sign at eye level. Eyewitnesses confirmed.",
    category: "Social Violation",
  },
  {
    title: "📱 Dropping Smartphone Directly Onto Face While Lying in Bed",
    memo: "Trauma Telemetry: Device slipped from thumb grip at 23:14. Aluminum chassis impacted bridge of nose. Sudden involuntary blink recorded.",
    category: "Telecom Etiquette",
  },
  {
    title: "🥣 Cereal Box Inner Plastic Bag Tearing Catastrophe Inquest",
    memo: "Packaging Malfunction: Bag torn down side seam instead of top seal. Frosted Flakes distributed uncontrollably inside cardboard lining.",
    category: "Domestic Review",
  },
  {
    title: "🧻 Toilet Paper Roll Underhand Orientation Disciplinary Notice",
    memo: "Subdivision Standard: Paper roll installed with sheet hanging against wall instead of forward-facing. Corrective citation issued.",
    category: "Municipal Citation",
  },
  {
    title: "🚗 Gasoline Tank Flap Opened on Wrong Side at Pump Hearing",
    memo: "Automotive Telemetry: Vehicle pulled into service bay #4. Driver exited, noticed filler door on opposite flank, stared blankly for 8 seconds.",
    category: "Municipal Citation",
  },
  {
    title: "☕ Microwave Beep Silenced with Exactly 0:01 Remaining Drill",
    memo: "Tactical Acoustic Operation: Door opened at 0:01 to prevent midnight notification chime. Bomb technician certification awarded.",
    category: "Domestic Review",
  },
  {
    title: "🛍️ Reusable Grocery Bags Left in Vehicle Trunk During Checkout",
    memo: "Environmental Audit: 8 canvas totes remained neatly folded in trunk while target purchased 6 plastic bags at cash register.",
    category: "Domestic Review",
  },
  {
    title: "🥪 Cutting Sandwich Diagonally vs Vertically Geometric Dispute",
    memo: "Culinary Geometry: Sourdough sandwich sliced horizontally into rectangles. Structural surface area for crust enjoyment reduced by 40%.",
    category: "Domestic Review",
  },
  {
    title: "💤 Waking Up 2 Minutes Before Alarm Sound Involuntary Grief Review",
    memo: "Circadian Telemetry: Eyes opened naturally at 6:58 AM for a 7:00 AM alarm. Staring at ceiling in despair recorded for 120 seconds.",
    category: "Domestic Review",
  },
  {
    title: "🖨️ Printer Paper Jam in Mysterious Internal Roller Chamber 4",
    memo: "Hardware Obstruction: Paper accordion-folded inside internal gears. Extraction requires removing 14 screws and losing faith in technology.",
    category: "Hardware Compliance",
  },
  {
    title: "🚲 Exercise Bike Repurposed as Clothes Hanger Review",
    memo: "Fitness Asset Audit: Stationary cycle handles currently support 4 hoodies, 2 wet towels, and a winter parka. Zero pedal rotations since 2023.",
    category: "Domestic Review",
  },
  {
    title: "📱 Sending Risky Text and Immediately Throwing Phone Across Room",
    memo: "Communication Stress Protocol: Message transmitted. Phone tossed face-down onto bed mattress while target paces hallway.",
    category: "Telecom Etiquette",
  },
  {
    title: "🍕 Burning Roof of Mouth on Molten Cheese First Bite Hearing",
    memo: "Culinary Impatience: Delivery pizza consumed 4 seconds out of box. Palate tissue scalded. Tongue numbness projected for 72 hours.",
    category: "Sanitary Protocol",
  },
  {
    title: "🔑 Car Key Pocket Pat-Down Mini Heart Attack Evaluation",
    memo: "Biometric Telemetry: Right pocket patted empty. Pulse escalated to 140 BPM. Keys discovered in left hand after 4 frantic seconds.",
    category: "Domestic Review",
  },
  {
    title: "🛒 Hesitating at Four-Way Stop Sign Standoff Arbitration",
    memo: "Traffic Courtesy Violation: All 4 vehicles arrived simultaneously. Polite wave battle ensued for 38 seconds before anyone moved.",
    category: "Municipal Citation",
  },
  {
    title: "🥫 Bottom-Shelf Can of Crushed Tomatoes 2021 Expiration Inquest",
    memo: "Pantry Archaeology: Canned legume discovered behind baking soda. Can expiration: November 2021. 'Still technically fine' defense entered.",
    category: "Sanitary Protocol",
  },
  {
    title: "👔 Ironing Only Front of Dress Shirt Under Jacket Procedure",
    memo: "Apparel Efficiency: Front panels pressed with steam. Back panel left completely wrinkled with reliance on blazer remaining buttoned.",
    category: "Domestic Review",
  },
  {
    title: "📦 Flattening Delivery Box by Stomping On It with Bare Foot",
    memo: "Waste Management Incident: Heel strike landed directly on brass staple. Hopping across kitchen on one foot observed.",
    category: "Domestic Review",
  },
  {
    title: "🍳 Non-Stick Pan Scratched with Metal Fork Judicial Hearing",
    memo: "Culinary Crime: Teflon surface breached with stainless steel dinner fork while stirring scrambled eggs. Lifetime warranty revoked.",
    category: "Sanitary Protocol",
  },
  {
    title: "🧦 Walking Across Kitchen in Socks and Stepping on Ice Cube Puddle",
    memo: "Domestic Tragedy: Sock cotton absorbed 0.5oz melted ice water. Squishing sensation documented across hardwood floor.",
    category: "Domestic Review",
  },
  {
    title: "📶 Wi-Fi Works Everywhere in House Except Sitting on Toilet Review",
    memo: "RF Telemetry: Signal strength drops from 400 Mbps to 1 bar of Edge network precisely upon bathroom threshold entry.",
    category: "IoT Disciplinary",
  },
  {
    title: "🚗 Checking Car Door Handle Three Times After Locking Protocol",
    memo: "Obsessive Security Review: Key fob beeped lock confirmation. Driver returned to physically pull door handle 3 consecutive times.",
    category: "Domestic Review",
  },
  {
    title: "🧴 Bar of Soap Shrunk to Razor-Thin Slippery Shard Review",
    memo: "Sanitary Asset: Soap wafer measured at 1.2 millimeters. Target attempted to graft shard onto new bar with zero structural bonding.",
    category: "Sanitary Protocol",
  },
  {
    title: "📱 Turning Down Car Stereo Volume to 'See Street Signs Better'",
    memo: "Cognitive Synergy: Bass-heavy audio muted to 0 to assist optical identification of house numbers on dark residential avenue.",
    category: "Municipal Citation",
  },
  {
    title: "☕ Hot Tea Forgotten Until 100% Room Temperature Evaluation",
    memo: "Beverage Telemetry: Mug steeped at 09:15. Discovered behind laptop monitor at 14:40. Lukewarm swallow executed with regret.",
    category: "Domestic Review",
  },
  {
    title: "🛒 Shopping Cart Left in Empty Parking Space 10 Feet from Return Coral",
    memo: "Civic Duty Failure: Cart abandoned between two painted lines. Shopping cart return coral located exactly 4 paces away.",
    category: "Municipal Citation",
  },
  {
    title: "🚪 Walking Into Room and Completely Forgetting Purpose of Entry",
    memo: "Neurological Buffer Reset: Door frame crossed. Objective erased from short-term memory. Target stared at kitchen cabinets for 19 seconds.",
    category: "Domestic Review",
  },
  {
    title: "🧻 Realizing Toilet Paper Roll Has 1 Sheet Left After Sitting Down",
    memo: "Emergency Protocol: Roll contains single perforated square. Cardboard tube inspection executed. Panic negotiations initiated.",
    category: "Sanitary Protocol",
  },
  {
    title: "🚗 Parallel Parking Attempt Aborted: Driving to Another State",
    memo: "Traffic Maneuver: Reverse gear engaged. Car bumped curb at 2 MPH. Driver immediately drove 4 blocks away to find pull-in spot.",
    category: "Municipal Citation",
  },
];
