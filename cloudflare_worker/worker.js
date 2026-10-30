/**
 * PhantomSync Cloudflare Worker API
 * 
 * Secure backend that holds the Gemini API key, handles CORS,
 * and procedurally generates custom stealth prank calendar events.
 * 
 * Features automatic multi-model fallback and high-IQ procedural fallback,
 * guaranteeing 100% uptime and zero user-facing errors.
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
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "PhantomSync AI Backend",
          version: "1.0.0",
        }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // 3. List Models Diagnostic
    if (url.pathname === "/api/models") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "No GEMINI_API_KEY set" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
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

    // 4. Generate Campaign Endpoint
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
            count: Math.min(Math.max(count, 10), 103),
            delayDays,
          });

          return new Response(JSON.stringify({ success: true, mode: "gemini_ai", events }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        } catch (err) {
          geminiError = err;
          console.warn("Gemini generation failed, falling back to procedural:", err.message);
        }
      }

      // Guaranteed Procedural Fallback (Never fails)
      const events = generateProceduralEvents(name, quirks, count, delayDays);
      return new Response(JSON.stringify({ 
        success: true, 
        mode: "procedural_fallback", 
        ai_diagnostic: geminiError ? geminiError.message : "No API key configured",
        events 
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};

/**
 * Calls Gemini API with multi-endpoint and multi-model fallback.
 */
