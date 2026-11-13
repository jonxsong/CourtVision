const MAIN_SITE_ORIGIN = "https://courtvision-analytics.perkyaisle4.chatgpt.site";
const ALLOWED_ORIGINS = new Set([MAIN_SITE_ORIGIN, "http://localhost:3000"]);
const PROVIDER_ORIGIN = "https://api.balldontlie.io";
const CACHE_SECONDS = 60;

let inFlight = null;
let lastGood = null;
let lastGoodAt = 0;

function easternDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function gameStatus(game) {
  if (game.postponed) return "postponed";
  const state = String(game.status_state ?? game.status ?? "").toLowerCase();
  if (["final", "closed"].includes(state)) return "final";
  if (["inprogress", "in_progress", "live", "halftime"].includes(state) || state.includes("qtr")) return "live";
  return "scheduled";
}

function team(value = {}) {
  return {
    id: String(value.id ?? "unknown"),
    abbreviation: String(value.abbreviation ?? "—"),
    city: String(value.city ?? ""),
    name: String(value.name ?? value.full_name ?? "Unknown"),
  };
}

function normalizeGame(game) {
  const home = team(game.home_team);
  const away = team(game.visitor_team);
  const status = gameStatus(game);
  return {
    id: String(game.id ?? "unknown"),
    tipoffAt: String(game.datetime ?? game.date ?? ""),
    status,
    home: { team: home, score: Number(game.home_team_score ?? 0), record: "—" },
    away: { team: away, score: Number(game.visitor_team_score ?? 0), record: "—" },
    venue: String(game.venue ?? "Venue unavailable"),
    headline: `${away.abbreviation} at ${home.abbreviation} · ${String(game.status ?? status)}`,
    isDemo: false,
  };
}

function responseHeaders(origin = MAIN_SITE_ORIGIN) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "cache-control": `public, max-age=30, s-maxage=${CACHE_SECONDS}, stale-if-error=300`,
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function json(payload, status = 200, origin = MAIN_SITE_ORIGIN) {
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders(origin) });
}

async function fetchProvider(apiKey, now = new Date()) {
  const gameDate = easternDate(now);
  const url = new URL("/v1/games", PROVIDER_ORIGIN);
  url.searchParams.set("dates[]", gameDate);
  url.searchParams.set("per_page", "25");
  const response = await fetch(url, {
    headers: { Authorization: apiKey, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  const body = await response.json();
  const games = Array.isArray(body.data) ? body.data.map(normalizeGame) : [];
  return {
    provider: "balldontlie",
    fetchedAt: now.toISOString(),
    gameDate,
    cacheSeconds: CACHE_SECONDS,
    games,
  };
}

async function liveGames(env, ctx, origin) {
  void ctx;
  if (lastGood && Date.now() - lastGoodAt < CACHE_SECONDS * 1000) return json(lastGood, 200, origin);
  if (!env.COURTVISION_BALLDONTLIE_API_KEY) {
    return json({ error: "Live provider is not configured" }, 503, origin);
  }

  if (!inFlight) {
    inFlight = fetchProvider(env.COURTVISION_BALLDONTLIE_API_KEY)
      .then((payload) => {
        lastGood = payload;
        lastGoodAt = Date.now();
        return payload;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  try {
    return json(await inFlight, 200, origin);
  } catch {
    if (lastGood) return json({ ...lastGood, stale: true }, 200, origin);
    return json({ error: "Live scores are temporarily unavailable" }, 503, origin);
  }
}

export { easternDate, gameStatus, normalizeGame };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "Origin is not allowed" }, 403, "null");
    }
    const responseOrigin = origin ?? MAIN_SITE_ORIGIN;
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(responseOrigin) });
    }
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, responseOrigin);
    if (url.pathname === "/health") {
      return json({ status: "ok", service: "courtvision-live-data", configured: Boolean(env.COURTVISION_BALLDONTLIE_API_KEY) }, 200, responseOrigin);
    }
    if (url.pathname === "/api/games") return liveGames(env, ctx, responseOrigin);
    return json({ error: "Not found" }, 404, responseOrigin);
  },
};
