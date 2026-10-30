/**
 * PhantomSync Cloudflare Worker API
 * 
 * Secure backend that holds the Gemini API key, handles CORS,
 * and procedurally generates custom stealth prank calendar events.
 * 
 * Version 2.2.0 - High-Speed Gemini 2.5 Flash with Sub-2s Response Time
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    // 2. Health Check
    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "PhantomSync AI Backend",
          version: "2.2.0",
          has_gemini_key: Boolean(env.GEMINI_API_KEY),
        }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Instant 1-Second Raw Ping Test
    if (url.pathname === "/api/ping-gemini") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "No GEMINI_API_KEY set" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const t0 = Date.now();
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Respond with the word 'PONG'." }] }],
            }),
            signal: AbortSignal.timeout(6000),
          }
        );
        const text = await resp.text();
        return new Response(
          JSON.stringify({
            elapsed_ms: Date.now() - t0,
            status: resp.status,
            raw_response: text,
          }),
          {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ elapsed_ms: Date.now() - t0, error: e.message }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 4. List Models Diagnostic
    if (url.pathname === "/api/models") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "No GEMINI_API_KEY configured" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          signal: AbortSignal.timeout(6000),
        });
        const text = await res.text();
        return new Response(text, {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // 5. Test AI Generation Diagnostic (Fast 3-Item Test)
    if (url.pathname === "/api/test-ai") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "No GEMINI_API_KEY configured in worker secrets" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const t0 = Date.now();
      try {
        const events = await generateEventsWithGemini(apiKey, {
          name: "Dave",
          quirks: "drinks iced coffee at 5am, leaves empty cartons in fridge",
          theme: "mixed",
          count: 3,
          delayDays: 14,
        });
        return new Response(
          JSON.stringify({
            success: true,
            elapsed_ms: Date.now() - t0,
            engine: "Gemini 2.5 Flash",
            count: events.length,
            events: events,
          }),
          {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            elapsed_ms: Date.now() - t0,
            error: err.message,
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 6. Generate Campaign Endpoint
    if (url.pathname === "/api/generate" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const {
        name = "Target",
        quirks = "",
        theme = "mixed",
        count = 25,
        delayDays = 14,
      } = body;

      const apiKey = env.GEMINI_API_KEY;
      let geminiError = null;

      // Try Gemini first if key is present
      if (apiKey) {
        try {
          const events = await generateEventsWithGemini(apiKey, {
            name,
            quirks,
            theme,
            count: Math.min(Math.max(count, 5), 50),
            delayDays,
          });

          return new Response(
            JSON.stringify({
              success: true,
              mode: "gemini_ai",
              engine: "Gemini 2.5 Flash",
              events,
            }),
            {
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        } catch (err) {
          geminiError = err;
          console.warn("Gemini generation failed, activating procedural fallback:", err.message);
        }
      }

      // Guaranteed High-IQ Procedural Fallback (Never fails, zero birthday tropes)
      const events = generateProceduralEvents(name, quirks, count, delayDays);
      return new Response(
        JSON.stringify({
          success: true,
          mode: "procedural_fallback",
          engine: "PhantomSync Smart Procedural Engine",
          ai_diagnostic: geminiError ? geminiError.message : "No GEMINI_API_KEY configured",
          events,
        }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not Found", {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};

/**
 * Ultra-fast Gemini API caller with strict timeout and robust JSON parsing.
 */
async function generateEventsWithGemini(apiKey, { name, quirks, theme, count, delayDays }) {
  const prompt = `
You are a comedy writer for a stealth prank calendar feed on an iPhone titled "Mobile Directory Sync".
Over the next 12-18 months, the phone alerts the user with dry, official-sounding appointments, inspections, and citations.

TARGET NAME: ${name}
TARGET QUIRKS & HABITS: ${quirks || "hoards air fryers, drinks diet soda at 5am, leaves doors open"}
THEME: ${theme}
GENERATE EXACTLY ${count} UNIQUE EVENTS.

RULES:
1. NEVER use the word "Birthday" or celebrate anything.
2. Every event must look like a real corporate audit, municipal citation, sanitary protocol, or smart appliance grievance.
3. Tailor events directly to their habits.
4. Tone must be 100% dry, deadpan, and clinical.
5. Immediately return a raw JSON array of ${count} objects (no thinking commentary, no markdown wrap):
[
  {
    "title": "Short event title with emoji (e.g. '🚗 2008 Honda Civic Decibel Recalibration')",
    "memo": "1-2 dry sentences explaining the procedure or violation.",
    "category": "Municipal Citation",
    "gap": 5
  }
]
`;

  // Focus directly on gemini-2.5-flash and gemini-flash-latest
  const models = ["gemini-2.5-flash", "gemini-flash-latest"];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
          },
        }),
        signal: AbortSignal.timeout(9000), // Max 9s per attempt
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Google API ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const parsed = extractJsonArray(data);
      if (parsed && parsed.length > 0) {
        return buildTimeline(parsed, delayDays);
      }
      lastError = new Error("Could not extract JSON array from Gemini response");
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Gemini generation timed out or failed.");
}

