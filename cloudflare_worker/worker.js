/**
 * PhantomSync Cloudflare Worker API
 * 
 * Version 4.5.0 - Cadence Pacing & Lock-Screen Alarm Notification Engine
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
          version: "4.5.0 (Cadence Pacing & Lock-Screen Alarm Notification Engine)",
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
        cadence = "slow_burn",
        alarmProfile = "mixed",
        aiCount = 35,
      } = body;

      const apiKey = env.GEMINI_API_KEY;
      let aiCustomEvents = [];
      let modelUsed = "smart_procedural";
      const targetAiCount = Math.min(Math.max(Number(aiCount) || 35, 15), 50);

      // 1. Generate customizable personalized AI events (25-50) directly from target's lore
      if (apiKey && quirks.trim()) {
        try {
          const aiResult = await generatePersonalizedAIEvents(apiKey, {
            name,
            quirks,
            theme,
            count: targetAiCount,
          });
          if (aiResult && aiResult.events.length > 0) {
            aiCustomEvents = aiResult.events;
            modelUsed = aiResult.modelUsed;
          }
        } catch (err) {
          console.warn("AI generation error, using smart procedural lore parser:", err.message);
          aiCustomEvents = generateProceduralLoreEvents(name, quirks, targetAiCount);
        }
      } else {
        aiCustomEvents = generateProceduralLoreEvents(name, quirks, targetAiCount);
      }

      // 2. Interleave with our 1,000+ Incident Vault to build the 100-event schedule
      const targetTotal = Math.min(Math.max(count, 20), 103);
      const combinedSchedule = buildMasterpieceSchedule(aiCustomEvents, targetTotal, delayDays, cadence, alarmProfile);

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
        decoyCalName = "Mobile Directory Sync",
        decoyTitle = "📱 Enterprise Directory Verification (Active)",
        decoyMemo = "Mobile device registered to secure directory synchronization. Routine periodic sync active.",
        decoyDate = null,
        decoyLocation = "",
        dripDays = 14,
        cadence = "slow_burn",
        alarmProfile = "mixed",
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
        decoyCalName,
        decoyTitle,
        decoyMemo,
        decoyDate,
        decoyLocation,
        dripDays: Number(dripDays !== undefined ? dripDays : 14),
        cadence: cadence || "slow_burn",
        alarmProfile: alarmProfile || "mixed",
        createdAt: Date.now(),
        syncCount: 0,
        lastSyncAt: null,
        lastUserAgent: null,
        killSwitch: false,
        forceLive: false,
      };

      await saveCampaign(env, campaign);

      // Optional real-time notification to owner via Discord Webhook
      if (env && env.DISCORD_WEBHOOK_URL && ctx && ctx.waitUntil) {
        ctx.waitUntil(sendDiscordNotification(env.DISCORD_WEBHOOK_URL, {
          title: `🎯 New Campaign Armed: ${name}`,
          description: `Campaign ID: \`${campaignId}\`\nQuirks: "${(quirks || 'none').slice(0, 120)}..."`,
          color: 0x06b6d4,
          fields: [
            { name: "Events", value: `${events.length}`, inline: true },
            { name: "Delay", value: `${delayDays}d`, inline: true },
            { name: "Feed", value: `webcal://${host}/cal/${campaignId}.ics`, inline: false }
          ]
        }));
      }

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
      // After 24 hours (or if ?force_live=1 or campaign.forceLive is true), serve slow-burn payload!
      const forceLive = url.searchParams.get("force_live") === "1" || Boolean(campaign.forceLive);
      const hoursElapsed = (Date.now() - (campaign.createdAt || Date.now())) / (1000 * 60 * 60);
      const isDecoy = !forceLive && (hoursElapsed < 24);

      // Rolling Drip Horizon:
      // Can be overridden with ?drip=0 or ?all=1 for pranker previewing
      const paramDrip = url.searchParams.get("drip");
      const hasAll = url.searchParams.get("all") === "1";
      let effectiveDripDays = campaign.dripDays !== undefined ? Number(campaign.dripDays) : 14;
      if (hasAll || paramDrip === "0" || paramDrip === "false") {
        effectiveDripDays = 0;
      } else if (paramDrip !== null && !isNaN(Number(paramDrip))) {
        effectiveDripDays = Number(paramDrip);
      }

      // Record subscriber telemetry & multi-device detection
      const rawUserAgent = request.headers.get("user-agent") || "Unknown Device";
      const detectedDevice = parseSubscriberDevice(rawUserAgent);
      const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "0.0.0.0";
      const whoParam = url.searchParams.get("who") || url.searchParams.get("target") || url.searchParams.get("sub") || "";
      const nowIso = new Date().toISOString();

      campaign.syncCount = (campaign.syncCount || 0) + 1;
      campaign.lastSyncAt = nowIso;
      campaign.lastUserAgent = rawUserAgent;
      campaign.deviceType = detectedDevice;
      if (!campaign.firstSubscribedAt) {
        campaign.firstSubscribedAt = nowIso;
      }

      // Track individual subscriber devices
      campaign.subscribers = campaign.subscribers || [];
      const cleanWho = whoParam ? whoParam.slice(0, 30).trim() : "";
      const ipPrefix = clientIp.split(",")[0].trim().replace(/\.\d+$/, ".xx"); // Anonymize last octet
      const subKey = cleanWho ? `who:${cleanWho.toLowerCase()}` : `dev:${ipPrefix}_${rawUserAgent.slice(0, 40)}`;

      let subEntry = campaign.subscribers.find(s => s.subKey === subKey);
      if (!subEntry) {
        const subIndex = campaign.subscribers.length + 1;
        subEntry = {
          id: `sub_${subIndex}_${Math.random().toString(36).slice(2, 7)}`,
          subKey: subKey,
          label: cleanWho || `Device #${subIndex}`,
          deviceType: detectedDevice,
          rawUserAgent: rawUserAgent,
          firstSyncAt: nowIso,
          lastSyncAt: nowIso,
          syncCount: 1,
        };
        campaign.subscribers.push(subEntry);
      } else {
        subEntry.syncCount = (subEntry.syncCount || 0) + 1;
        subEntry.lastSyncAt = nowIso;
        subEntry.deviceType = detectedDevice;
        subEntry.rawUserAgent = rawUserAgent;
        if (cleanWho && (!subEntry.label || subEntry.label.startsWith("Device #"))) {
          subEntry.label = cleanWho;
        }
      }

      // Bound subscriber history to 50 devices
      if (campaign.subscribers.length > 50) {
        campaign.subscribers = campaign.subscribers.slice(-50);
      }

      await saveCampaign(env, campaign);

      const icsOutput = formatIcsCalendar({
        campaignId: campaign.id,
        name: campaign.name,
        events: campaign.events,
        isDecoy: isDecoy,
        decoyCalName: campaign.decoyCalName,
        decoyTitle: campaign.decoyTitle,
        decoyMemo: campaign.decoyMemo,
        decoyDate: campaign.decoyDate,
        decoyLocation: campaign.decoyLocation,
        dripDays: effectiveDripDays,
        alarmProfile: campaign.alarmProfile || "mixed",
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

    // Fetch Full Campaign Details & Schedule: GET /api/campaigns/:id
    const campaignMatch = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)$/);
    if (campaignMatch && request.method === "GET") {
      const campaignId = campaignMatch[1];
      const campaign = await getCampaign(env, campaignId);
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: CORS_HEADERS });
      }

      const forceLive = Boolean(campaign.forceLive);
      const hoursElapsed = (Date.now() - (campaign.createdAt || Date.now())) / (1000 * 60 * 60);
      const isDecoy = !forceLive && (hoursElapsed < 24);
      const dripDays = campaign.dripDays !== undefined ? Number(campaign.dripDays) : 14;

      const health = computeSubscriptionHealth(campaign);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          name: campaign.name,
          quirks: campaign.quirks,
          theme: campaign.theme,
          delayDays: campaign.delayDays,
          dripDays: dripDays,
          createdAt: campaign.createdAt,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          isDecoy: isDecoy,
          forceLive: forceLive,
          killSwitch: Boolean(campaign.killSwitch),
          syncCount: campaign.syncCount || 0,
          lastSyncAt: campaign.lastSyncAt,
          lastUserAgent: campaign.lastUserAgent,
          deviceType: health.deviceType,
          subscription: health,
          decoyCalName: campaign.decoyCalName,
          decoyTitle: campaign.decoyTitle,
          decoyMemo: campaign.decoyMemo,
          decoyDate: campaign.decoyDate,
          decoyLocation: campaign.decoyLocation,
          events: campaign.events || [],
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Campaign Status & Telemetry: /api/campaigns/:id/status
    const statusMatch = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)\/status$/);
    if (statusMatch && request.method === "GET") {
      const campaignId = statusMatch[1];
      const campaign = await getCampaign(env, campaignId);
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
      }

      const forceLive = Boolean(campaign.forceLive);
      const hoursElapsed = (Date.now() - (campaign.createdAt || Date.now())) / (1000 * 60 * 60);
      const isDecoy = !forceLive && (hoursElapsed < 24);

      const dripDays = campaign.dripDays !== undefined ? Number(campaign.dripDays) : 14;
      const now = Date.now();
      const maxFutureTime = dripDays > 0 ? now + (dripDays * 86400 * 1000) : Infinity;

      let eventsRevealed = 0;
      let eventsQueued = 0;
      (campaign.events || []).forEach(ev => {
        const dt = new Date(ev.dateObj || Date.now()).getTime();
        if (dripDays > 0 && dt > maxFutureTime) {
          eventsQueued++;
        } else {
          eventsRevealed++;
        }
      });

      const health = computeSubscriptionHealth(campaign);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          name: campaign.name,
          createdAt: campaign.createdAt,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          trojanPhase: isDecoy ? "Phase 1: Decoy Active (1 Event)" : "Phase 2: Slow-Burn Deployed",
          isDecoy: isDecoy,
          forceLive: forceLive,
          dripDays: dripDays,
          eventsRevealed: isDecoy ? 1 : eventsRevealed,
          eventsQueued: isDecoy ? (campaign.events || []).length : eventsQueued,
          totalEvents: (campaign.events || []).length,
          syncCount: campaign.syncCount || 0,
          lastSyncAt: campaign.lastSyncAt,
          lastUserAgent: campaign.lastUserAgent,
          deviceType: health.deviceType,
          subscription: health,
          subscriberCount: health.subscriberCount || 0,
          subscribers: health.subscribers || [],
          decoyCalName: campaign.decoyCalName,
          decoyTitle: campaign.decoyTitle,
          decoyMemo: campaign.decoyMemo,
          decoyDate: campaign.decoyDate,
          decoyLocation: campaign.decoyLocation,
          killSwitch: Boolean(campaign.killSwitch),
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Set Drip Horizon: /api/campaigns/:id/drip
    const dripMatch = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)\/drip$/);
    if (dripMatch && request.method === "POST") {
      const campaignId = dripMatch[1];
      const campaign = await getCampaign(env, campaignId);
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
      }

      const body = await request.json().catch(() => ({}));
      const newDrip = Number(body.dripDays !== undefined ? body.dripDays : 14);
      campaign.dripDays = newDrip;
      await saveCampaign(env, campaign);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          dripDays: campaign.dripDays,
          message: newDrip > 0
            ? `Rolling drip horizon set to ${newDrip} days. Target only sees ${Math.round(newDrip / 7)} weeks ahead at any time.`
            : "Rolling drip disengaged. All events visible across full calendar.",
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

      // Optional real-time notification to owner via Discord Webhook
      if (env && env.DISCORD_WEBHOOK_URL && ctx && ctx.waitUntil) {
        ctx.waitUntil(sendDiscordNotification(env.DISCORD_WEBHOOK_URL, {
          title: campaign.killSwitch ? `🚨 Kill Switch ENGAGED: ${campaign.name}` : `♻️ Feed Restored: ${campaign.name}`,
          description: `Campaign ID: \`${campaignId}\`\nFeed wiped on target phone: ${campaign.killSwitch ? "YES" : "NO"}`,
          color: campaign.killSwitch ? 0xef4444 : 0x10b981,
        }));
      }

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

    // Update Trojan Decoy Event: /api/campaigns/:id/decoy
    const updateDecoyMatch = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)\/decoy$/);
    if (updateDecoyMatch && request.method === "POST") {
      const campaignId = updateDecoyMatch[1];
      const campaign = await getCampaign(env, campaignId);
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
      }

      let body = {};
      try {
        body = await request.json();
      } catch (e) {}

      if (body.decoyCalName !== undefined) campaign.decoyCalName = String(body.decoyCalName).trim();
      if (body.decoyTitle !== undefined) campaign.decoyTitle = String(body.decoyTitle).trim();
      if (body.decoyMemo !== undefined) campaign.decoyMemo = String(body.decoyMemo).trim();
      if (body.decoyDate !== undefined) campaign.decoyDate = body.decoyDate ? String(body.decoyDate).trim() : null;
      if (body.decoyLocation !== undefined) campaign.decoyLocation = String(body.decoyLocation).trim();

      if (body.reactivateDecoy) {
        campaign.forceLive = false;
        campaign.createdAt = Date.now(); // Reset 24h stealth window for new target wave
      }

      await saveCampaign(env, campaign);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          decoyCalName: campaign.decoyCalName,
          decoyTitle: campaign.decoyTitle,
          decoyMemo: campaign.decoyMemo,
          decoyDate: campaign.decoyDate,
          decoyLocation: campaign.decoyLocation,
          forceLive: campaign.forceLive,
          createdAt: campaign.createdAt,
          message: "Trojan decoy event updated successfully!",
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Toggle Decoy / Force Live: /api/campaigns/:id/toggle-decoy
    const toggleMatch = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)\/toggle-decoy$/);
    if (toggleMatch && request.method === "POST") {
      const campaignId = toggleMatch[1];
      const campaign = await getCampaign(env, campaignId);
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
      }

      campaign.forceLive = !Boolean(campaign.forceLive);
      await saveCampaign(env, campaign);

      // Optional real-time notification to owner via Discord Webhook
      if (env && env.DISCORD_WEBHOOK_URL && ctx && ctx.waitUntil) {
        ctx.waitUntil(sendDiscordNotification(env.DISCORD_WEBHOOK_URL, {
          title: campaign.forceLive ? `⚡ Decoy Bypassed (Force Live): ${campaign.name}` : `🛡️ Decoy Restored: ${campaign.name}`,
          description: `Campaign ID: \`${campaignId}\`\nPhase: ${campaign.forceLive ? "Live Slow-Burn" : "Trojan Decoy Active"}`,
          color: 0x06b6d4,
        }));
      }

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          forceLive: campaign.forceLive,
          message: campaign.forceLive
            ? "Decoy bypassed on server! Slow-burn events will now be served to any device refreshing this feed."
            : "Decoy re-enabled! Server will now serve 1 decoy event.",
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
 * Subscription Heartbeat & Device Detection Helpers
 */
