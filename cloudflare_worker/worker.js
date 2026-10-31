/**
 * PhantomSync Cloudflare Worker API
 * 
 * Secure backend that holds the Gemini API key, handles CORS,
 * and procedurally generates custom stealth prank calendar events.
 * 
 * Version 2.5.0 - High-Speed Rich Comedic Intelligence (Sub-5s Generation)
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
          version: "2.5.0",
          has_gemini_key: Boolean(env.GEMINI_API_KEY),
        }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Instant 1-Second Raw Ping Test (Accepts ?model= parameter)
    if (url.pathname === "/api/ping-gemini") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "No GEMINI_API_KEY set" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const targetModel = url.searchParams.get("model") || "gemini-3.1-flash-lite";
      const t0 = Date.now();
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Respond with the single word: PONG" }] }],
            }),
            signal: AbortSignal.timeout(6000),
          }
        );
        const text = await resp.text();
        return new Response(
          JSON.stringify({
            model: targetModel,
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
          JSON.stringify({ model: targetModel, elapsed_ms: Date.now() - t0, error: e.message }),
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
        const result = await generateEventsWithGemini(apiKey, {
          name: "Jared Wilson",
          quirks: "Was a plankton scientist. Microwaves fish in the office. Goes to weddings all the time.",
          theme: "mixed",
          count: 3,
          delayDays: 14,
        });
        return new Response(
          JSON.stringify({
            success: true,
            elapsed_ms: Date.now() - t0,
            model_used: result.modelUsed,
            count: result.events.length,
            events: result.events,
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

      // Try Gemini first if key is present (generate 20-25 high-IQ events for sub-5s speed)
      if (apiKey) {
        try {
          const aiCount = Math.min(Math.max(count, 12), 25);
          const result = await generateEventsWithGemini(apiKey, {
            name,
            quirks,
            theme,
            count: aiCount,
            delayDays,
          });

          return new Response(
            JSON.stringify({
              success: true,
              mode: "gemini_ai",
              engine: `Google Gemini (${result.modelUsed})`,
              events: result.events,
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

      // High-IQ Procedural Fallback (Never dumps raw sentence strings)
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
 * High-Speed Gemini API caller with comedic brilliance & sub-5s response time.
 */
async function generateEventsWithGemini(apiKey, { name, quirks, theme, count, delayDays }) {
  const prompt = `
You are an award-winning comedy writer creating a stealth slow-burn iPhone calendar prank for a feed titled "Mobile Directory Sync".
Over the next 12-18 months, the target will receive dry, official-sounding calendar appointments, municipal citations, inspections, and audits directly mocking their real habits.

TARGET NAME: ${name}
TARGET LORE & HABITS: ${quirks || "microwaves fish at work, goes to weddings constantly, ex-plankton scientist, moved states for love"}
THEME: ${theme}
GENERATE EXACTLY ${count} UNIQUE, HILARIOUS EVENTS.

CRITICAL COMEDIC RULES:
1. NEVER use the word "Birthday" or celebrate anything.
2. DO NOT literally copy-paste the user's prompt text into event titles. DECONSTRUCT the target's lore into creative, realistic-sounding institutional citations:
   - Work/OSHA grievances (e.g. Breakroom fish microwave odor contamination, tilapia reheating penalties)
   - Professional audits (e.g. Plankton handling license lapse, copepod welfare compliance)
   - Social & relationship audits (e.g. Wedding attendee frequency inquiry, formal tuxedo cummerbund recovery)
   - Interstate/municipal bureaucracy (e.g. Relocation jurisdiction disputes, state dialect repatriation taxes)
   - Smart home mutiny (e.g. Connected microwave filing formal olfactory grievance)
3. TONE: 100% deadpan, hyper-specific, bureaucratic, straight-faced.
4. Keep event titles punchy with an emoji (e.g. "🐟 Breakroom Microwave Decontamination (OSHA Code 8)").
5. Memos must be 1-2 dry, witty sentences explaining the situation as if it's completely real.
6. Gaps between events must be between 3 and 10 days.

Return ONLY a raw JSON array of ${count} objects (no markdown blocks, no thinking tokens):
[
  {
    "title": "🐟 Breakroom Fish Microwave Containment Protocol",
    "memo": "Environmental Health notice: Office air quality sensors recorded 4.2 minutes of continuous salmon reheating. Floor 3 evacuated until 14:00.",
    "category": "Sanitary Protocol",
    "gap": 5
  }
]
`;

  // Models prioritized by active status and low latency
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
            maxOutputTokens: 3000,
          },
        }),
        signal: AbortSignal.timeout(14000), // Generous 14s timeout
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
          events: buildTimeline(parsed, delayDays),
        };
      }
      lastError = new Error(`Could not extract JSON array from ${model}`);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("All Gemini models failed or timed out.");
}

