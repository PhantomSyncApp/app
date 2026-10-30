/**
 * PhantomSync Cloudflare Worker API
 * 
 * Secure backend that holds the Gemini API key, handles CORS,
 * and procedurally generates custom stealth prank calendar events.
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

    // 3. Generate Campaign Endpoint
    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        const body = await request.json();
        const {
          name = "Target",
          quirks = "",
          theme = "mixed",
          count = 25,
          delayDays = 14,
        } = body;

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: "GEMINI_API_KEY secret is not configured in Cloudflare Worker environment.",
            }),
            {
              status: 500,
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        }

        const events = await generateEventsWithGemini(apiKey, {
          name,
          quirks,
          theme,
          count: Math.min(Math.max(count, 10), 103),
          delayDays,
        });

        return new Response(JSON.stringify({ success: true, events }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err.message || "Failed to generate campaign",
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Not Found", {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};

/**
 * Calls Gemini API with multi-model fallback and structured JSON output.
 */
async function generateEventsWithGemini(apiKey, { name, quirks, theme, count, delayDays }) {
  const prompt = `
You are an elite satirical comedy writer designing an ultra-stealth slow-burn calendar prank platform called PhantomSync.
The victim has an automated calendar feed on their iPhone called "Mobile Directory Sync".
Over the next 12-18 months, their phone will alert them at 9:00 AM with bizarre, highly specific, seemingly official appointments, inspections, hearings, and corporate audits.

TARGET NAME: ${name}
TARGET QUIRKS & HABITS: ${quirks}
THEME: ${theme}
NUMBER OF EVENTS: ${count}

ABSOLUTE COMEDIC RULES:
1. NEVER use the word "Birthday" or celebrate anything. Every event MUST look like a seemingly legitimate calendar appointment, mandatory inspection, municipal citation, sanitary protocol, debt hearing, calibration, or corporate audit.
2. The events must be deeply, hilariously tailored to the target's specific quirks, inside jokes, and daily habits.
3. The tone must be 100% dry, corporate, clinical, and deadpan.
4. Output MUST be a valid JSON array of objects with exactly these keys:
   - "title": Short, authentic-sounding appointment/reminder with a relevant emoji (e.g. "📊 Q1 Taco Bell Debt Collections Hearing ($20.00 + Fees)", "🚗 2008 Honda Civic Exhaust Decibel Recalibration", "☣️ BlenderBottle Biohazard Quarantine & Swab Extraction").
   - "memo": A dry, ultra-specific corporate/diagnostic description (1-2 sentences) explaining the absurdity as if it is a completely serious municipal or system procedure.
   - "category": Short category label (e.g. "Financial Audit", "Sanitary Protocol", "Municipal Citation", "Surveillance Directive", "IoT Mutiny", "Telecom Etiquette").
   - "gap": Recommended days until next event (integer between 3 and 10).
`;

  // Candidate models in priority order
  const candidateModels = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro",
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
            responseMimeType: "application/json",
            temperature: 0.85,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Model ${model} failed (${response.status}): ${errorText}`);
        continue; // Try next candidate model
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error(`Empty response from model ${model}`);
        continue;
      }

      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        lastError = new Error(`Invalid JSON array from model ${model}`);
        continue;
      }

      // Convert to chronological schedule
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

  throw lastError || new Error("All Gemini models failed to generate content.");
}
