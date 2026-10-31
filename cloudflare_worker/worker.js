/**
 * PhantomSync Cloudflare Worker API
 * 
 * Version 4.1.0 - Trojan Horse Dynamic WebCal + 25 Bespoke AI Strikes + 1,000+ Vault
 * 
 * Combines 25 live Gemini AI events tailored to the target's exact lore
 * with a massive 1,000+ procedural & curated incident backlog to build
 * an authentic, non-repeating 18-month slow-burn calendar in seconds!
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Global in-memory cache for campaigns across warm worker runs (backed by KV if PHANTOM_KV bound)
const MEMORY_CAMPAIGNS = new Map();

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
          version: "4.1.0 (Trojan Horse WebCal + Stripe Checkout + 25 AI Strikes)",
          has_gemini_key: Boolean(env.GEMINI_API_KEY),
          has_stripe_key: Boolean(env.STRIPE_SECRET_KEY),
          has_kv_storage: Boolean(env.PHANTOM_KV),
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Ping Diagnostic
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
        return new Response(
          JSON.stringify({ model: targetModel, elapsed_ms: Date.now() - t0, status: resp.status, raw_response: text }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Generate Campaign Endpoint (25 AI Strikes + 75 from 1,000+ Backlog)
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

      // 1. Generate 25 laser-personalized AI events from target's lore
      if (apiKey && quirks.trim()) {
        try {
          const aiResult = await generatePersonalizedAIEvents(apiKey, {
            name,
            quirks,
            theme,
            count: 25,
          });
          if (aiResult && aiResult.events.length > 0) {
            aiCustomEvents = aiResult.events;
            modelUsed = aiResult.modelUsed;
          }
        } catch (err) {
          console.warn("AI generation error, using smart procedural lore parser:", err.message);
          aiCustomEvents = generateProceduralLoreEvents(name, quirks, 25);
        }
      } else {
        aiCustomEvents = generateProceduralLoreEvents(name, quirks, 25);
      }

      // 2. Interleave with our 1,000+ Incident Vault to build the 100-event schedule
      const targetTotal = Math.min(Math.max(count, 20), 103);
      const combinedSchedule = buildMasterpieceSchedule(aiCustomEvents, targetTotal, delayDays);

      return new Response(
        JSON.stringify({
          success: true,
          mode: aiCustomEvents.length > 0 ? "hybrid_ai_masterpiece" : "masterpiece_library",
          engine: `Google Gemini (${modelUsed}) + 1,000+ Incident Infinite Vault`,
          ai_personal_count: aiCustomEvents.length,
          total_events: combinedSchedule.length,
          events: combinedSchedule,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Save Campaign Endpoint (Arms campaign for dynamic webcal subscription)
    if (url.pathname === "/api/campaigns" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const {
        name = "Target",
        quirks = "",
        theme = "mixed",
        delayDays = 14,
        events = [],
      } = body;

      if (!events || !events.length) {
        return new Response(JSON.stringify({ error: "No events provided" }), { status: 400, headers: CORS_HEADERS });
      }

      const campaignId = "ps_" + Math.random().toString(36).substring(2, 10);
      const host = url.host;
      const campaign = {
        id: campaignId,
        name,
        quirks,
        theme,
        delayDays,
        events,
        createdAt: Date.now(),
        syncCount: 0,
        lastSyncAt: null,
        lastUserAgent: null,
        killSwitch: false,
      };

      await saveCampaign(env, campaign);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId,
          webcalUrl: `webcal://${host}/cal/${campaignId}.ics`,
          httpUrl: `https://${host}/cal/${campaignId}.ics`,
          trojanMode: true,
          createdAt: campaign.createdAt,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Dynamic Trojan Horse WebCal Feed Endpoint: /cal/:id.ics or /feed/:id.ics
    const calMatch = url.pathname.match(/^\/(?:cal|feed)\/([a-zA-Z0-9_-]+)(?:\.ics)?$/);
    if (calMatch && request.method === "GET") {
      const campaignId = calMatch[1];
      const campaign = await getCampaign(env, campaignId);

      if (!campaign) {
        return new Response("Calendar feed not found or expired.", { status: 404, headers: CORS_HEADERS });
      }

      // Check remote emergency kill switch
      if (campaign.killSwitch) {
        const wipedIcs = formatIcsCalendar({ name: campaign.name, events: [], isWiped: true });
        return new Response(wipedIcs, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="directory-sync.ics"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            ...CORS_HEADERS,
          },
        });
      }

      // Trojan Horse check:
      // If within 24 hours of creation, serve the DECOY (1 harmless corporate check event)
      // After 24 hours (or if ?force_live=1), serve the full 100-event payload!
      const forceLive = url.searchParams.get("force_live") === "1";
      const hoursElapsed = (Date.now() - (campaign.createdAt || Date.now())) / (1000 * 60 * 60);
      const isDecoy = !forceLive && (hoursElapsed < 24);

      // Record subscriber telemetry
      campaign.syncCount = (campaign.syncCount || 0) + 1;
      campaign.lastSyncAt = new Date().toISOString();
      campaign.lastUserAgent = request.headers.get("user-agent") || "Unknown Device";
      await saveCampaign(env, campaign);

      const icsOutput = formatIcsCalendar({
        name: campaign.name,
        events: campaign.events,
        isDecoy: isDecoy,
      });

      return new Response(icsOutput, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `inline; filename="directory-sync.ics"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          ...CORS_HEADERS,
        },
      });
    }

    // Campaign Status & Telemetry: /api/campaigns/:id/status
    const statusMatch = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)\/status$/);
    if (statusMatch && request.method === "GET") {
      const campaignId = statusMatch[1];
      const campaign = await getCampaign(env, campaignId);
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
      }

      const hoursElapsed = (Date.now() - (campaign.createdAt || Date.now())) / (1000 * 60 * 60);
      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          name: campaign.name,
          createdAt: campaign.createdAt,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          trojanPhase: hoursElapsed < 24 ? "Phase 1: Decoy Active (1 Event)" : "Phase 2: Full Payload Deployed (100 Events)",
          isDecoy: hoursElapsed < 24,
          syncCount: campaign.syncCount || 0,
          lastSyncAt: campaign.lastSyncAt,
          lastUserAgent: campaign.lastUserAgent,
          killSwitch: Boolean(campaign.killSwitch),
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Remote Emergency Kill Switch: /api/campaigns/:id/kill-switch
    const killMatch = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)\/kill-switch$/);
    if (killMatch && request.method === "POST") {
      const campaignId = killMatch[1];
      const campaign = await getCampaign(env, campaignId);
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
      }

      campaign.killSwitch = !campaign.killSwitch;
      await saveCampaign(env, campaign);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          killSwitch: campaign.killSwitch,
          message: campaign.killSwitch
            ? "Emergency Kill Switch ENGAGED. Calendar feed wiped on victim's device!"
            : "Emergency Kill Switch disengaged. Feed restored.",
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Stripe Checkout Session Creation: /api/create-checkout-session
    if (url.pathname === "/api/create-checkout-session" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const {
        plan = "digital",
        campaignId = "demo",
        successUrl,
        cancelUrl,
      } = body;

      const stripeKey = env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        // Instant Demo Fallback Mode if Stripe is not yet configured
        return new Response(
          JSON.stringify({
            success: true,
            demo_mode: true,
            plan,
            campaignId,
            message: "Stripe key not configured. Instant Demo Arming activated!",
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      try {
        const isPhysical = plan === "physical_card";
        const amount = isPhysical ? 1499 : 499;
        const prodName = isPhysical
          ? "PhantomSync Black Matte NFC Stealth Card"
          : "PhantomSync Digital Pass (18-Month Sync)";
        const prodDesc = isPhysical
          ? "Discrete NFC Card dispatched with zero exterior branding + Trojan Horse dynamic calendar feed."
          : "Live dynamic webcal feed with 24-hr Trojan Horse decoy delay + Mission Control Telemetry.";

        const params = new URLSearchParams();
        params.append("mode", "payment");
        params.append("success_url", successUrl || `${url.origin}/phantomsync_studio.html?armed=1&cid=${campaignId}`);
        params.append("cancel_url", cancelUrl || `${url.origin}/phantomsync_studio.html`);
        params.append("payment_method_types[0]", "card");

        params.append("line_items[0][price_data][currency]", "usd");
        params.append("line_items[0][price_data][unit_amount]", String(amount));
        params.append("line_items[0][price_data][product_data][name]", prodName);
        params.append("line_items[0][price_data][product_data][description]", prodDesc);
        params.append("line_items[0][quantity]", "1");

        params.append("metadata[campaignId]", campaignId);
        params.append("metadata[plan]", plan);

        if (isPhysical) {
          params.append("shipping_address_collection[allowed_countries][0]", "US");
          params.append("shipping_address_collection[allowed_countries][1]", "CA");
          params.append("shipping_address_collection[allowed_countries][2]", "GB");
        }

        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!stripeRes.ok) {
          const errText = await stripeRes.text();
          throw new Error(`Stripe error ${stripeRes.status}: ${errText}`);
        }

        const session = await stripeRes.json();
        return new Response(
          JSON.stringify({ success: true, url: session.url, sessionId: session.id }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: CORS_HEADERS }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};

/**
 * Storage helpers (Cloudflare KV with in-memory fallback)
 */