/**
 * Robust JSON Array extractor that handles markdown blocks, thinking tokens,
 * and text preambles.
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
 * Builds chronological timeline objects with natural 3-10 day pacing.
 */
function buildTimeline(parsed, delayDays) {
  const today = new Date();
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + delayDays);

  return parsed.map((item, idx) => {
    const rawGap = Number(item.gap);
    const gap = idx === 0 
      ? delayDays 
      : (rawGap >= 3 && rawGap <= 12 ? rawGap : Math.floor(Math.random() * 5) + 4);

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
 * High-IQ procedural generator that extracts clean keywords from user text
 * rather than dumping raw sentences into template titles.
 */
function generateProceduralEvents(name, rawQuirks, count, delayDays) {
  // Extract key topic words or phrases (avoid whole sentences)
  const phrases = (rawQuirks || "daily habits")
    .replace(/[.!?]+/g, ",")
    .split(/[,;\n]+/)
    .map(p => p.trim())
    .filter(p => p.length > 2 && p.length < 50);

  const getTopic = (idx) => phrases.length ? phrases[idx % phrases.length] : "daily habits";

  const today = new Date();
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + delayDays);

  const templates = [
    {
      title: (t) => `🐟 Breakroom Olfactory Assessment: ${t}`,
      memo: (t) => `Facilities & Environmental Health: Airborne particulate sensors flagged prolonged heating of aquatic proteins regarding '${t}'. Charcoal ventilation cycle required.`,
      cat: "Sanitary Protocol",
    },
    {
      title: (t) => `🔬 State Biological Research Permit Audit: ${t}`,
      memo: (t) => `Licensing Bureau: Credentials concerning '${t}' require recertification. Please verify no wild aquatic cultures were moved across state lines.`,
      cat: "Regulatory Oversight",
    },
    {
      title: (t) => `🤵 Formal Wedding Attendance Frequency Review (${t})`,
      memo: (t) => `Bureau of Social Telemetry: Statistical anomaly detected in annual event attendance regarding '${t}'. RSVP audit placed on docket.`,
      cat: "Social Oversight",
    },
    {
      title: (t) => `🚗 Interstate Relocation Tax Audit into ${name}'s ${t}`,
      memo: (t) => `State Comptroller: Cross-border assets and domicile transitions concerning '${t}' flagged for statutory administrative reconciliation.`,
      cat: "Financial Audit",
    },
    {
      title: (t) => `📱 Cellular Texting Efficiency Evaluation: '${t}'`,
      memo: (t) => `Carrier Telemetry: Communication velocity regarding '${t}' scored 99.4% monosyllabic. Courtesy retraining course pending review.`,
      cat: "Telecom Etiquette",
    },
    {
      title: (t) => `🔍 Optical Sensor Alignment: Blind Angle Review (${t})`,
      memo: (t) => `Surveillance Directive 802: Please maintain window blinds at a 45-degree angle. High-resolution telemetry on '${t}' requires line of sight.`,
      cat: "Surveillance Directive",
    },
    {
      title: (t) => `🧀 3:14 AM Kitchen Telemetry Audit: ${t}`,
      memo: (t) => `Smart Appliance Log: Door latch disengaged for 58 seconds. Weight sensor recorded heavy existential sigh during '${t}' interaction.`,
      cat: "IoT Disciplinary",
    },
    {
      title: (t) => `🚨 Smoke Detector 2:14 AM Battery Chirp Readiness (${t})`,
      memo: (t) => `Hardware Protocol: Cell voltage at 96%. Single 115-decibel high-frequency pulse scheduled every 47 seconds to evaluate auditory alertness.`,
      cat: "IoT Disciplinary",
    },
    {
      title: (t) => `🖨️ Mandatory Sacrificial Cyan Compliance: ${t}`,
      memo: (t) => `Printer Compliance: Document contains only black text. However, printing '${t}' documentation requires 0.003ml sacrificial yellow and cyan.`,
      cat: "Hardware Compliance",
    },
    {
      title: (t) => `🌿 HOA Turf Elevation & Perimeter Citation (${t})`,
      memo: (t) => `Subdivision Code 14: Lawn turf near '${t}' measured at 2.62 inches (allowable limit: 2.50 inches). Fine assessed to HOA ledger.`,
      cat: "Municipal Citation",
    }
  ];

  const gapChoices = [3, 4, 5, 6, 7];
  const events = [];

  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length];
    const topic = getTopic(i);

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
      title: tmpl.title(topic),
      memo: tmpl.memo(topic),
      category: tmpl.cat,
      gap: gap,
    });
  }

  return events;
}