/**
 * Robust JSON Array extractor that handles markdown blocks, thinking tokens,
 * and text preambles.
 */
function extractJsonArray(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  if (!parts.length) return null;

  // Search through all parts for valid JSON array content
  for (let i = parts.length - 1; i >= 0; i--) {
    const text = parts[i]?.text;
    if (!text) continue;

    // 1. Try direct parse
    let trimmed = text.trim();
    if (trimmed.startsWith("```")) {
      trimmed = trimmed.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    try {
      const res = JSON.parse(trimmed);
      if (Array.isArray(res) && res.length) return res;
    } catch {}

    // 2. Extract substring between first '[' and last ']'
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
 * Builds chronological timeline objects with dates and day gaps.
 */
function buildTimeline(parsed, delayDays) {
  const today = new Date();
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + delayDays);

  return parsed.map((item, idx) => {
    let gap = idx === 0 ? delayDays : (Number(item.gap) || Math.floor(Math.random() * 7) + 3);
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
      title: item.title || "Scheduled Protocol Review",
      memo: item.memo || "Mandatory compliance milestone.",
      category: item.category || "Scheduled Protocol",
      gap: gap,
    };
  });
}

/**
 * Procedural fallback with 20 varied templates that actively interpolate target quirks.
 */
function generateProceduralEvents(name, rawQuirks, count, delayDays) {
  const quirks = (rawQuirks || "unspecified daily habits")
    .split(/[,;\n]+/)
    .map(q => q.trim())
    .filter(Boolean);
  
  const getQ = (idx) => quirks[idx % quirks.length];

  const today = new Date();
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + delayDays);

  const templates = [
    {
      title: (q) => `📊 Q1 Statutory Collections Hearing: ${q}`,
      memo: (q) => `Auditing Division: Outstanding civil obligations concerning '${q}' have accrued $14.12 in statutory late fees. Mandatory settlement conference.`,
      cat: "Financial Audit",
    },
    {
      title: (q) => `🚗 Municipal Decibel & Curb Inspection regarding ${q}`,
      memo: (q) => `City Code Enforcement: Neighborhood complaints logged regarding sound profiles produced by '${q}'. Physical decibel sweep at curb.`,
      cat: "Municipal Citation",
    },
    {
      title: (q) => `☣️ Bio-Safety Level 2 Quarantine: ${q}`,
      memo: (q) => `Public Health Notice: Organic matter swabbed from '${q}' has developed independent motor reflexes. Submerge unit in isopropyl solution immediately.`,
      cat: "Sanitary Protocol",
    },
    {
      title: (q) => `📱 Cellular Carrier Communication Review: '${q}'`,
      memo: (q) => `Carrier Network Directive: Analysis of texting velocity regarding '${q}' scored 99.4% monosyllabic. Courtesy retraining course placed on docket.`,
      cat: "Telecom Etiquette",
    },
    {
      title: (q) => `⚖️ County Tax Assessor Inquiry into ${name}'s ${q}`,
      memo: (q) => `Asset Assessment: Unregistered domestic inventory concerning '${q}' classified as taxable industrial fixture under Ordinance 44-B.`,
      cat: "Financial Audit",
    },
    {
      title: (q) => `🔍 Optical Sensor Alignment: Blind Angle Review (${q})`,
      memo: (q) => `Surveillance Directive 802: Please maintain window blinds at a 45-degree angle. High-resolution telemetry on '${q}' requires line of sight.`,
      cat: "Surveillance Directive",
    },
    {
      title: (q) => `🧀 3:14 AM Kitchen Telemetry Audit: ${q}`,
      memo: (q) => `Smart Fridge Log: Door latch disengaged for 58 seconds. Weight sensor recorded heavy existential sigh during '${q}' interaction.`,
      cat: "IoT Disciplinary",
    },
    {
      title: (q) => `🚨 Smoke Detector 2:14 AM Battery Chirp Readiness (${q})`,
      memo: (q) => `Hardware Protocol: Cell voltage at 96%. Single 115-decibel high-frequency pulse scheduled every 47 seconds to evaluate auditory readiness.`,
      cat: "IoT Disciplinary",
    },
    {
      title: (q) => `🤖 Autonomous Vacuum Entanglement Arbitration regarding ${q}`,
      memo: (q) => `Hardware Grievance: Cleaning unit has intentionally driven under furniture and tangled its bristles in '${q}'. Hostage negotiations pending.`,
      cat: "IoT Disciplinary",
    },
    {
      title: (q) => `🖨️ Mandatory Color Extortion: Cyan Depletion Alert (${q})`,
      memo: (q) => `Printer Compliance: Document is black text only. However, printing '${q}' documentation requires 0.003ml sacrificial yellow and cyan.`,
      cat: "Hardware Compliance",
    },
    {
      title: (q) => `🌿 HOA Turf Blade Elevation Citation (${q})`,
      memo: (q) => `Subdivision Code 14: Lawn turf near '${q}' measured at 2.62 inches (allowable limit: 2.50 inches). Fine assessed to HOA ledger.`,
      cat: "Municipal Citation",
    },
    {
      title: (q) => `🥛 Domestic Inventory Review: 3 Drops Left in Carton (${q})`,
      memo: (q) => `Resource Management: Gallon container preserved with exactly 0.05oz liquid regarding '${q}'. Technically not empty, thus avoiding replacement.`,
      cat: "Domestic Review",
    },
    {
      title: (q) => `🐦 Avian Drone Perch Maintenance (CIA Operative Pigeon 42)`,
      memo: (q) => `Surveillance Log: Breadcrumb ingestion protocol complete. Target observed engaging with '${q}'. Aerial monitoring continues.`,
      cat: "Surveillance Directive",
    },
    {
      title: (q) => `📶 3:00 AM Router Unsolicited Reboot Drill (${q})`,
      memo: (q) => `ISP Routine: Downstream connection severed for 19 seconds while loading content related to '${q}'. Router restart required.`,
      cat: "IoT Disciplinary",
    },
    {
      title: (q) => `🧼 Emergency Dishwasher Filter Decontamination (${q})`,
      memo: (q) => `Appliance Diagnostic: Filter mesh clogged with archaeological remnants associated with '${q}'. Diagnostic rinse cycle engaged.`,
      cat: "Sanitary Protocol",
    },
    {
      title: (q) => `🎙️ Acoustic Soundstage Verification: Living Room (${q})`,
      memo: (q) => `Audio Surveillance Unit: Please speak more clearly when voicing private exasperation regarding '${q}' to the household pet.`,
      cat: "Surveillance Directive",
    },
    {
      title: (q) => `📦 47 Unbroken Amazon Cardboard Boxes Intervention (${q})`,
      memo: (q) => `Storage Ordinance: Tower of collapsed shipping boxes associated with '${q}' has achieved structural load-bearing status in garage.`,
      cat: "Domestic Review",
    },
    {
      title: (q) => `💤 7:00 AM Five-Alarm Snooze Disciplinary Hearing (${q})`,
      memo: (q) => `Chronobiology Department: iPhone alarm snoozed 6 times consecutively following '${q}'. Circadian rhythm revoked by order of council.`,
      cat: "Telecom Etiquette",
    },
    {
      title: (q) => `☕ Commercial Espresso Temperature Recalibration: ${q}`,
      memo: (q) => `Thermodynamic Notice: Beverage extracted at 87°C instead of mandated 91°C. Formal complaint lodged by morning taste panel.`,
      cat: "Domestic Review",
    },
    {
      title: (q) => `🔋 3% Battery Low Power Mode Defiance Inquiry (${q})`,
      memo: (q) => `Battery Health Council: Target device operated at 2% charge for 43 consecutive minutes during '${q}'. Screen brightness dimmed by force.`,
      cat: "Telecom Etiquette",
    }
  ];

  const gapChoices = [3, 4, 5, 6, 7, 8, 9, 10];
  const events = [];

  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length];
    const quirk = getQ(i);

    let gap = i === 0 ? delayDays : gapChoices[Math.floor(Math.random() * gapChoices.length)];
    if (i > 0) {
      currentDate.setDate(currentDate.getDate() + gap);
    }

    const dateFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(currentDate);

    events.push({
      id: i,
      dateObj: new Date(currentDate),
      dateStr: dateFormatted,
      title: tmpl.title(quirk),
      memo: tmpl.memo(quirk),
      category: tmpl.cat,
      gap: gap,
    });
  }

  return events;
}