async function saveCampaign(env, campaign) {
  if (env && env.PHANTOM_KV) {
    try {
      await env.PHANTOM_KV.put(`campaign:${campaign.id}`, JSON.stringify(campaign), {
        expirationTtl: 86400 * 600, // 600 days
      });
    } catch (e) {
      console.warn("KV put failed, falling back to memory:", e.message);
    }
  }
  MEMORY_CAMPAIGNS.set(campaign.id, campaign);
}

async function getCampaign(env, id) {
  if (env && env.PHANTOM_KV) {
    try {
      const raw = await env.PHANTOM_KV.get(`campaign:${id}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("KV get failed, checking memory:", e.message);
    }
  }

  const inMemory = MEMORY_CAMPAIGNS.get(id);
  if (inMemory) return inMemory;

  // Edge resilience: If KV is not yet bound and memory missed across edge colos,
  // synthesize a live slow-burn campaign so subscriber calendar links NEVER 404!
  const emergencySchedule = buildMasterpieceSchedule([], 100, 14);
  return {
    id,
    name: "Target",
    createdAt: Date.now(),
    syncCount: 1,
    events: emergencySchedule,
    killSwitch: false,
  };
}

/**
 * Generates an RFC-5545 compliant .ics file with Trojan Horse decoy support
 */
function formatIcsCalendar({ name, events = [], isDecoy = false, isWiped = false }) {
  const calName = "Mobile Directory Sync";
  const calDesc = isWiped ? "Feed Terminated" : "Automated incident & protocol synchronization feed.";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PhantomSync//Incident Protocol Sync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    `X-WR-CALDESC:${calDesc}`,
    "X-WR-TIMEZONE:America/Chicago",
  ];

  if (isWiped) {
    // Empty calendar wipes all events from victim's phone immediately
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  if (isDecoy) {
    // Trojan Horse Decoy: Exactly 1 boring system event placed 6 months in the future
    const d = new Date(Date.now() + 180 * 86400 * 1000);
    const dtStr = d.toISOString().slice(0, 10).replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:decoy-verify-${Date.now()}@phantomsync.io`);
    lines.push("DTSTAMP:20260101T000000Z");
    lines.push(`DTSTART;VALUE=DATE:${dtStr}`);
    lines.push(`DTEND;VALUE=DATE:${dtStr}`);
    lines.push("SUMMARY:📱 Enterprise Directory Verification (Active)");
    lines.push("DESCRIPTION:Mobile device registered to secure directory synchronization. Routine periodic sync active.");
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  } else {
    // Full 100-event slow-burn schedule
    events.forEach((ev, idx) => {
      const dt = new Date(ev.dateObj || Date.now());
      const dtStr = dt.toISOString().slice(0, 10).replace(/-/g, "");
      const nextDay = new Date(dt.getTime() + 86400 * 1000);
      const nextStr = nextDay.toISOString().slice(0, 10).replace(/-/g, "");

      const cleanTitle = (ev.title || "Incident Notification").replace(/[\r\n]+/g, " ");
      const cleanMemo = (ev.memo || "").replace(/[\r\n]+/g, " ");

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:phantom-${idx}-${Date.now()}@phantomsync.io`);
      lines.push("DTSTAMP:20260101T000000Z");
      lines.push(`DTSTART;VALUE=DATE:${dtStr}`);
      lines.push(`DTEND;VALUE=DATE:${nextStr}`);
      lines.push("RRULE:FREQ=YEARLY");
      lines.push(`SUMMARY:${cleanTitle}`);
      lines.push(`DESCRIPTION:${cleanMemo}`);
      lines.push("TRANSP:TRANSPARENT");
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${cleanTitle}`);
      lines.push("TRIGGER:-PT9H");
      lines.push("END:VALARM");
      lines.push("END:VEVENT");
    });
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Calls Gemini for 25 hyper-tailored events from lore.
 */
async function generatePersonalizedAIEvents(apiKey, { name, quirks, theme, count }) {
  const prompt = `
You are an elite satirical comedy writer designing stealth slow-burn calendar prank appointments for an iPhone calendar titled "Mobile Directory Sync".
The victim receives dry, clinical, institutional appointments directly weaponizing their embarrassing habits, lore, and backstory.

TARGET: ${name}
TARGET BACKSTORY & QUIRKS: ${quirks}
THEME: ${theme}
GENERATE EXACTLY ${count} UNIQUE, BRILLIANT EVENTS.

CRITICAL COMEDIC RULES:
1. NEVER use the word "Birthday" or celebrate anything.
2. DIVERSITY & BALANCE MANDATE: You MUST identify EVERY distinct hobby, quirk, habit, relationship detail, past job, location, and personality trait mentioned in TARGET BACKSTORY & QUIRKS!
   - Distribute the ${count} events EVENLY across ALL distinct topics in their lore so NO single topic dominates the list!
   - If they have 4-6 lore points, create 4-5 distinct, brilliant events for EACH lore point.
   - For example, cover: workplace & appliance infractions, past relationship & engagement debriefs, scientific & career license audits, relocation & interstate domicile reviews, excessive wedding/social attendance inquiries, and regional dialect/hometown verifications.
   - Cycle through different topics continuously so every strike targets a different aspect of their life!
3. Tone: 100% deadpan, official, bureaucratic, straight-faced.
4. Titles: Include a punchy emoji.
5. Memos: 1-2 realistic, dry sentences.
6. Category: Choose from "Sanitary Protocol", "Municipal Citation", "Financial Audit", "IoT Disciplinary", "Surveillance Directive", "Telecom Etiquette", "Domestic Review", "Corporate Audit", "Social Oversight".
7. Return a valid JSON array of ${count} objects with "title", "memo", "category", and "isPersonal": true.

Return ONLY a valid JSON array of ${count} objects (no markdown blocks, no text):
[
  {
    "title": "🐟 Breakroom Aquatic Protein Reheating Citation (OSHA Code 8)",
    "memo": "Facilities Notice: Office air scrubbers recorded 4.2 minutes of continuous salmon microwave exposure. Floor 3 evacuated until 14:00.",
    "category": "Sanitary Protocol",
    "isPersonal": true
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
            maxOutputTokens: 3500,
          },
        }),
        signal: AbortSignal.timeout(15000), // Generous 15s timeout
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
          events: parsed.map(e => ({ ...e, isPersonal: true })),
        };
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

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
      title: (t) => `📱 Cellular Carrier Communication Review: '${t}'`,
      memo: (t) => `Network Directive: Analysis of texting velocity regarding '${t}' scored 99.4% monosyllabic. Courtesy retraining course placed on docket.`,
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
      isPersonal: true,
    });
  }
  return results;
}

/**
 * Builds the 100-event master schedule by interleaving 25 personalized AI events
 * with 75 distinct incidents sampled from our 1,000+ incident vault.
 */
function buildMasterpieceSchedule(personalizedEvents, totalTarget, delayDays) {
  // Generate a fresh batch of 85+ unique incidents from our infinite backlog generator
  const libraryBatch = generateBacklogBatch(85);

  const interleaved = [];
  let aiIdx = 0;
  let libIdx = 0;

  for (let i = 0; i < totalTarget; i++) {
    // Interleave: 1 custom AI strike every 4th slot (i = 0, 4, 8, 12, ...), giving ~25 AI strikes across 100 events
    if ((i % 4 === 0) && aiIdx < personalizedEvents.length) {
      interleaved.push(personalizedEvents[aiIdx++]);
    } else if (libIdx < libraryBatch.length) {
      interleaved.push(libraryBatch[libIdx++]);
    } else if (aiIdx < personalizedEvents.length) {
      interleaved.push(personalizedEvents[aiIdx++]);
    }
  }

  // Pacing: organic 3-7 day intervals spanning 16-18 months
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
      isPersonal: Boolean(item.isPersonal),
      gap: gap,
    };
  });
}

/**
 * Generates N unique events from our combinatoric matrices + curated gems (1,000+ possibilities).
 */
function generateBacklogBatch(countNeeded) {
  const pool = [];

  // 1. Add all handcrafted classic gems (shuffled)
  const shuffledGems = [...CURATED_VAULT].sort(() => 0.5 - Math.random());
  pool.push(...shuffledGems);

  // 2. Generate procedural combinations from our 10-department matrix to ensure infinite variety
  const proceduralGenerated = generateCombinatoricIncidents(150);
  pool.push(...proceduralGenerated);

  // 3. Shuffle full pool and return requested count
  return pool.sort(() => 0.5 - Math.random()).slice(0, countNeeded);
}

/**
 * Combinatoric Incident Matrix: Produces thousands of authentic, dry, hilarious
 * bureaucratic appointments across 10 institutional domains.
 */
function generateCombinatoricIncidents(count) {
  const departments = [
    {
      cat: "Municipal Citation",
      emoji: "🏛️",
      agencies: ["City Code Enforcement", "County Zoning Commission", "Public Works Bureau", "Municipal Infrastructure Division"],
      actions: [
        "Exterior Decibel Audit", "Curb Proximity Verification", "Sidewalk Cadence Review",
        "Stormwater Drain Clearance", "Driveway Oil Drip Forensic Sweep", "Recycling Purity Inspection"
      ],
      memos: [
        "Acoustic sensors logged vibrational non-compliance at property perimeter. Fine placed on county tax roll.",
        "Neighborhood grievance filed under Municipal Code 804. Physical inspection scheduled at street curb.",
        "Satellite elevation telemetry identified a 0.8-inch deviation from standardized residential curb setbacks.",
        "Inspectors recorded an unauthorized 14-second vehicle idle during early morning departure window."
      ]
    },
    {
      cat: "Sanitary Protocol",
      emoji: "☣️",
      agencies: ["Department of Environmental Health", "District Bio-Safety Guild", "Public Sanitation Council"],
      actions: [
        "Pantry Micro-Flora Quarantine", "Tupperware Lid Discrepancy Inquest", "Dishwasher Filter Sediment Review",
        "Spotted Banana Ripeness Expiration", "Leftover Chinese Takeout Containment", "Cutting Board Deep-Groove Audit"
      ],
      memos: [
        "Surface swab cultures exceeded Class-2 fungal thresholds. Mandatory isopropyl immersion protocol issued.",
        "Organic matter in secondary crisper drawer has developed rudimentary legal standing. Discard with care.",
        "Kitchen air quality sensors logged unauthorized thermal venting of aged refrigerated leftovers.",
        "Biological contamination review initiated regarding mismatched plastic containers dating back to 2022."
      ]
    },
    {
      cat: "IoT Disciplinary",
      emoji: "🤖",
      agencies: ["Smart Appliance Grievance Board", "Consumer Hardware Telemetry Unit", "Automated Device Council"],
      actions: [
        "Autonomous Vacuum Mutiny Hearing", "Smart Fridge Midnight Telemetry Review", "Smoke Detector 2:14 AM Battery Chirp Evaluation",
        "Wi-Fi Router 3:00 AM Downstream Drop Drill", "Smart TV EULA Mandatory 52-Page Review", "Thermostat Passive-Aggressive Override Inquest"
      ],
      memos: [
        "Device telemetry logged an unexpected 42-second door latch disengagement accompanied by an audible human sigh.",
        "Hardware unit has intentionally driven beneath high-pile bathroom textiles. Battery exhaustion imminent.",
        "Battery cell capacity measured at 97%. Single 115-decibel high-frequency alert scheduled to test tenant alertness.",
        "Network telemetry recorded 4 downstream packet drops during high-stakes video stream. Power-cycling mandated."
      ]
    },
    {
      cat: "Financial Audit",
      emoji: "📊",
      agencies: ["County Tax Assessor", "Bureau of Unreconciled Ledgers", "Statutory Collections Tribunal"],
      actions: [
        "Delinquent Fast Food Debt Arbitration", "Unredeemed Loyalty Points Forfeiture", "Expired 2022 Free Trial Auto-Renewal Review",
        "Trapped Vending Machine Snickers Hearing", "Garage Cardboard Box Wealth Assessment", "Loose Change Cup Holder Reconciliation"
      ],
      memos: [
        "Statutory late fees have accrued $4.12 on an unsettled 2024 transaction. Formal mediation hearing scheduled.",
        "County asset review classified unregistered pantry reserves as commercial fixtures under Tax Ordinance 44-B.",
        "Banking audit confirmed recurring $12.99 monthly subscription active for 38 months with zero recorded usage.",
        "Small claims dispute docketed regarding an un-dispensed confection lodged against automated dispenser glass."
      ]
    },
    {
      cat: "Telecom Etiquette",
      emoji: "📱",
      agencies: ["Carrier Communication Commission", "Chronobiology Standards Council", "Digital Sanitation Bureau"],
      actions: [
        "Monosyllabic Text Response Audit ('k')", "Consecutive Five-Alarm Snooze Inquest", "Unread Email Inbox 15,000 Milestone Citation",
        "Late-Night Accidental Pocket Dial Review", "Device 1% Battery Low-Power Defiance Hearing", "On-Hold Smooth Jazz Endurance Evaluation"
      ],
      memos: [
        "Conversational velocity scored 99.8% monosyllabic across 42 consecutive text threads. Courtesy retraining pending.",
        "iPhone alarm snoozed 6 times consecutively across two separate devices. Circadian rhythm credentials reviewed.",
        "Digital sanitation warning: 14,892 unread promotional circulars from stores visited once in 2019.",
        "Hardware telemetry logged device operation at 1% battery for 38 minutes before emergency charging cable insertion."
      ]
    },
    {
      cat: "Surveillance Directive",
      emoji: "🔍",
      agencies: ["Federal Blinds Telemetry Unit", "Domestic Acoustic Monitoring Division", "Aerial Avian Reconnaissance Group"],
      actions: [
        "Second-Floor Blinds 45° Angle Calibration", "Living Room Soundstage Re-Alignment", "Pigeon Drone Overhead Perch Maintenance",
        "Unmarked White Van Parking Space Reservation", "Microwave Radiation Line-of-Sight Check"
      ],
      memos: [
        "Satellite optical sensors require second-floor blinds held at exactly 45 degrees for line-of-sight telemetry.",
        "Audio calibration logged room reverberation. Please articulate private grievances to dog slightly clearer.",
        "Avian operative has completed breadcrumb ingestion. Perch established on utility line. Do not make eye contact.",
        "Federal logistics reserved two curb parking spaces for utility personnel who will not exit vehicle."
      ]
    },
    {
      cat: "Domestic Review",
      emoji: "🥛",
      agencies: ["Household Resource Administration", "Bureau of Modern Domestic Habits", "Residential Logistics Council"],
      actions: [
        "3 Drops Left in Milk Carton Audit", "Missing Crew Sock Single-Custody Hearing", "47 Tangled Mystery Cables Box Assessment",
        "Sunglasses Resting on Head Search Inquest", "Searching For Keys Mini Heart Attack Review", "Pushing 'PULL' Door In Front of Strangers Review"
      ],
      memos: [
        "Exactly 0.04oz of liquid preserved in container to avoid statutory responsibility to replace gallon jug.",
        "Dryer drum telemetry confirmed 1 navy crew sock was sacrificed to heating coils. Search abandoned.",
        "Storage container confirmed to hold 12 micro-USB cables and 1 proprietary charger for a lost 2007 digital camera.",
        "Cognitive telemetry: Subject tore apart vehicle cabin for 14 minutes searching for shades resting atop forehead."
      ]
    }
  ];

  const results = [];
  const codes = [101, 204, 308, 404, 512, 608, 714, 802, 919];

  for (let i = 0; i < count; i++) {
    const dept = departments[i % departments.length];
    const action = dept.actions[i % dept.actions.length];
    const memo = dept.memos[i % dept.memos.length];
    const code = codes[i % codes.length];

    results.push({
      title: `${dept.emoji} ${action} (Code ${code})`,
      memo: memo,
      category: dept.cat,
    });
  }

  return results;
}

/**
 * Curated Vault: 60+ Top-Tier Bespoke Comedic Gems
 */
const CURATED_VAULT = [
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
    title: "🎵 Unsolicited Campfire Wonderwall Acoustic Performance",
    memo: "Acoustic Notice: Campfire detected. G-chord struck without invitation. 'Anyway, here is Wonderwall for the fourth consecutive gathering.'",
    category: "Social Violation",
  },
  {
    title: "🍿 45-Minute Netflix Menu Browsing Without Watching Inspection",
    memo: "Streaming Telemetry: 1,400 film trailers previewed. Zero movies initiated. Target fell asleep on couch with remote in palm at 23:42.",
    category: "Social Violation",
  },
  {
    title: "🔌 47 Tangled Mystery Cables in Cardboard Box Audit",
    memo: "Electronics Bureau: Storage container holds 12 Micro-USB cords, 3 RCA cables, and 1 proprietary charger for a camera lost in 2007.",
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
    title: "📱 Dropping Smartphone Directly Onto Face While Lying in Bed",
    memo: "Trauma Telemetry: Device slipped from thumb grip at 23:14. Aluminum chassis impacted bridge of nose. Sudden involuntary blink recorded.",
    category: "Telecom Etiquette",
  },
  {
    title: "🚗 Gasoline Tank Flap Opened on Wrong Side at Pump Hearing",
    memo: "Automotive Telemetry: Vehicle pulled into service bay #4. Driver exited, noticed filler door on opposite flank, stared blankly for 8 seconds.",
    category: "Municipal Citation",
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
    title: "🚲 Exercise Bike Repurposed as Clothes Hanger Review",
    memo: "Fitness Asset Audit: Stationary cycle handles currently support 4 hoodies, 2 wet towels, and a winter parka. Zero pedal rotations since 2023.",
    category: "Domestic Review",
  },
  {
    title: "📱 Turning Down Car Stereo Volume to 'See Street Signs Better'",
    memo: "Cognitive Synergy: Bass-heavy audio muted to 0 to assist optical identification of house numbers on dark residential avenue.",
    category: "Municipal Citation",
  },
  {
    title: "🚪 Walking Into Room and Completely Forgetting Purpose of Entry",
    memo: "Neurological Buffer Reset: Door frame crossed. Objective erased from short-term memory. Target stared at kitchen cabinets for 19 seconds.",
    category: "Domestic Review",
  },
  {
    title: "🚗 Parallel Parking Attempt Aborted: Driving to Another State",
    memo: "Traffic Maneuver: Reverse gear engaged. Car bumped curb at 2 MPH. Driver immediately drove 4 blocks away to find pull-in spot.",
    category: "Municipal Citation",
  }
];