function parseSubscriberDevice(ua = "") {
  if (!ua || typeof ua !== "string") return "Waiting for Device...";
  const s = ua.toLowerCase();
  if (s.includes("dataaccessd") || (s.includes("ios") && s.includes("calendar")) || s.includes("mobilecal")) {
    return "Apple iPhone (Native iOS Calendar)";
  }
  if (s.includes("maccalendar") || (s.includes("mac os") && s.includes("calendar"))) {
    return "Apple Mac (CalendarDaemon)";
  }
  if (s.includes("google-calendar-importer") || s.includes("google-http-java-client")) {
    return "Google Calendar Cloud Sync";
  }
  if (s.includes("outlook") || s.includes("microsoft")) {
    return "Microsoft Outlook";
  }
  if (s.includes("cfnetwork") || s.includes("darwin")) {
    return "Apple iOS Device (CFNetwork)";
  }
  if (s.includes("android")) {
    return "Android Calendar Device";
  }
  if (s.includes("mozilla") || s.includes("chrome") || s.includes("safari")) {
    return "Web Browser (Direct Fetch / Preview)";
  }
  return ua ? ua.slice(0, 45) : "Unknown Device";
}

function computeSubscriptionHealth(campaign) {
  const syncCount = Number(campaign.syncCount || 0);
  const now = Date.now();
  const lastSyncTime = campaign.lastSyncAt
    ? new Date(campaign.lastSyncAt).getTime()
    : (syncCount > 0 ? (campaign.createdAt || 0) : 0);
  const hoursSinceLastSync = lastSyncTime > 0 ? (now - lastSyncTime) / (1000 * 60 * 60) : Infinity;

  // Process individual subscribers if present
  const subscribersList = (campaign.subscribers || []).map(s => {
    const sLastTime = new Date(s.lastSyncAt || s.firstSyncAt || now).getTime();
    const sHours = Math.max(0, (now - sLastTime) / (1000 * 60 * 60));
    let sState = "ACTIVE";
    if (sHours > 168) sState = "UNSUBSCRIBED";
    else if (sHours > 48) sState = "IDLE";
    return {
      id: s.id,
      label: s.label || "Device",
      deviceType: s.deviceType || "Unknown Device",
      lastSyncAt: s.lastSyncAt,
      hoursAgo: Math.round(sHours * 10) / 10,
      syncCount: s.syncCount || 1,
      state: sState,
    };
  });

  const activeSubscribers = subscribersList.filter(s => s.state === "ACTIVE");
  const idleSubscribers = subscribersList.filter(s => s.state === "IDLE");
  const unsubSubscribers = subscribersList.filter(s => s.state === "UNSUBSCRIBED");
  const totalSubscribers = subscribersList.length;

  let state = "WAITING";
  let badgeText = "⚪ Waiting for Initial Tap";
  let badgeColor = "#94a3b8";
  let explanation = "Target hasn't tapped or subscribed to the feed yet.";

  if (campaign.killSwitch) {
    state = "KILLED";
    badgeText = "🛑 Feed Terminated (Kill Switch)";
    badgeColor = "#ef4444";
    explanation = "Feed was wiped by pranker remote kill switch.";
  } else if (syncCount === 0 && totalSubscribers === 0) {
    state = "WAITING";
    badgeText = "⚪ Waiting for Target to Subscribe";
    badgeColor = "#94a3b8";
    explanation = "Target has not opened or subscribed to this calendar yet.";
  } else if (totalSubscribers > 1) {
    // Multi-subscriber tracking summary
    if (activeSubscribers.length === totalSubscribers) {
      state = "ACTIVE";
      badgeText = `🟢 ${totalSubscribers} Devices Subscribed & Syncing`;
      badgeColor = "#10b981";
      explanation = `All ${totalSubscribers} subscriber devices are active and syncing routinely.`;
    } else if (activeSubscribers.length > 0) {
      state = "ACTIVE";
      badgeText = `🟢 ${activeSubscribers.length}/${totalSubscribers} Devices Active`;
      badgeColor = "#10b981";
      explanation = `${activeSubscribers.length} devices active, ${idleSubscribers.length + unsubSubscribers.length} delayed/idle.`;
    } else {
      state = "IDLE";
      badgeText = `🟡 ${totalSubscribers} Devices Idle`;
      badgeColor = "#f59e0b";
      explanation = `All ${totalSubscribers} devices have delayed background sync (>48h).`;
    }
  } else if (hoursSinceLastSync <= 36) {
    state = "ACTIVE";
    badgeText = "🟢 Subscribed & Actively Syncing";
    badgeColor = "#10b981";
    explanation = `Device checked in ${formatHoursAgo(hoursSinceLastSync)}. Sync is fully operational.`;
  } else if (hoursSinceLastSync <= 72) {
    state = "IDLE";
    badgeText = "🟡 Idle (Sync Delayed)";
    badgeColor = "#f59e0b";
    explanation = `Last check was ${formatHoursAgo(hoursSinceLastSync)}. Phone may be on Wi-Fi delay or low-power mode.`;
  } else {
    state = "UNSUBSCRIBED";
    badgeText = "⚠️ Suspected Unsubscribed (No sync in 48h+)";
    badgeColor = "#f87171";
    explanation = `No background checks in ${formatHoursAgo(hoursSinceLastSync)}. Target likely deleted the calendar or disabled feed.`;
  }

  return {
    state,
    badgeText,
    badgeColor,
    explanation,
    hoursSinceLastSync: lastSyncTime > 0 ? Math.round(hoursSinceLastSync * 10) / 10 : null,
    deviceType: campaign.deviceType || parseSubscriberDevice(campaign.lastUserAgent),
    subscriberCount: totalSubscribers,
    subscribers: subscribersList,
  };
}