async function generateEventsWithGemini(apiKey, { name, quirks, theme, count, delayDays }) {
  const prompt = `
You are an award-winning satirical comedy writer for an ultra-stealth slow-burn calendar prank app called PhantomSync.
The victim has an automated calendar feed on their iPhone called "Mobile Directory Sync".
Over the next 12-18 months, their phone will alert them at 9:00 AM with seemingly official calendar appointments, municipal citations, inspections, debt hearings, and corporate audits.

TARGET NAME: ${name}
TARGET QUIRKS & HABITS: ${quirks}
THEME: ${theme}
GENERATE EXACTLY ${count} UNIQUE, DIVERSE EVENTS.

CRITICAL COMEDIC INSTRUCTIONS:
1. NEVER use the word "Birthday" or celebrate anything.
2. EVERY SINGLE EVENT MUST BE COMPLETELY UNIQUE. DO NOT repeat the same phrase, template, or structure.
3. Extrapolate creatively from their specific quirks across diverse realistic institutions:
   - Municipal/City Government (Noise citations, parking hearings, zoning board reviews)
   - Environmental/Public Health (Bio-safety swab audits, kitchen quarantine orders)
   - Financial/Collections (Arbitration over small debts, compound late fees)
   - Cellular/ISP Tech Support (Texting efficiency audits, bandwidth disciplinary actions)
   - Smart Home Appliances (Dishwasher formal grievance, refrigerator calorie judgment, Roomba rescue)
   - Federal/Surveillance (Blinds angle calibration, pigeon drone perches, acoustic tests)
4. TONE: 100% deadpan, hyper-specific, clinical, bureaucratic, and straight-faced.
5. The victim should genuinely question for a second if their phone is actively tracking their habits.

OUTPUT FORMAT: Return a valid JSON array of ${count} objects (no markdown, just valid JSON):
[
  {
    "title": "Short event title with emoji (e.g. '🚗 2008 Honda Civic Exhaust Decibel Recalibration')",
    "memo": "1-2 dry, official-sounding sentences explaining the procedure/violation.",
    "category": "e.g. Municipal Citation, Sanitary Protocol, Financial Audit, IoT Mutiny, Telecom Audit",
    "gap": 5
  }
]
`;

  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-pro-latest",
    "gemini-1.5-flash",
  ];

  const candidateVersions = ["v1beta", "v1"];

  let lastError = null;

  for (const ver of candidateVersions) {
    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.85,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(`${ver}/${model} failed (${response.status}): ${errorText}`);
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        let cleanText = rawText.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
        }

        const parsed = JSON.parse(cleanText);
        if (!Array.isArray(parsed) || parsed.length === 0) continue;

        const today = new Date();
        let currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() + delayDays);

        return parsed.map((item, idx) => {
          let gap = idx === 0 ? delayDays : (item.gap || Math.floor(Math.random() * 7) + 3);
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
      } catch (e) {
        lastError = e;
      }
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

/**
 * High-IQ procedural generator for bulletproof fallback.
 */
function generateProceduralEvents(name, rawQuirks, count, delayDays) {
  const quirks = (rawQuirks || "").split(/[,;\n]+/).map(q => q.trim()).filter(Boolean);
  const getQuirk = (idx) => quirks.length ? quirks[idx % quirks.length] : "unspecified habits";

  const today = new Date();
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + delayDays);

  const templates = [
    {
      title: (q) => `📊 Q1 Debt Settlement Hearing regarding ${q}`,
      memo: (q) => `Accounting Directive: Outstanding obligations concerning '${q}' have accrued $4.12 in statutory delinquency penalties. Settlement hearing scheduled.`,
      cat: "Financial Audit",
    },
    {
      title: (q) => `🚗 Municipal Compliance Inspection: ${q}`,
      memo: (q) => `Acoustic Advisory: Neighborhood complaints filed under City Code 404 regarding '${q}'. Physical decibel testing scheduled at curb.`,
      cat: "Municipal Citation",
    },
    {
      title: (q) => `☣️ Bio-Safety Level 2 Inspection: ${q}`,
      memo: (q) => `Health Protocol: Swab culture retrieved from '${q}' has evolved basic tool usage. Please submerge unit in boiling solvent immediately.`,
      cat: "Sanitary Protocol",
    },
    {
      title: (q) => `📱 Cellular Carrier Communication Audit: '${q}'`,
      memo: (q) => `Bandwidth Report: Monosyllabic response pattern regarding '${q}' evaluated. Efficiency rating: 99.8%. Politeness rating: 0.02%.`,
      cat: "Telecom Etiquette",
    },
    {
      title: () => `🔍 Optical Sensor Alignment (FBI Surveillance Team 4)`,
      memo: () => `System Directive 404-B: Please maintain second-floor window blinds at a 45-degree angle. High-resolution sensors require line of sight.`,
      cat: "Surveillance Directive",
    },
    {
      title: () => `🧀 3:14 AM Shredded Cheese Transaction Audit Review`,
      memo: () => `Fridge Telemetry: Refrigerator door open duration: 42 seconds. Weight sensor recorded heavy sigh before door latch engaged.`,
      cat: "IoT Disciplinary",
    },
    {
      title: () => `🚨 Smoke Detector 2:14 AM Battery Chirp Readiness Drill`,
      memo: () => `Hardware Diagnostic: Battery capacity is at 94%. Single 110-decibel chirp scheduled every 43 seconds to test tenant alertness.`,
      cat: "IoT Disciplinary",
    },
    {
      title: () => `🤖 Sentient Roomba Bathmat Tassel Entanglement Hearing`,
      memo: () => `Distress Bulletin: Unit has intentionally driven into high-pile bathroom rug. Spinning in circles until battery exhaustion. Salvage requested.`,
      cat: "IoT Disciplinary",
    },
    {
      title: () => `🌿 Lawn Grass Blade Height Measurement (HOA Rule 4-B)`,
      memo: () => `HOA Violation: Front yard Bermuda turf blade measured at 2.65 inches (limit: 2.50 inches). Fine assessed. Trash cans placed out 12 mins early.`,
      cat: "Municipal Citation",
    },
    {
      title: () => `🖨️ Mandatory Color Extortion: Printer Low on Cyan`,
      memo: () => `Cartridge Compliance: Document contains 100% black text. However, internal aesthetic policy requires 0.002ml sacrificial cyan.`,
      cat: "Hardware Compliance",
    },
  ];

  const gapChoices = [3, 4, 5, 6, 7, 8, 9, 10];
  const events = [];

  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length];
    const quirk = getQuirk(i);

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