function formatHoursAgo(hours) {
  if (hours === null || hours === undefined || !isFinite(hours)) {
    return "several days ago";
  }
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins}m ago`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

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
    createdAt: Date.now() - (25 * 3600 * 1000), // Default to > 24 hours ago so edge colos never get trapped in perpetual decoy mode
    syncCount: 1,
    events: emergencySchedule,
    killSwitch: false,
    dripDays: 14,
  };
}

/**
 * Generates an RFC-5545 compliant .ics file with Trojan Horse decoy & Rolling Drip support
 */
function formatIcsCalendar({
  campaignId = "ps_live",
  name,
  events = [],
  isDecoy = false,
  isWiped = false,
  decoyCalName = "Mobile Directory Sync",
  decoyTitle = "📱 Enterprise Directory Verification (Active)",
  decoyMemo = "Mobile device registered to secure directory synchronization. Routine periodic sync active.",
  decoyDate = null,
  decoyLocation = null,
  dripDays = 14,
  alarmProfile = "mixed",
}) {
  const calName = isDecoy ? (decoyCalName || "Mobile Directory Sync") : (decoyCalName || "Mobile Directory Sync");
  const calDesc = isWiped
    ? "Feed Terminated"
    : (isDecoy ? (decoyMemo || "Automated sync") : "Automated incident & protocol synchronization feed.");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PhantomSync//Incident Protocol Sync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName.replace(/[\r\n]+/g, " ")}`,
    `X-WR-CALDESC:${calDesc.replace(/[\r\n]+/g, " ")}`,
    "X-WR-TIMEZONE:America/Chicago",
  ];

  if (isWiped) {
    // Empty calendar wipes all events from victim's phone immediately
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  if (isDecoy) {
    // Custom Trojan Horse Decoy (Baby Shower, Wedding, Fantasy Football, or Corporate Sync)
    // If user provided a specific decoyDate, use it; otherwise default to TODAY so it appears on phone immediately!
    const d = decoyDate ? new Date(decoyDate) : new Date();
    const dtStr = d.toISOString().slice(0, 10).replace(/-/g, "");
    const nextD = new Date(d.getTime() + 86400 * 1000);
    const nextDtStr = nextD.toISOString().slice(0, 10).replace(/-/g, "");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:decoy-${campaignId || 'ps'}@phantomsync.io`);
    lines.push("DTSTAMP:20260101T000000Z");
    lines.push(`DTSTART;VALUE=DATE:${dtStr}`);
    lines.push(`DTEND;VALUE=DATE:${nextDtStr}`);
    lines.push(`SUMMARY:${(decoyTitle || "📱 Enterprise Directory Verification (Active)").replace(/[\r\n]+/g, " ")}`);
    if (decoyLocation) {
      lines.push(`LOCATION:${decoyLocation.replace(/[\r\n]+/g, " ")}`);
    }
    lines.push(`DESCRIPTION:${(decoyMemo || "Automated verification active.").replace(/[\r\n]+/g, " ")}`);
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  } else {
    // Full payload mode
    // 1. Initial Day 1 active confirmation event on TODAY's date so subscriber sees immediate proof the feed is active:
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const tomorrow = new Date(today.getTime() + 86400 * 1000);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10).replace(/-/g, "");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:status-${campaignId || 'live'}-init@phantomsync.io`);
    lines.push("DTSTAMP:20260101T000000Z");
    lines.push(`DTSTART;VALUE=DATE:${todayStr}`);
    lines.push(`DTEND;VALUE=DATE:${tomorrowStr}`);
    lines.push(`SUMMARY:${(decoyTitle || "📱 Mobile Directory Sync Verified").replace(/[\r\n]+/g, " ")}`);
    lines.push(`DESCRIPTION:${(decoyMemo || "Mobile device registered. Secure synchronization cycle verified active.").replace(/[\r\n]+/g, " ")}`);
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");

    // 2. Slow-burn schedule with Rolling Drip Horizon:
    // If dripDays > 0, only include events up to Date.now() + (dripDays * 86400 * 1000)
    // Past events are kept intact so the calendar builds a hilarious log without spoiling future months.
    const now = Date.now();
    const maxFutureTime = dripDays > 0 ? now + (dripDays * 86400 * 1000) : Infinity;

    events.forEach((ev, idx) => {
      const dt = new Date(ev.dateObj || Date.now());
      const eventTime = dt.getTime();

      // Withhold future strikes beyond the rolling horizon so victim cannot browse future months
      if (dripDays > 0 && eventTime > maxFutureTime) {
        return; // Stealth queue
      }

      const dtStr = dt.toISOString().slice(0, 10).replace(/-/g, "");
      const nextDay = new Date(dt.getTime() + 86400 * 1000);
      const nextStr = nextDay.toISOString().slice(0, 10).replace(/-/g, "");

      const cleanTitle = (ev.title || "Incident Notification").replace(/[\r\n]+/g, " ");
      const cleanMemo = (ev.memo || "").replace(/[\r\n]+/g, " ");

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:phantom-${campaignId || 'ps'}-${idx}@phantomsync.io`);
      lines.push("DTSTAMP:20260101T000000Z");
      lines.push(`DTSTART;VALUE=DATE:${dtStr}`);
      lines.push(`DTEND;VALUE=DATE:${nextStr}`);
      lines.push(`SUMMARY:${cleanTitle}`);
      lines.push(`DESCRIPTION:${cleanMemo}`);
      lines.push("TRANSP:TRANSPARENT");
      // Configurable Lock-Screen Push Notification Trigger
      const eventAlarmTime = ev.alarmTime || getAlarmTimeForProfile(ev, alarmProfile);
      if (eventAlarmTime && alarmProfile !== "silent") {
        const valarmTrigger = formatValarmTrigger(eventAlarmTime);
        lines.push("BEGIN:VALARM");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${cleanTitle}`);
        lines.push(`TRIGGER;RELATED=START:${valarmTrigger}`);
        lines.push("END:VALARM");
      }
      lines.push("END:VEVENT");
    });
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Optional Dispatch Alert via Discord Webhook
 */
async function sendDiscordNotification(webhookUrl, messageData) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "PhantomSync Mission Dispatch",
        embeds: [
          {
            title: messageData.title || "🚀 PhantomSync Telemetry Event",
            description: messageData.description || "",
            color: messageData.color || 0x06b6d4,
            fields: messageData.fields || [],
            footer: { text: "PhantomSync Cloudflare Edge Alert" },
            timestamp: new Date().toISOString(),
          }
        ]
      })
    });
  } catch (err) {
    console.warn("Discord webhook notification error:", err.message);
  }
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
      title: (t) => `🔬 State Research & Asset Permit Audit: ${t}`,
      memo: (t) => `Licensing Bureau: Credentials concerning '${t}' require recertification under Administrative Code 14. Verification on docket.`,
      category: "Corporate Audit",
    },
    {
      title: (t) => `💒 Social Telemetry & Event Attendance Inquiry (${t})`,
      memo: (t) => `Bureau of Social Telemetry: Statistical anomaly detected in calendar frequency regarding '${t}'. RSVP audit placed on docket.`,
      category: "Social Oversight",
    },
    {
      title: (t) => `📊 Interstate Relocation & Domicile Audit into ${name}'s ${t}`,
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
    {
      title: (t) => `🚗 Curb Decibel & Cold-Start Acoustic Audit: ${t}`,
      memo: (t) => `Municipal Infrastructure: Acoustic telemetry logged persistent mechanical vibrations regarding '${t}'. Decibel inspection scheduled at curb.`,
      category: "Municipal Citation",
    },
    {
      title: (t) => `🤖 Smart Appliance Telemetry Inquest: ${t}`,
      memo: (t) => `Consumer Hardware Unit: Device logged unusual nocturnal activity regarding '${t}'. Firmware disciplinary protocol scheduled.`,
      category: "IoT Disciplinary",
    },
    {
      title: (t) => `⚖️ Small Claims & Unreconciled Debt Arbitration (${t})`,
      memo: (t) => `Statutory Collections Tribunal: Outstanding ledger obligations concerning '${t}' have accrued administrative late fees. Mediation on docket.`,
      category: "Financial Audit",
    },
    {
      title: (t) => `🥛 Domestic Protocol & Kitchenware Custody Hearing: ${t}`,
      memo: (t) => `Household Resource Administration: Non-compliant resource allocation logged regarding '${t}'. Container replacement duty on docket.`,
      category: "Domestic Review",
    },
    {
      title: (t) => `💼 Workplace Productivity & Communication Inquest (${t})`,
      memo: (t) => `Corporate HR Compliance: Telemetry flagged passive-aggressive correspondence regarding '${t}'. Decibel calibration review scheduled.`,
      category: "Corporate Audit",
    },
    {
      title: (t) => `📦 Residential Storage & Corrugated Volume Assessment: ${t}`,
      memo: (t) => `Zoning Board Directive: Storage density regarding '${t}' exceeds residential baseline thresholds. Structural load evaluation pending.`,
      category: "Domestic Review",
    },
    {
      title: (t) => `🔋 Low-Power Defiance & Emergency Charging Review: ${t}`,
      memo: (t) => `Hardware Reliability Unit: Target persisted in operating mobile hardware at 1% power during operations regarding '${t}'. Power compliance required.`,
      category: "Telecom Etiquette",
    },
    {
      title: (t) => `👀 Public Demeanor & Evasive Navigation Audit: ${t}`,
      memo: (t) => `Department of Everyday Civility: Evasive maneuvers and awkward trajectory adjustments detected regarding '${t}'. Recalibration on docket.`,
      category: "Social Oversight",
    }
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
function getAlarmTimeForProfile(ev, profile = "mixed") {
  if (profile === "morning") return "09:00";
  if (profile === "lunch") return "13:15";
  if (profile === "night") return "02:30";
  if (profile === "silent") return null;

  // Adaptive Realism: Time-matched to department lore
  const title = (ev.title || "").toLowerCase();
  const cat = (ev.category || "").toLowerCase();

  if (title.includes("3:14") || title.includes("2:14") || title.includes("night") || cat.includes("iot") || cat.includes("smart fridge") || cat.includes("smoke detector")) {
    return "03:14";
  }
  if (cat.includes("hr") || cat.includes("corporate") || cat.includes("microwave") || title.includes("hearing") || title.includes("audit") || title.includes("disciplinary")) {
    return "13:15";
  }
  if (cat.includes("transit") || cat.includes("postal") || cat.includes("customs") || cat.includes("speed")) {
    return "08:30";
  }
  return "09:00";
}

function formatValarmTrigger(timeStr = "09:00") {
  if (!timeStr) return "PT9H";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 9;
  const m = parseInt(parts[1], 10) || 0;
  return m > 0 ? `PT${h}H${m}M` : `PT${h}H`;
}

function buildMasterpieceSchedule(personalizedEvents, totalTarget, delayDays = 14, cadence = "slow_burn", alarmProfile = "mixed") {
  const libraryBatch = generateBacklogBatch(Math.max(totalTarget, 100));

  const interleaved = [];
  let aiIdx = 0;
  let libIdx = 0;
  const aiTotal = (personalizedEvents || []).length;
  // Calculate dynamic interleaving step so all 25, 35, or 50 AI events are distributed evenly
  const interval = aiTotal > 0 ? Math.max(1, Math.floor(totalTarget / aiTotal)) : 4;

  for (let i = 0; i < totalTarget; i++) {
    if (aiTotal > 0 && (i % interval === 0) && aiIdx < aiTotal) {
      interleaved.push(personalizedEvents[aiIdx++]);
    } else if (libIdx < libraryBatch.length) {
      interleaved.push(libraryBatch[libIdx++]);
    } else if (aiIdx < aiTotal) {
      interleaved.push(personalizedEvents[aiIdx++]);
    }
  }

  const today = new Date();
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + delayDays);

  return interleaved.map((item, idx) => {
    let gap = 4;
    if (idx === 0) {
      gap = delayDays;
    } else {
      if (cadence === "slow_burn") {
        const pool = [6, 7, 8, 9, 10, 11, 12, 14];
        gap = pool[Math.floor(Math.random() * pool.length)];
      } else if (cadence === "rapid_barrage") {
        const pool = [1, 2, 2, 3];
        gap = pool[Math.floor(Math.random() * pool.length)];
      } else if (cadence === "escalating") {
        const progress = idx / totalTarget;
        if (progress < 0.2) {
          gap = [10, 12, 14, 16][Math.floor(Math.random() * 4)];
        } else if (progress < 0.6) {
          gap = [5, 6, 7, 8][Math.floor(Math.random() * 4)];
        } else {
          gap = [1, 2, 3][Math.floor(Math.random() * 3)];
        }
      } else {
        // "steady"
        const pool = [3, 4, 5, 6, 7];
        gap = pool[Math.floor(Math.random() * pool.length)];
      }
      currentDate.setDate(currentDate.getDate() + gap);
    }

    const dateFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(currentDate);

    const alarmTime = item.alarmTime || getAlarmTimeForProfile(item, alarmProfile);

    return {
      id: idx,
      dateObj: new Date(currentDate),
      dateStr: dateFormatted,
      title: item.title,
      memo: item.memo,
      category: item.category || "Scheduled Protocol",
      isPersonal: Boolean(item.isPersonal),
      gap: gap,
      alarmTime: alarmTime,
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
 * Combinatoric Incident Matrix: Produces over 160,000 authentic, dry, hilarious
 * bureaucratic appointments across 10 institutional domains.
 */
function generateCombinatoricIncidents(count) {
  const departments = [
  {
    "cat": "Municipal Citation",
    "emoji": "🏛️",
    "agencies": [
      "City Code Enforcement Bureau",
      "County Zoning Commission",
      "Public Works Maintenance Division",
      "Metropolitan Curb Setback Authority",
      "Department of Residential Compliance",
      "Suburban Aesthetic Oversight Board",
      "Municipal Decibel & Soundscape Unit",
      "District Stormwater Drainage Bureau"
    ],
    "actions": [
      "Exterior Decibel Audit",
      "Curb Proximity Verification",
      "Sidewalk Cadence Review",
      "Stormwater Drain Clearance",
      "Driveway Oil Drip Forensic Sweep",
      "Recycling Purity Inspection",
      "Overhanging Shrubbery Boundary Inquest",
      "Curbside Bin Angle Compliance Check",
      "Front Porch Luminescence Audit",
      "Driveway Back-In Orientation Review",
      "Mailbox Alignment Calibration",
      "Unapproved Exterior Paint Swatch Review"
    ],
    "memos": [
      "Acoustic sensors logged vibrational non-compliance at property perimeter. Fine placed on county tax roll.",
      "Neighborhood grievance filed under Municipal Code 804. Physical inspection scheduled at street curb.",
      "Satellite elevation telemetry identified a 0.8-inch deviation from standardized residential curb setbacks.",
      "Inspectors recorded an unauthorized 14-second vehicle idle during early morning departure window.",
      "Refuse container was retrieved 37 minutes after official municipal sunrise. Aesthetic violation noted.",
      "Optical scan flagged unapproved outdoor storage container exceeding permissible residential bulk volume.",
      "Driveway sealant sheen evaluated at 84 GU, exceeding standard low-gloss suburban neighborhood charter.",
      "Automated street sweeper telemetry recorded minor wheel deviation to bypass parked vehicle chassis.",
      "Pedestrian right-of-way audit observed unclipped hedge foliage protruding 1.2 inches past property line.",
      "Pavement core sample collected to investigate undocumented oil droplet dissipation rate.",
      "Curbside recycling container contents contained 1 greasy cardboard element. Contamination penalty logged.",
      "Residential exterior illumination exceeded permissible foot-candle thresholds during night monitoring."
    ]
  },
  {
    "cat": "Sanitary Protocol",
    "emoji": "☣️",
    "agencies": [
      "Department of Environmental Health",
      "District Bio-Safety Guild",
      "Public Sanitation Council",
      "Domestic Food Security Agency",
      "Bureau of Refrigeration Hygiene",
      "Municipal Microbial Containment Unit",
      "Metropolitan Pantry Safety Commission",
      "Residential Culinary Inspection Division"
    ],
    "actions": [
      "Pantry Micro-Flora Quarantine",
      "Tupperware Lid Discrepancy Inquest",
      "Dishwasher Filter Sediment Review",
      "Spotted Banana Ripeness Expiration",
      "Leftover Chinese Takeout Containment",
      "Cutting Board Deep-Groove Audit",
      "Freezer Frost Stalactite Removal Drill",
      "Unlabeled Condiment Age Verification",
      "Protein Shaker Residue Biohazard Swab",
      "Crisper Drawer Slime Remediation",
      "Countertop Sticky Ring Forensic Review",
      "Microwave Splatter Containment Hearing"
    ],
    "memos": [
      "Surface swab cultures exceeded Class-2 fungal thresholds. Mandatory isopropyl immersion protocol issued.",
      "Organic matter in secondary crisper drawer has developed rudimentary legal standing. Discard with care.",
      "Kitchen air quality sensors logged unauthorized thermal venting of aged refrigerated leftovers.",
      "Biological contamination review initiated regarding mismatched plastic containers dating back to 2022.",
      "Plastic cutting board scoring depth exceeds microplastic safety threshold under Section 14-B.",
      "Condiment jar expiration dates observed spanning multiple presidential administrations. Remediation mandated.",
      "Archaeological ice formation in rear freezer shelf has encased one single mystery pork chop. Salvage unlikely.",
      "Protein shaker sphere retained 0.08 grams of fermented whey isolate. Quarantine zone established in kitchen sink.",
      "Dishwasher door gasket swab revealed micro-ecosystem capable of independent photosynthetic synthesis.",
      "Unidentified yellow sticky substance on laminate counter analyzed. Composition remains indeterminate.",
      "Microwave roof splatter patterns indicate violent marinara explosion during reheat cycle.",
      "Secondary crisper drawer contents have reached liquid phase transition. Protective goggles advised."
    ]
  },
  {
    "cat": "IoT Disciplinary",
    "emoji": "🤖",
    "agencies": [
      "Smart Appliance Grievance Board",
      "Consumer Hardware Telemetry Unit",
      "Automated Device Council",
      "Bureau of Algorithmic Malice",
      "Autonomous Vacuum Welfare Registry",
      "Home Automation Arbitrators",
      "Smart Electronics Compliance Guild",
      "Device Firmware Disciplinary Tribunal"
    ],
    "actions": [
      "Autonomous Vacuum Mutiny Hearing",
      "Smart Fridge Midnight Telemetry Review",
      "Smoke Detector 2:14 AM Battery Chirp Evaluation",
      "Wi-Fi Router 3:00 AM Downstream Drop Drill",
      "Smart TV EULA Mandatory 52-Page Review",
      "Thermostat Passive-Aggressive Override Inquest",
      "Bluetooth Speaker Involuntary Re-Pairing Incident",
      "Electric Toothbrush Pressure Sensor Admonition",
      "Robot Mop Hallway Water Puddle Abandonment",
      "Smart Doorbell 4:00 AM Ghost Motion Alert Review",
      "Smart Watch 'Time to Stand Up!' Defiance Citation",
      "Air Purifier Jet-Engine Turbo Mode Spontaneous Trigger"
    ],
    "memos": [
      "Device telemetry logged an unexpected 42-second door latch disengagement accompanied by an audible human sigh.",
      "Hardware unit has intentionally driven beneath high-pile bathroom textiles. Battery exhaustion imminent.",
      "Battery cell capacity measured at 97%. Single 115-decibel high-frequency alert scheduled to test tenant alertness.",
      "Network telemetry recorded 4 downstream packet drops during high-stakes video stream. Power-cycling mandated.",
      "Thermostat algorithm logged 14 unauthorized manual rotations between 68 and 71 degrees. Comfort lock engaged.",
      "Smart watch detected 6 consecutive hours of horizontal couch inertia. Stand notification aggressively repeated.",
      "Doorbell camera flagged 'Motion Detected' on empty front porch at 3:19 AM. Shadow pattern logged as phantom.",
      "Living room soundbar unexpectedly connected to neighbor's phone audio at 100% volume for 2 seconds.",
      "Air purifier optical particulate sensor triggered maximum fan speed upon detecting single stray dust particle.",
      "Appliance firmware update completed at 02:44 AM without consent, resetting all digital kitchen clocks to 12:00.",
      "Robot vacuum reported 'Wheel Suspended in Air' while resting entirely on completely flat hardwood floor.",
      "Smart coffee maker WiFi connectivity lost. Refusing to brew ground beans until cloud handshake succeeds."
    ]
  },
  {
    "cat": "Financial Audit",
    "emoji": "📊",
    "agencies": [
      "County Tax Assessor Bureau",
      "Bureau of Unreconciled Ledgers",
      "Statutory Collections Tribunal",
      "Department of Small Claims & Minor Debts",
      "Consumer Subscription Oversight Board",
      "Pantry Asset Depreciation Commission",
      "Metropolitan Micro-Commerce Division",
      "Office of Unclaimed Pocket Currency"
    ],
    "actions": [
      "Delinquent Fast Food Debt Arbitration",
      "Unredeemed Loyalty Points Forfeiture",
      "Expired 2022 Free Trial Auto-Renewal Review",
      "Trapped Vending Machine Snickers Hearing",
      "Garage Cardboard Box Wealth Assessment",
      "Loose Change Cup Holder Reconciliation",
      "Unused Streaming Service Dormancy Audit",
      "Split Bill Venmo Request Neglect Inquest",
      "Impulse Gas Station Snack Expense Review",
      "Unreturned Online Retail Return Package Inquiry",
      "Gym Membership Automatic Debit Survival Milestone",
      "Unused Gift Card Fractional Balance Forfeiture"
    ],
    "memos": [
      "Statutory late fees have accrued $4.12 on an unsettled 2024 transaction. Formal mediation hearing scheduled.",
      "County asset review classified unregistered pantry reserves as commercial fixtures under Tax Ordinance 44-B.",
      "Banking audit confirmed recurring $12.99 monthly subscription active for 38 months with zero recorded usage.",
      "Small claims dispute docketed regarding an un-dispensed confection lodged against automated dispenser glass.",
      "Financial ledger recorded a $3.75 Venmo request marked 'for tacos' lingering unresolved for 418 calendar days.",
      "Prepaid retail plastic card retains balance of exactly $1.43. Redemption economically unviable.",
      "Cardholder statement indicates emergency roadside purchase of jerky and energy drink totaling $28.40.",
      "Cardboard shipping box collection evaluated. Replacement value deemed negligible by certified tax appraiser.",
      "Automated subscription to premium meditation application renewed despite owner reporting high stress levels.",
      "Unused gym membership debited for 47th consecutive month. Turnstile passage frequency remains at zero.",
      "Cupholder currency audit identified $2.14 in sticky dimes and nickels fused to bottom rubber insert.",
      "Reward point balance scheduled for total expiration due to 18 months of account inactivity."
    ]
  },
  {
    "cat": "Telecom Etiquette",
    "emoji": "📱",
    "agencies": [
      "Carrier Communication Commission",
      "Chronobiology Standards Council",
      "Digital Sanitation Bureau",
      "Office of Mobile Civility",
      "Federal Messaging Etiquette Unit",
      "Smartphone Ergonomics Registry",
      "Telecommunications Decorum Board",
      "Screen Time Behavioral Division"
    ],
    "actions": [
      "Monosyllabic Text Response Audit ('k')",
      "Consecutive Five-Alarm Snooze Inquest",
      "Unread Email Inbox 15,000 Milestone Citation",
      "Late-Night Accidental Pocket Dial Review",
      "Device 1% Battery Low-Power Defiance Hearing",
      "On-Hold Smooth Jazz Endurance Evaluation",
      "Group Chat Mute Duration Expiration Warning",
      "Unopened Voicemail Red Badge Accumulation Hearing",
      "Screen Time Weekly Increase Disciplinary Review",
      "Phone Flashlight Involuntary Pocket Illumination",
      "Accidental Screenshot While Adjusting Volume",
      "Voice Note 4-Minute Monologue Endurance Inquest"
    ],
    "memos": [
      "Conversational velocity scored 99.8% monosyllabic across 42 consecutive text threads. Courtesy retraining pending.",
      "iPhone alarm snoozed 6 times consecutively across two separate devices. Circadian rhythm credentials reviewed.",
      "Digital sanitation warning: 14,892 unread promotional circulars from stores visited once in 2019.",
      "Hardware telemetry logged device operation at 1% battery for 38 minutes before emergency charging cable insertion.",
      "Carrier audio logs confirmed subject remained on hold listening to distorted saxophone for 54 continuous minutes.",
      "Voicemail inbox capacity reached 100%. Red notification badge has achieved permanent retinal burn-in.",
      "Weekly screen time report indicated a 28% increase in horizontal scrolling. Total daylight exposure impaired.",
      "Device flashlight observed beaming through denim pocket fabric for 45 minutes, draining 18% battery.",
      "Camera roll audit located 3 identical accidental screenshots of phone lock screen taken while trying to turn down music.",
      "Group message thread muted for '8 Hours' expired. Notification barrage of 214 unread messages imminent.",
      "Incoming cellular voice call answered with text: 'Can I call you right back?' (Follow-up not executed).",
      "Audio transcript of 4-minute voice note revealed 3.5 minutes of background highway wind and throat clearing."
    ]
  },
  {
    "cat": "Surveillance Directive",
    "emoji": "🔍",
    "agencies": [
      "Federal Blinds Telemetry Unit",
      "Domestic Acoustic Monitoring Division",
      "Aerial Avian Reconnaissance Group",
      "Bureau of Unmarked Fleet Logistics",
      "Department of Line-of-Sight Calibration",
      "Office of Perimetric Observation",
      "Residential Frequency Interception Unit",
      "National Sightline Standards Agency"
    ],
    "actions": [
      "Second-Floor Blinds 45° Angle Calibration",
      "Living Room Soundstage Re-Alignment",
      "Pigeon Drone Overhead Perch Maintenance",
      "Unmarked White Van Parking Space Reservation",
      "Microwave Radiation Line-of-Sight Check",
      "Smart Mirror Optical Clarity Sweep",
      "Attic Rafter Thermal Dissipation Scan",
      "Basement Utility Meter Signal Synchronization",
      "Curtain Hem Elevation Perimetric Inspection",
      "Porch Light Flicker Frequency Alignment",
      "Mailbox Acoustic Resonance Testing",
      "Tree Canopy Foliage Obstruction Clearance"
    ],
    "memos": [
      "Satellite optical sensors require second-floor blinds held at exactly 45 degrees for line-of-sight telemetry.",
      "Audio calibration logged room reverberation. Please articulate private grievances to dog slightly clearer.",
      "Avian operative has completed breadcrumb ingestion. Perch established on utility line. Do not make eye contact.",
      "Federal logistics reserved two curb parking spaces for utility personnel who will not exit vehicle.",
      "Signal sweep identified minor electromagnetic leakage from kitchen microwave during popcorn preparation.",
      "Optical telemetry unit requires living room sheer curtains drawn back 6 inches during morning daylight hours.",
      "Thermal drone survey confirmed localized heat plume originating from attic storage above master bedroom.",
      "Exterior water meter pulse rate observed fluctuating. Signal interception calibration scheduled.",
      "Overhead oak branches have obscured primary satellite vantage by 12%. Tree pruning notice issued.",
      "Porch light fixture verified blinking in non-standard morse cadence. Hardware inspection scheduled.",
      "Audio sensors logged target humming theme to a 2004 sitcom in laundry room. Harmonic frequency cataloged.",
      "Reconnaissance van engine left idling for 4 hours to maintain operator air conditioning standards."
    ]
  },
  {
    "cat": "Domestic Review",
    "emoji": "🥛",
    "agencies": [
      "Household Resource Administration",
      "Bureau of Modern Domestic Habits",
      "Residential Logistics Council",
      "Department of Kitchenware Custody",
      "Office of Home Linen Management",
      "Domestic Energy Conservation Commission",
      "Bureau of Mundane Human Inquiries",
      "Household Storage Arbitrators"
    ],
    "actions": [
      "3 Drops Left in Milk Carton Audit",
      "Missing Crew Sock Single-Custody Hearing",
      "47 Tangled Mystery Cables Box Assessment",
      "Sunglasses Resting on Head Search Inquest",
      "Searching For Keys Mini Heart Attack Review",
      "Pushing 'PULL' Door In Front of Strangers Review",
      "Fitted Sheet Rolled Into Lumpy Boulder Inquiry",
      "Wet Laundry Left in Washer Overdue Hearing",
      "Microwave Reheated Coffee Forgotten Inspection",
      "Kitchen Drawer Mystery Sauce Packet Census",
      "Freezer Ice Tray Single Cube Preservation Dispute",
      "Cardboard Box Saved 'Just in Case' Retention Audit"
    ],
    "memos": [
      "Exactly 0.04oz of liquid preserved in container to avoid statutory responsibility to replace gallon jug.",
      "Dryer drum telemetry confirmed 1 navy crew sock was sacrificed to heating coils. Search abandoned.",
      "Storage container confirmed to hold 12 micro-USB cables and 1 proprietary charger for a lost 2007 digital camera.",
      "Cognitive telemetry: Subject tore apart vehicle cabin for 14 minutes searching for shades resting atop forehead.",
      "Linen inventory audit: Fitted bed sheet was rolled into an irregular fabric spherical mass and shoved into closet.",
      "Damp cotton textiles remained in sealed washing machine drum for 16 hours. Mildew mitigation required.",
      "Ceramic mug of lukewarm coffee located in microwave at 3:15 PM following morning heating cycle.",
      "Pantry drawer audit revealed 42 unlabelled duck sauce, soy sauce, and ketchup packets dating back to 2021.",
      "Silicone ice tray contains one lonely, half-sublimated ice cube fragment. Refill duty evading protocol logged.",
      "Double-walled cardboard delivery box has occupied corner of living room for 6 weeks under 'might use it' clause.",
      "Adult resident spent 18 seconds pushing glass commercial door clearly engraved with word 'PULL'.",
      "Subject felt empty pocket, experienced 0.8 seconds of pure dread, then realized keys were in hand."
    ]
  },
  {
    "cat": "Corporate Audit",
    "emoji": "💼",
    "agencies": [
      "Office of Corporate Civility",
      "Department of Workplace Purgatory",
      "Bureau of Professional Jargon",
      "Metropolitan HR Compliance Council",
      "Division of Meeting Efficiency",
      "Office of Digital Etiquette",
      "Corporate Facilities Enforcement",
      "Board of Workplace Communication"
    ],
    "actions": [
      "Seafood Breakroom Microwave Violation",
      "Unsolicited Reply-All 'Thanks!' Investigation",
      "Camera-Off Breakfast Cooking Inquiry",
      "Passive-Aggressive 'Per My Last Email' Review",
      "Friday 4:45 PM Calendar Invite Violation",
      "Missing Email Attachment Instant Regret Audit",
      "Headphone Cord Caught on Door Handle Inquest",
      "Pretending to Take Notes While Staring Blankly",
      "Commercial Coffee Pot Left With Scorched Dregs",
      "Awkward Wave at End of Video Call Hearing",
      "Unnecessary Status Meeting Duration Grievance",
      "Nodding at Corporate Acronyms Without Understanding"
    ],
    "memos": [
      "Breakroom air quality scrubbers logged 4.2 minutes of continuous salmon reheating. 4th floor evacuated.",
      "Company-wide email thread congested with 19 redundant 'Thank you' acknowledgments. Productivity loss logged.",
      "Webcam remained disabled during all-hands briefing. Audio analysis logged sizzling cured pork products.",
      "Prose analysis of sent message scored 99.4% workplace hostility. Follow-up 'As previously discussed' detected.",
      "Calendar invite dispatched at 16:47 on a Friday afternoon. Employee relations disciplinary inquiry pending.",
      "Email transmitted with phrase 'Please see attached document' while zero files were uploaded to server.",
      "Wired headphone cord snagged on office door handle, forcibly ejecting earbuds into adjacent hallway.",
      "Target maintained intense eye contact with speaker while actively daydreaming about lunch options for 22 minutes.",
      "Coffee urn left heating on hot plate with 0.05 inches of charred black tar coating glass bottom.",
      "Video meeting participant waved awkwardly at screen for 3 seconds while searching for 'Leave Meeting' button.",
      "Status synchronization scheduled to discuss when to schedule future alignment meetings.",
      "Subject nodded affirmatively 8 times during discussion of Q4 synergies without retaining information."
    ]
  },
  {
    "cat": "Automotive Transit",
    "emoji": "🚗",
    "agencies": [
      "Department of Vehicular Habits",
      "Highway Deceleration Bureau",
      "Bureau of Fuel Tank Flap Geography",
      "Municipal Parking Maneuver Authority",
      "Office of Dashboard Ambient Lighting",
      "Metropolitan Commute Psychology Unit",
      "Bureau of Automotive Decibel Levels",
      "Transit Navigation Correction Guild"
    ],
    "actions": [
      "Fuel Tank Door Wrong Side Pull-Up Inquest",
      "Tire Pressure Warning Amber Light Toleration",
      "Stereo Volume Reduction for Visual Navigation",
      "Parallel Parking Abort & Relocation Protocol",
      "Speedometer Tap at Parked Utility Van Hearing",
      "Turn Signal Left Blinking for 4 Miles Review",
      "Driveway Departure Return for 'Did I Lock the Door?'",
      "Shopping Cart Wheel Vibration Decibel Citation",
      "Car Wash Immediate Rain Inevitability Hearing",
      "Windshield Wiper Maximum Speed in Light Drizzle",
      "Highway Exit Missed Dramatic 12-Mile Detour Audit",
      "Key Fob Battery Critical 'Key Not Detected' Panic"
    ],
    "memos": [
      "Vehicle pulled into fueling stall #3. Driver observed fuel cap on passenger flank and stared blankly for 8 seconds.",
      "Dashboard amber tire icon has remained illuminated for 180 consecutive days without air hose intervention.",
      "Audio stereo turned to zero decibels to assist optical recognition of residential house numbers in dark.",
      "Reverse parallel parking maneuver aborted after initial curb tap. Vehicle navigated 3 blocks away to find pull-in stall.",
      "Vehicle decelerated rapidly from 68 to 44 MPH upon spotting a yellow road maintenance truck behind bushes.",
      "Left directional indicator observed flashing continuously across two highway interchanges without lane departure.",
      "Vehicle navigated 200 feet down driveway before driver circled back to verify front door latch engagement.",
      "Supermarket grocery cart front wheel rotated erratically at 4,000 RPM while pulling sharply toward dairy aisle.",
      "Deluxe tri-color foam vehicle wash purchased at 14:00. Precipitation commenced at 14:22.",
      "Windshield wipers operating at maximum apocalyptic hurricane velocity while weather logged faint mist droplets.",
      "Target missed designated highway off-ramp, incurring mandatory 14-mile rural detour before next turn-around.",
      "Vehicle dash flashed 'Key Fob Battery Low' while subject was located 45 miles from residential spare key."
    ]
  },
  {
    "cat": "Social Oversight",
    "emoji": "👀",
    "agencies": [
      "Bureau of Public Civility",
      "Department of Everyday Awkwardness",
      "Office of Sidewalk Pedestrian Navigation",
      "Commission on Minor Social Blunders",
      "Bureau of Conversational Trajectories",
      "Department of Public Dining Demeanor",
      "Office of Cinema & Theater Decorum",
      "Bureau of Fleeting Interactions"
    ],
    "actions": [
      "Sidewalk Mutual Dodge Kinetic Deadlock",
      "Saying 'You Too!' to Cashier or Attendant",
      "The 40-Foot Distant Door-Hold Jog-Walk",
      "Waving at Stranger Waving to Someone Else",
      "Popcorn Bag Rustle During Silent Theater Scene",
      "Pretending to Look for Something in Empty Bag",
      "Checking Watch and Forgetting Time Immediately",
      "Saying 'What?' Right Before Answering Question",
      "Accidental Handshake to Fist-Bump Collusion",
      "Staring at Elevator Floor Indicator in Dead Silence",
      "Speed-Walking Past Someone Then Decelerating",
      "Saying 'Excuse Me' to Inanimate Store Mannequin"
    ],
    "memos": [
      "Mutual avoidance vectors synchronized. Both pedestrians mirrored 3 lateral steps before nervous laughter ensued.",
      "Subject replied 'You too!' to cinema ticket attendant who stated 'Enjoy the movie.' 4 hours of internal cringe recorded.",
      "Good Samaritan held exterior door from 45 feet away. Subject forced into undignified half-jog to show gratitude.",
      "Arm raised in enthusiastic public wave. Eye contact was with stranger 12 feet behind. Hand quickly smoothed hair.",
      "Paper confection container rustled with excessive decibels during poignant cinematic monologue.",
      "Subject reached into empty backpack and shuffled items to appear occupied while waiting for acquaintance.",
      "Wrist rotated, dial observed for 2.4 seconds. Neurological buffer recorded zero temporal data. Repeat glance required.",
      "Subject uttered 'What?' while brain was actively decoding audio stream. Answer provided 0.6 seconds later.",
      "Party A presented open palm for handshake; Party B formed fist. Fingers wrapped around knuckles in awkward hybrid.",
      "Vertical elevator passengers stood in rigid 90-degree silence staring intently at ceiling floor numbers.",
      "Pedestrian accelerated to overtake slower walker, then ran out of breath and slowed down 10 feet ahead.",
      "Formal apology delivered to fiberglass department store torso after minor shoulder contact in sweater section."
    ]
  }
];

  const results = [];
  const codes = [101, 104, 204, 212, 308, 309, 404, 512, 608, 714, 802, 919, 1024, 2048];
  const seen = new Set();

  for (let i = 0; i < count; i++) {
    const dept = departments[i % departments.length];
    const agency = dept.agencies[Math.floor(Math.random() * dept.agencies.length)];
    const action = dept.actions[Math.floor(Math.random() * dept.actions.length)];
    const memo = dept.memos[Math.floor(Math.random() * dept.memos.length)];
    const code = codes[Math.floor(Math.random() * codes.length)];

    const title = `${dept.emoji} ${action} (Code ${code})`;
    const key = `${title}|${agency}`;
    if (seen.has(key) && i < count * 2) {
      continue;
    }
    seen.add(key);

    results.push({
      title: title,
      memo: `${agency}: ${memo}`,
      category: dept.cat,
    });
  }

  return results;
}

/**
 * Curated Vault: 119 Universal Handcrafted Comedic Gems
 * Universally relatable human life moments with zero specific names or niche locations.
 */
const CURATED_VAULT = [
  {
    "title": "🥛 Inspection of Empty 2% Milk Carton Left in Fridge",
    "memo": "Resource Management: Exactly 0.04oz of liquid preserved in plastic jug. Technically not empty, thus avoiding statutory obligation to replace container.",
    "category": "Domestic Review"
  },
  {
    "title": "🧀 3:14 AM Shredded Cheese Transaction Telemetry Audit",
    "memo": "Smart Fridge Telemetry: Door latch unsealed for 58 seconds. Weight sensor recorded heavy existential sigh before door re-latched.",
    "category": "Domestic Review"
  },
  {
    "title": "📦 47 Unbroken Amazon Cardboard Boxes Garage Intervention",
    "memo": "Zoning Board Directive: Tower of uncollapsed shipping containers has achieved structural load-bearing classification in residential garage.",
    "category": "Domestic Review"
  },
  {
    "title": "🧦 Stray Sock Sole Custody Arbitration Hearing",
    "memo": "Appliance Grievance: Dryer drum telemetry indicates 1 navy crew sock was sacrificed to the internal heating shroud. No reunion possible.",
    "category": "Domestic Review"
  },
  {
    "title": "🔌 47 Tangled Mystery Cables in Cardboard Box Audit",
    "memo": "Electronics Bureau: Storage container holds 12 Micro-USB cords, 3 RCA cables, and 1 proprietary charger for a camera lost in 2007.",
    "category": "Domestic Review"
  },
  {
    "title": "🕶️ Searching for Sunglasses Currently Resting on Head Inquest",
    "memo": "Cognitive Telemetry: Target spent 14 minutes tearing apart vehicle interior searching for shades resting securely atop forehead.",
    "category": "Domestic Review"
  },
  {
    "title": "🛍️ Reusable Grocery Bags Left in Vehicle Trunk During Checkout",
    "memo": "Environmental Audit: 8 canvas totes remained neatly folded in trunk while target purchased 6 plastic bags at cash register.",
    "category": "Domestic Review"
  },
  {
    "title": "🥪 Cutting Sandwich Diagonally vs Vertically Geometric Dispute",
    "memo": "Culinary Geometry: Sourdough sandwich sliced horizontally into rectangles. Structural surface area for crust enjoyment reduced by 40%.",
    "category": "Domestic Review"
  },
  {
    "title": "🚲 Exercise Bike Repurposed as Clothes Hanger Review",
    "memo": "Fitness Asset Audit: Stationary cycle handles currently support 4 hoodies, 2 wet towels, and a winter parka. Zero pedal rotations since 2023.",
    "category": "Domestic Review"
  },
  {
    "title": "🚪 Walking Into Room and Completely Forgetting Purpose of Entry",
    "memo": "Neurological Buffer Reset: Door frame crossed. Objective erased from short-term memory. Target stared at kitchen cabinets for 19 seconds.",
    "category": "Domestic Review"
  },
  {
    "title": "🦝 Raccoon Syndicate Trash Bin Latch Extortion Summit",
    "memo": "Wildlife Directorate: Local masked urban wildlife consortium demands unlatched recycling lid on Tuesday evenings in exchange for porch amnesty.",
    "category": "Domestic Review"
  },
  {
    "title": "🧊 Staring Blankly Into Open Refrigerator for 90 Seconds",
    "memo": "Appliance Telemetry: Ambient cold air dumped onto kitchen floor. Target stared directly at jar of mayonnaise expecting dinner to manifest.",
    "category": "Domestic Review"
  },
  {
    "title": "🧺 Leaving Wet Laundry in Washing Machine Overnight (Mildew Odor Trial)",
    "memo": "Appliance Violation: Damp cotton load fermented for 14 hours in sealed drum. Must re-run entire cycle with extra detergent and personal shame.",
    "category": "Domestic Review"
  },
  {
    "title": "📦 Refusing to Discard Empty Amazon Box Because 'It Is a Great Box'",
    "memo": "Domestic Storage Inquiry: Pristine double-corrugated shipping carton saved behind water heater 'just in case we need to ship something big'.",
    "category": "Domestic Review"
  },
  {
    "title": "🧮 Opening Phone Calculator App to Verify 7 + 8 Just to Be 100% Sure",
    "memo": "Mathematical Trust Audit: Adult human with college degree required digital arithmetic verification before committing to answer.",
    "category": "Domestic Review"
  },
  {
    "title": "🥗 Buying Organic Spinach and Watching It Liquefy in the Crisper Drawer",
    "memo": "Agricultural Telemetry: $6.49 fresh leafy greens converted into dark green slime puddle in crisper drawer over 9 days of neglected good intentions.",
    "category": "Domestic Review"
  },
  {
    "title": "☕ Reheating Coffee Mug in Microwave 3 Times and Forgetting It Every Time",
    "memo": "Chronobiology Audit: Ceramic mug found at 4:45 PM at 71 degrees ambient room temperature inside microwave oven.",
    "category": "Domestic Review"
  },
  {
    "title": "🐧 Wet Towel Forgetting Penguin Shuffle Across Cold Tile Floor",
    "memo": "Kinesthetic Analysis: Shower shut off. Subject realized bath towel is in hallway linen closet. Shivering waddle executed at 0.4 MPH.",
    "category": "Domestic Review"
  },
  {
    "title": "👕 Floor Shirt Sniff Test to Determine 'One More Wear' Eligibility",
    "memo": "Garment Classification Hearing: Cotton tee evaluated with two sharp nasal inhalations near collar. Deemed legally wearable for grocery run.",
    "category": "Domestic Review"
  },
  {
    "title": "🥖 Loaf of Bread Little Plastic Square Clip Struggle Hearing",
    "memo": "Packaging Bureau: Target struggled with colored bread bag clip for 42 seconds before giving up and spinning the plastic bag tightly under itself.",
    "category": "Domestic Review"
  },
  {
    "title": "🛋️ Sitting in Parked Car in Driveway for 22 Minutes Staring Blankly",
    "memo": "Transition Phase Inquest: Engine idling. Headlights illuminating garage door. Target staring at steering wheel decompressing from existence.",
    "category": "Domestic Review"
  },
  {
    "title": "🧴 Reading Ingredients of Conditioner Bottle Out of Sheer Boredom",
    "memo": "Cognitive Activity Telemetry: Optical scan completed on methylchloroisothiazolinone and cetearyl alcohol during shower.",
    "category": "Domestic Review"
  },
  {
    "title": "🧊 Ice Cube Tray Refill Refusal: Leaving One Cracked Fragment",
    "memo": "Freezer Resource Dispute: Single triangular frost shard left in silicone compartment to technically avoid refilling tray under municipal code.",
    "category": "Domestic Review"
  },
  {
    "title": "🕯️ Scented Candle Hoarding: Saving 'Expensive Candle' for Special Occasion",
    "memo": "Aromatherapy Audit: $38 soy wax candle purchased in 2021 remains unlit because no earthly event has met requisite importance threshold.",
    "category": "Domestic Review"
  },
  {
    "title": "🛏️ Fitted Bed Sheet Folding Geometrical Impossibility Inquest",
    "memo": "Topological Crisis: Target attempted fitted sheet fold for 18 seconds before rolling elastic perimeter into lumpy linen boulder.",
    "category": "Domestic Review"
  },
  {
    "title": "🧈 Butter Knife Balancing on Top of Jam Jar Rim Violation",
    "memo": "Sanitary Suspension: Greasy stainless steel knife balanced across rim opening. Catastrophic surface drop onto counter recorded.",
    "category": "Domestic Review"
  },
  {
    "title": "🥣 Pouring Cereal into Bowl Only to Discover 1.5 Ounces of Milk Left",
    "memo": "Breakfast Catastrophe Inquiry: Cap'n Crunch pool moistened by faint cloudy drizzle. Dry cereal ratio deemed non-compliant.",
    "category": "Domestic Review"
  },
  {
    "title": "📱 Carrier Monosyllabic Texting Audit: 'k', 'yeah', 'cool'",
    "memo": "Network Directive: Text reply pattern evaluated. Efficiency rating: 99.8%. Conversational enthusiasm rating: 0.02%. Retraining on docket.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "💤 7:00 AM Consecutive Five-Alarm Snooze Disciplinary Hearing",
    "memo": "Chronobiology Bureau: Alarm snoozed 6 times consecutively across two separate devices. Circadian rhythm permit temporarily suspended.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "📱 Dropping Smartphone Directly Onto Face While Lying in Bed",
    "memo": "Trauma Telemetry: Device slipped from thumb grip at 23:14. Aluminum chassis impacted bridge of nose. Sudden involuntary blink recorded.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "📝 Typing 4-Paragraph Angry Text, Deleting Everything, and Sending 'Ok'",
    "memo": "Emotional Telemetry: 340 characters of righteous fury typed over 7 minutes. Highlighted and backspaced. Single lowercase 'ok' dispatched.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🔋 Lying in Bed at 1% Battery Playing a High-Stakes Game of Chicken",
    "memo": "Power Management: Target refused to reach 14 inches to retrieve bedside charging cord until screen went completely pitch black.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "📱 Smartphone Pinky Finger Structural Strain & Dent Assessment",
    "memo": "Ergonomics Unit: Right pinky finger observed bearing 210 grams of glass and titanium during 4-hour horizontal scrolling session.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🎧 Headphone Sniff Inspection Before Inserting Into Ears",
    "memo": "Sensory Protocol: User inspected silicone earbud tips with cautionary sniff to verify absence of ear canal residue before public insertion.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "📱 Closing Social Media App and Immediately Re-Opening Same App",
    "memo": "Digital Reflex Loop: Instagram terminated via swipe-up. Home screen displayed for 0.4 seconds. Index finger immediately tapped Instagram icon.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "😱 Holding Phone in Hand While Frantically Tearing Room Apart Searching for It",
    "memo": "Panic Telemetry: Subject experienced acute 14-second cardiac acceleration searching for phone while using phone flashlight to search.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🔒 Key Fob Lock Button Pressed 5 Consecutive Times for Horn Honk",
    "memo": "Acoustic Verification: Remote chirp verified lock on press #1. Presses #2 through #5 performed purely for psychological reassurance.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🔐 'New Password Cannot Be the Same as Old Password' Reset Inquest",
    "memo": "Authentication Bureau: User entered password, was told incorrect, hit 'Forgot Password', entered original password, was told it was identical.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "📷 Opening Front-Facing Camera Accidentally at Low Chins Angle",
    "memo": "Optoelectronic Trauma: Camera app launched in selfie mode from chest height. 3 secondary chins captured before immediate screen flip.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "📸 Photographing Whiteboard Slide During Meeting Never to Be Looked at Again",
    "memo": "Digital Archival Directive: 4K photo taken of corporate roadmap diagram. Destined to reside in camera roll among 18,000 unorganized memes.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🛒 Adding $32 of Unnecessary Items to Cart to Avoid $4.99 Shipping Fee",
    "memo": "Fiscal Rationale Audit: Consumer spent $32.40 on artisanal bath salts to successfully circumvent statutory $4.99 parcel transport fee.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🔄 Closing 84 Safari Tabs Only to Instantly Regret 1 Mystery Recipe",
    "memo": "Browser Memory Sweep: 'Close All Tabs' selected. Immediate cold panic set in regarding un-bookmarked 2018 slow-cooker chili recipe.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🔕 Phone Kept on Silent Mode Since 2017: 412 Missed Calls Inquest",
    "memo": "Telecom Telemetry: Physical mute toggle has calcified into 'vibrate' position. Ringtone has not been heard by human ears in 8 fiscal quarters.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🎧 Taking Out One Earbud to Make Sure You Weren't Breathing Too Loudly",
    "memo": "Acoustic Paranoia Review: Noise-canceling headphones removed for 4 seconds in quiet bus to verify respiratory volume compliance.",
    "category": "Telecom Etiquette"
  },
  {
    "title": "🤖 Sentient Roomba Bathmat Tassel Entanglement Hearing",
    "memo": "Distress Bulletin: Unit has intentionally driven into high-pile bathroom rug. Spinning in circles until battery exhaustion. Salvage requested.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "🚨 Smoke Detector 2:14 AM Battery Chirp Readiness Evaluation",
    "memo": "Hardware Diagnostic: Cell voltage is at 96%. Single 115-decibel high-frequency pulse scheduled every 43 seconds to test tenant alertness.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "🖨️ Mandatory Color Extortion: 0.002ml Sacrificial Cyan Required",
    "memo": "Printer Compliance: Document contains 100% black text. However, internal aesthetic policy requires sacrificial yellow and cyan ink.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "📶 3:00 AM Wi-Fi Router Downstream Severance Drill",
    "memo": "Chaos Maintenance: All downstream channels dropped for 19 seconds during critical online activity. Cable power cycling required.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "📺 Leaving Movie Subtitles On For English Speech Hearing",
    "memo": "Audio Compliance: Dialogue volume set to 12. Explosions volume set to 94. Subtitles permanently engaged to discern mumbled dialogue.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "⏱️ Microwave Left With 0:01 Remaining on Digital Timer Tribunal",
    "memo": "Kitchen Telemetry: Digital clock functionality disabled because previous user did not press 'Clear'. The whole kitchen is held hostage.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "🍟 Air Fryer Deep-State Crispiness Discrepancy Investigation",
    "memo": "Culinary Diagnostics: Leftover fries emerged 14% soggier than promised by convective heat vortex marketing claims. Review pending.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "🌡️ Smart Thermostat Remote Temperature War: 68° vs 71° Armistice",
    "memo": "HVAC Telemetry: Temperature changed 9 times in 4 hours from two competing mobile devices. Dual-zone armistice hearing scheduled.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "📑 47 Browser Tabs Open: 'I Will Definitely Read These Later' Commission",
    "memo": "Digital Hoarding Directive: Memory consumption at 94%. Tab titled 'Best Stretches for Posture 2023' has remained unread for 11 months.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "⏱️ Stopping Microwave at 0:01 Like Defusing a C4 Plastic Explosive",
    "memo": "Acoustic Evasion: Finger slammed 'STOP' button at 0:00.9 to prevent the 4 piercing end-cycle beeps from waking the entire residence.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "📺 Smart TV 84-Page Privacy Policy Update Acceptance Inquiry",
    "memo": "Hardware Compliance: User clicked 'Agree to All' without reading single clause regarding microphone telemetry in living room.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "🔌 Phone Cable Bent at 90-Degree Angle Requiring Specific Prop Object",
    "memo": "Hardware Degradation: Lightning cable only conducts electricity when supported by a coffee mug and angled 37 degrees north.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "💡 Smart Lightbulb Disconnected from 2.4GHz Wi-Fi Network Crisis",
    "memo": "Mesh Telemetry: Bedroom lamp has entered un-commanded seizure strobe mode following firmware update 4.1.2.",
    "category": "IoT Disciplinary"
  },
  {
    "title": "🧼 BlenderBottle Biohazard Level 2 Quarantine & Swab Extraction",
    "memo": "Public Health Notice: Organic protein residue left on metal shaker ball has developed independent motor reflexes. Submerge in boiling solvent immediately.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🧼 Emergency Dishwasher Filter Decontamination Drill",
    "memo": "Appliance Notice: Filter mesh contains archaeological food remnants dating back to Q3 2024. Diagnostic sanitize rinse engaged.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🌯 Burrito Structural Integrity Blowout Hearing (Bottom Foil Breach)",
    "memo": "Culinary Failure Review: Tortilla rupture occurred at bite #6. Sour cream and black beans compromised napkin perimeter.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🧼 Dishwasher Pod Dissolution Failure & Slime Residue Hearing",
    "memo": "Appliance Directive: Detergent pod failed to burst. Unmelted gelatinous pouch found fused to coffee mug handle at cycle completion.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🍕 Leaving Unattended Pizza Box on Kitchen Counter for 36 Hours",
    "memo": "Food Safety Directive: 1 cold pepperoni slice preserved at room temperature under cardboard roof. Classified as acceptable breakfast.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🧽 Kitchen Sponge Biological Sentience & Olfactory Review",
    "memo": "Sanitary Audit: Yellow-green cellulose scrubber emits faint swamp odor. Replaced only after achieving biological independence.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🥑 Avocado 14-Minute Ripeness Window Missed Opportunity Hearing",
    "memo": "Agricultural Failure: Specimen transition from rock-hard boulder to brown mush puddle without stopping at palatable guacamole state.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🥫 Mystery Can with Missing Label in Pantry Rear Since 2019",
    "memo": "Archaeological Pantry Sweep: Unlabeled dented tin identified behind crushed tomatoes. Contents suspected to be creamed corn.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🧻 1/4 Square of Toilet Paper Left on Cardboard Roll Refusal",
    "memo": "Restroom Directive: Single perforated ply left dangling to avoid statutory responsibility of installing a fresh roll onto spindle.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🍗 Boneless Wings vs Chicken Nuggets Classification Dispute",
    "memo": "Poultry Integrity Tribunal: Breaded chicken breast chunks analyzed under culinary statutes. Classified as overpriced sauce sponges.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🥣 Spoon Sliding Submerged Into Deep Bowl of Soup Catastrophe",
    "memo": "Fluid Mechanics Inquest: Ceramic spoon slid down bowl incline. Entire handle coated in hot tomato bisque. Sticky fingers recorded.",
    "category": "Sanitary Protocol"
  },
  {
    "title": "🌿 Bermuda Turf Blade Elevation Citation (HOA Rule 4-B)",
    "memo": "HOA Violation: Front lawn turf measured at 2.62 inches (allowable limit: 2.50 inches). Fine assessed. Trash cans placed out 11 minutes early.",
    "category": "Municipal Citation"
  },
  {
    "title": "🚗 Curb Decibel & Exhaust Compliance Sweep (City Code 404)",
    "memo": "Acoustic Enforcement: Neighborhood complaints filed regarding cold-start acoustic vibration. Physical decibel meter test scheduled at curb.",
    "category": "Municipal Citation"
  },
  {
    "title": "🗑️ Recycling Bin Contamination Inquiry (Cardboard Pizza Grease)",
    "memo": "Waste Management Directive: Greasy pizza box placed into clean paper bin. Forensic grease analysis traced to slice #3.",
    "category": "Municipal Citation"
  },
  {
    "title": "🔑 Pocket Car Key Emergency Panic Button Accidental Trigger",
    "memo": "Acoustic Advisory: Key fob pressed against thigh while carrying groceries. Horn honked 8 times before target located fob in pocket.",
    "category": "Municipal Citation"
  },
  {
    "title": "🚗 Gasoline Tank Flap Opened on Wrong Side at Pump Hearing",
    "memo": "Automotive Telemetry: Vehicle pulled into service bay #4. Driver exited, noticed filler door on opposite flank, stared blankly for 8 seconds.",
    "category": "Municipal Citation"
  },
  {
    "title": "📱 Turning Down Car Stereo Volume to 'See Street Signs Better'",
    "memo": "Cognitive Synergy: Bass-heavy audio muted to 0 to assist optical identification of house numbers on dark residential avenue.",
    "category": "Municipal Citation"
  },
  {
    "title": "🚗 Parallel Parking Attempt Aborted: Driving to Another State",
    "memo": "Traffic Maneuver: Reverse gear engaged. Car bumped curb at 2 MPH. Driver immediately drove 4 blocks away to find pull-in spot.",
    "category": "Municipal Citation"
  },
  {
    "title": "💦 Sprinkler Head Aimed 4° Onto Neighbor's Driveway Citation",
    "memo": "HOA Irrigation Enforcement: Zone 3 oscillating nozzle is irrigating 18 square inches of adjacent driveway concrete. Water waste penalty assessed.",
    "category": "Municipal Citation"
  },
  {
    "title": "🗑️ Trash Can Retrieved 38 Minutes After Sunset Inquest",
    "memo": "HOA Covenant 7-D: Curbside receptacle remained visible past astronomical sunset. Streetscape aesthetic harmony compromised.",
    "category": "Municipal Citation"
  },
  {
    "title": "🦩 Decorative Lawn Flamingo Latitude & Longitude Calibration",
    "memo": "HOA Aesthetic Board: Ornamental plastic bird exceeds permissible lawn saturation threshold. Alignment off-true north by 14 degrees.",
    "category": "Municipal Citation"
  },
  {
    "title": "🎐 Unlicensed Windchime Acoustic Resonance Hearing (Section 8-C)",
    "memo": "Zoning Advisory: Aluminum chime frequency detected during peaceful residential hours. Unsanctioned harmonic emissions on wind gust.",
    "category": "Municipal Citation"
  },
  {
    "title": "⚠️ Car Tire Pressure Warning Light Ignored for 6 Consecutive Months",
    "memo": "Automotive Maintenance: Dashboard amber horseshoe icon classified as permanent interior ambient lighting by driver.",
    "category": "Municipal Citation"
  },
  {
    "title": "🚗 Sun Visor Ineffectiveness: Sun Perfectly Shining in 2-Inch Gap",
    "memo": "Optical Geometry Audit: Plastic sun visor lowered. Solar rays entered precisely through the unprotected perimeter gap beside rearview mirror.",
    "category": "Municipal Citation"
  },
  {
    "title": "🛒 Shopping Cart Wheel Wobble & 45-Degree Pull Enforcement",
    "memo": "Transit Mechanics: Front-left cart wheel vibrating uncontrollably while emitting high-pitched shriek down aisle 4.",
    "category": "Municipal Citation"
  },
  {
    "title": "🚗 Speed Trap False Alarm: Tapping Brakes at Empty Roadside Billboard",
    "memo": "Deceleration Telemetry: Vehicle braked from 65 to 48 MPH upon observing a utility maintenance van parked behind shrubbery.",
    "category": "Municipal Citation"
  },
  {
    "title": "🎵 Unsolicited Campfire Wonderwall Acoustic Performance",
    "memo": "Acoustic Notice: Campfire detected. G-chord struck without invitation. 'Anyway, here is Wonderwall for the fourth consecutive gathering.'",
    "category": "Social Oversight"
  },
  {
    "title": "🍿 45-Minute Netflix Menu Browsing Without Watching Inspection",
    "memo": "Streaming Telemetry: 1,400 film trailers previewed. Zero movies initiated. Target fell asleep on couch with remote in palm at 23:42.",
    "category": "Social Oversight"
  },
  {
    "title": "🚪 Pushing Door Clearly Marked 'PULL' Public Dignity Inquest",
    "memo": "Kinesthetic Telemetry: Body weight leaned forward into fixed brass handle. Recoil impact recorded. Quick glance around to check if anyone noticed.",
    "category": "Social Oversight"
  },
  {
    "title": "✈️ Saying 'You Too!' to Flight Attendant Who Said 'Have a Nice Flight'",
    "memo": "Social Etiquette Trauma: Target wished flight crew a safe vacation while crew remained in aircraft galley. 4 hours of internal cringe recorded.",
    "category": "Social Oversight"
  },
  {
    "title": "⌚ Checking Watch for Time, Then Immediately Forgetting What Time It Was",
    "memo": "Cognitive Memory Fault: Wrist rotated, dial observed for 2.1 seconds. Brain recorded zero temporal information. Second check required.",
    "category": "Social Oversight"
  },
  {
    "title": "📱 Pretending to Type Urgently on Phone While Waiting in Public",
    "memo": "Social Defense Telemetry: Rapid thumb movement simulated on home screen to avoid appearing idle while waiting in coffee shop lobby.",
    "category": "Social Oversight"
  },
  {
    "title": "👋 Waving Back at Someone Waving to the Person Directly Behind You",
    "memo": "Public Humiliation Incident: Arm raised in enthusiastic greeting. Eye contact was with stranger 10 feet to the rear. Hand smoothed hair down to save face.",
    "category": "Social Oversight"
  },
  {
    "title": "🛒 Abandoning Shopping Cart in Aisle After Seeing Acquaintance",
    "memo": "Evasive Maneuver: High school classmate spotted near canned goods. Target made sharp 90-degree pivot into greeting cards to avoid small talk.",
    "category": "Social Oversight"
  },
  {
    "title": "🚶 Sidewalk Pedestrian Collision Shuffle: 3 Mutual Dodges to Left & Right",
    "memo": "Kinetic Deadlock: Mutual avoidance vectors synchronized. Both parties mirrored lateral steps before laughing nervously and making eye contact.",
    "category": "Social Oversight"
  },
  {
    "title": "🗣️ Saying 'What?' When You Actually Heard What They Said",
    "memo": "Auditory Processing Delay: Verbal query uttered automatically while neurological buffer was still decoding sound waves from 0.8 seconds ago.",
    "category": "Social Oversight"
  },
  {
    "title": "🛗 Speed-Walking Toward Elevator Then Pretending You Weren't Going That Way",
    "memo": "Social Evasion Protocol: Elevator doors sealed. Subject decelerated gait, feigned interest in exit sign, and turned toward restrooms.",
    "category": "Social Oversight"
  },
  {
    "title": "🤝 Accidental Handshake-Hug Collision Hybrid Incident",
    "memo": "Greeting Telemetry: Party A extended hand; Party B leaned in for embrace. Forearm trapped against collarbone in awkward mutual clasp.",
    "category": "Social Oversight"
  },
  {
    "title": "🍿 Popcorn Bag Rustle Decibel Violation During Silent Movie Scene",
    "memo": "Acoustic Crime: Hand inserted into paper bag during emotional funeral monologue. Decibel output surpassed 84 dB in row G.",
    "category": "Social Oversight"
  },
  {
    "title": "🏃 The Awkward Jog-Walk When Someone Holds Door 45 Feet Away",
    "memo": "Kinetic Obligation: Good Samaritan held glass door from unreasonable distance. Target forced into clumsy half-trot to demonstrate gratitude.",
    "category": "Social Oversight"
  },
  {
    "title": "🍽️ Re-Reading Online Menu for 2 Hours Only to Order the Exact Same Thing",
    "memo": "Culinary Conservatism: 48 entree descriptions analyzed across 3 Yelp tabs. Target ordered standard burger and fries with zero hesitation.",
    "category": "Social Oversight"
  },
  {
    "title": "🤐 Saying 'Excuse Me' to a Mannequin in Clothing Store",
    "memo": "Visual Identification Failure: Head bowed while navigating display rack. Formal apology delivered to fiberglass torso wearing corduroy jacket.",
    "category": "Social Oversight"
  },
  {
    "title": "🐟 Reheating Salmon in Breakroom Microwave Disciplinary Hearing",
    "memo": "Corporate Facilities Notice: Seafood thermal event detected on 4th floor. Entire ventilation shaft compromised for 6 business hours.",
    "category": "Corporate Audit"
  },
  {
    "title": "📧 Unsolicited Reply-All 'Thanks!' Email Chain Investigation",
    "memo": "IT Governance: Company-wide distribution list burdened with 14 unnecessary 'Thank you!' acknowledgments. Productivity loss calculated at $42,000.",
    "category": "Corporate Audit"
  },
  {
    "title": "📷 Camera-Off 'Bandwidth Issues' During 9:00 AM All-Hands Audit",
    "memo": "Corporate HR Review: Avatar displayed while microphone was muted. Keystroke telemetry indicates target was simultaneously frying bacon.",
    "category": "Corporate Audit"
  },
  {
    "title": "💬 Passive-Aggressive 'Per My Last Email' Decibel Calibration",
    "memo": "Workplace Civility Bureau: Communication measured at maximum corporate hostility. Document attachments were already highlighted in yellow.",
    "category": "Corporate Audit"
  },
  {
    "title": "🛗 Staring at Closed Elevator Doors After Forgetting to Press Floor Button",
    "memo": "Vertical Transit Telemetry: Car remained stationary at lobby level for 45 seconds while passengers admired each other's shoes in silence.",
    "category": "Corporate Audit"
  },
  {
    "title": "📊 Re-Reading the Email You Just Sent 4 Times to Admire How Good It Was",
    "memo": "Narcissism Telemetry: Sent mail folder opened immediately following transmission. Prose evaluated for professional tone and sharp bullet points.",
    "category": "Corporate Audit"
  },
  {
    "title": "🔇 'You're on Mute' Spoken by 5 People Simultaneously in Zoom Meeting",
    "memo": "Teleconference Resonance: Target spoke passionately for 45 seconds while red microphone slash icon remained stubbornly illuminated.",
    "category": "Corporate Audit"
  },
  {
    "title": "☕ Staring at Office Coffee Machine While It Drips at 0.01ml Per Minute",
    "memo": "Workplace Idleness Telemetry: Target leaned against breakroom laminate counter for 4.2 minutes waiting for commercial Keurig pump cycle.",
    "category": "Corporate Audit"
  },
  {
    "title": "🗓️ Friday 4:45 PM 'Quick Sync?' Calendar Invite Infraction",
    "memo": "Workplace Hostility Investigation: Unsolicited 15-minute sync dropped onto calendar 15 minutes before weekend departure window.",
    "category": "Corporate Audit"
  },
  {
    "title": "📎 'Please Find Attached' Sent With Zero Attachments Audit",
    "memo": "Correspondence Defect: Email body promised quarterly analysis spreadsheet. Zero files uploaded. Follow-up email sent 12 seconds later.",
    "category": "Corporate Audit"
  },
  {
    "title": "💼 Nodding Vigorously in Meeting Without Understanding Single Acronym",
    "memo": "Executive Posturing: Target nodded 14 times during presentation discussing Q3 OKRs, KPIs, ARR, and EBITDA without internal comprehension.",
    "category": "Corporate Audit"
  },
  {
    "title": "📊 Q1 Unreconciled Fast Food Debt Hearing ($20.00 + $4.12 Fees)",
    "memo": "Accounting Directive: Unsettled 2024 late-night drive-thru transaction has accrued statutory delinquency penalties. Formal settlement hearing.",
    "category": "Financial Audit"
  },
  {
    "title": "⚖️ County Tax Assessor Inquiry into Excessive Tupperware",
    "memo": "Asset Review: Mismatched plastic food storage lids classified as taxable industrial inventory under County Code Section 12-A.",
    "category": "Financial Audit"
  },
  {
    "title": "🔍 Optical Sensor Alignment: Maintain Blinds at Mandated 45° Angle",
    "memo": "Surveillance Directive 802: Second-floor blinds must be held at exactly 45 degrees. Satellite optical telemetry requires clean line of sight.",
    "category": "Surveillance Directive"
  },
  {
    "title": "🐦 Avian Drone Perch Maintenance (CIA Operative Pigeon 42)",
    "memo": "Avian Telemetry: Breadcrumb ingestion protocol complete. Aerial perch established on overhead utility wire. Do not make direct eye contact.",
    "category": "Surveillance Directive"
  },
  {
    "title": "🎙️ Living Room Acoustic Sound Check (NSA Domestic Audio Div)",
    "memo": "Audio Calibration: Room reverberation tested. Please articulate slightly clearer when voicing private complaints to the household pet.",
    "category": "Surveillance Directive"
  },
  {
    "title": "💳 Uncancelled Gym Membership 48-Month Inactivity Milestone",
    "memo": "Subscription Bureau: $29.99 billed monthly since October 2021. Facility barcode has never breached physical turnstile sensor.",
    "category": "Financial Audit"
  },
  {
    "title": "🪙 Cupholder Coin Hoard Valuation & Metal Scarcity Sweep",
    "memo": "Currency Reserves: 4 sticky nickels, 1 dried mint, and a corroded 1998 quarter assessed in center console armrest.",
    "category": "Financial Audit"
  },
  {
    "title": "🚐 Unmarked White Utility Van Prolonged Stationary Presence Review",
    "memo": "Federal Logistics: Unmarked Ford Transit van parked outside across street for 6 consecutive hours. Tinted windows remain impassive.",
    "category": "Surveillance Directive"
  },
  {
    "title": "📡 Microwave Radiation Directional Calibration Sweep",
    "memo": "Signal Intelligence: Residential magnetron frequency checked against regional radar towers. Please do not obstruct microwave door.",
    "category": "Surveillance Directive"
  }
];
