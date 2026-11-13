import { BUNDLED_PLAYERS } from "./nba-snapshot.js";

const MAIN_SITE_ORIGIN = "https://courtvision-analytics.perkyaisle4.chatgpt.site";
const ALLOWED_ORIGINS = new Set([MAIN_SITE_ORIGIN, "http://localhost:3000"]);
const PROVIDER_ORIGIN = "https://api.balldontlie.io";
const NBA_STATS_ORIGIN = "https://stats.nba.com";
const OPENAI_ORIGIN = "https://api.openai.com";
const GAMES_CACHE_SECONDS = 60;
const NBA_CACHE_SECONDS = 15 * 60;
const ASK_MODEL = "gpt-6-luna";
const ASK_MAX_ROUNDS = 4;
const ASK_RATE_WINDOW_MS = 60_000;
const ASK_RATE_LIMIT = 6;

const gamesCache = { inFlight: null, value: null, updatedAt: 0 };
const playersCache = { inFlight: null, value: null, updatedAt: 0 };
const shotsCache = new Map();
const askRateBuckets = new Map();

const NBA_HEADERS = {
  Accept: "application/json",
  Origin: "https://www.nba.com",
  Referer: "https://www.nba.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

function currentSeason(now = new Date()) {
  const year = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 9 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function rows(resultSet) {
  const headers = resultSet?.headers ?? [];
  return (resultSet?.rowSet ?? []).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function nbaResultSet(payload) {
  return payload?.resultSets?.[0] ?? payload?.resultSet?.[0] ?? payload?.resultSet;
}

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

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePlayer(indexRow, baseRow = {}, advancedRow = {}, season = currentSeason()) {
  const name = `${indexRow.PLAYER_FIRST_NAME ?? ""} ${indexRow.PLAYER_LAST_NAME ?? ""}`.trim() || String(baseRow.PLAYER_NAME ?? "Unknown player");
  return {
    id: String(indexRow.PERSON_ID ?? baseRow.PLAYER_ID),
    slug: String(indexRow.PLAYER_SLUG ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")),
    name,
    initials: initials(name),
    position: String(indexRow.POSITION || "—"),
    number: String(indexRow.JERSEY_NUMBER || "—"),
    team: {
      id: String(indexRow.TEAM_ID ?? baseRow.TEAM_ID ?? "0"),
      abbreviation: String(indexRow.TEAM_ABBREVIATION ?? baseRow.TEAM_ABBREVIATION ?? "FA"),
      city: String(indexRow.TEAM_CITY ?? "Free agent"),
      name: String(indexRow.TEAM_NAME ?? "Unassigned"),
    },
    active: number(indexRow.ROSTER_STATUS) === 1,
    season,
    bio: {
      height: String(indexRow.HEIGHT || "Unavailable"),
      weight: indexRow.WEIGHT ? `${indexRow.WEIGHT} lb` : "Unavailable",
      country: String(indexRow.COUNTRY || "Unavailable"),
      college: String(indexRow.COLLEGE || "Unavailable"),
      draft: indexRow.DRAFT_YEAR ? `${indexRow.DRAFT_YEAR} · Round ${indexRow.DRAFT_ROUND || "—"} · Pick ${indexRow.DRAFT_NUMBER || "—"}` : "Undrafted",
    },
    stats: {
      gamesPlayed: number(baseRow.GP),
      minutes: number(baseRow.MIN),
      points: number(baseRow.PTS),
      rebounds: number(baseRow.REB),
      assists: number(baseRow.AST),
      steals: number(baseRow.STL),
      blocks: number(baseRow.BLK),
      turnovers: number(baseRow.TOV),
      fieldGoalPct: number(baseRow.FG_PCT),
      threePointPct: number(baseRow.FG3_PCT),
      freeThrowPct: number(baseRow.FT_PCT),
      plusMinus: number(baseRow.PLUS_MINUS),
      trueShootingPct: nullableNumber(advancedRow.TS_PCT),
      effectiveFieldGoalPct: nullableNumber(advancedRow.EFG_PCT),
      usagePct: nullableNumber(advancedRow.USG_PCT),
      assistPct: nullableNumber(advancedRow.AST_PCT),
      reboundPct: nullableNumber(advancedRow.REB_PCT),
      netRating: nullableNumber(advancedRow.NET_RATING ?? advancedRow.E_NET_RATING),
      offensiveRating: nullableNumber(advancedRow.OFF_RATING ?? advancedRow.E_OFF_RATING),
      defensiveRating: nullableNumber(advancedRow.DEF_RATING ?? advancedRow.E_DEF_RATING),
      pace: nullableNumber(advancedRow.PACE ?? advancedRow.E_PACE),
      pie: nullableNumber(advancedRow.PIE),
    },
  };
}

function shotZone(row) {
  const zone = String(row.SHOT_ZONE_BASIC ?? "Unknown");
  if (zone === "Restricted Area") return "Rim";
  if (zone.includes("Paint")) return "Paint";
  if (zone === "Mid-Range") return "Mid-range";
  if (zone.includes("3") || String(row.SHOT_TYPE).includes("3PT")) return "Three";
  if (zone === "Backcourt") return "Backcourt";
  return zone;
}

function normalizeShot(row) {
  return {
    id: `${row.GAME_ID}-${row.GAME_EVENT_ID}`,
    gameId: String(row.GAME_ID),
    playerId: String(row.PLAYER_ID),
    playerName: String(row.PLAYER_NAME),
    x: number(row.LOC_X) / 10,
    y: number(row.LOC_Y) / 10 + 2.5,
    distance: number(row.SHOT_DISTANCE),
    made: number(row.SHOT_MADE_FLAG) === 1,
    points: String(row.SHOT_TYPE).includes("3PT") ? 3 : 2,
    zone: shotZone(row),
    action: String(row.ACTION_TYPE ?? "Shot"),
    period: number(row.PERIOD),
    clock: `${number(row.MINUTES_REMAINING)}:${String(number(row.SECONDS_REMAINING)).padStart(2, "0")}`,
    gameDate: String(row.GAME_DATE ?? ""),
  };
}

function responseHeaders(origin = MAIN_SITE_ORIGIN, cacheSeconds = GAMES_CACHE_SECONDS) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "cache-control": `public, max-age=30, s-maxage=${cacheSeconds}, stale-if-error=900`,
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function privateJson(payload, status = 200, origin = MAIN_SITE_ORIGIN) {
  const headers = responseHeaders(origin, 0);
  headers["cache-control"] = "no-store";
  return new Response(JSON.stringify(payload), { status, headers });
}

function allowAskRequest(request, now = Date.now()) {
  const client = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const current = askRateBuckets.get(client);
  if (!current || now - current.startedAt >= ASK_RATE_WINDOW_MS) {
    askRateBuckets.set(client, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  if (askRateBuckets.size > 2_000) {
    for (const [key, bucket] of askRateBuckets) {
      if (now - bucket.startedAt >= ASK_RATE_WINDOW_MS) askRateBuckets.delete(key);
    }
  }
  return current.count <= ASK_RATE_LIMIT;
}

function json(payload, status = 200, origin = MAIN_SITE_ORIGIN, cacheSeconds = GAMES_CACHE_SECONDS) {
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders(origin, cacheSeconds) });
}

function statusPage(origin = MAIN_SITE_ORIGIN) {
  const headers = responseHeaders(origin);
  headers["content-type"] = "text/html; charset=utf-8";
  headers["cache-control"] = "public, max-age=300, s-maxage=300";
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CourtVision Live Data</title>
  <meta name="description" content="Operational status and public endpoints for CourtVision's live NBA score service.">
  <style>
    :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#07121c;color:#f1eee7}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 80% 10%,#123748 0,transparent 38%),#07121c}
    main{width:min(760px,100%);border:1px solid #294355;background:#0b1824;padding:clamp(28px,6vw,64px);box-shadow:0 28px 90px #02070b99}
    .eyebrow{color:#43d7e8;font:700 11px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.status{display:inline-flex;align-items:center;gap:10px;margin:28px 0 10px;color:#9fe8ba;font:700 12px ui-monospace,monospace;text-transform:uppercase}.status i{width:8px;height:8px;border-radius:50%;background:#66c78f;box-shadow:0 0 0 5px #66c78f18}
    h1{font:400 clamp(42px,8vw,76px)/.94 Georgia,serif;letter-spacing:-.045em;margin:18px 0}p{color:#9eb0bd;line-height:1.7;max-width:590px}nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:34px}a{color:inherit;text-decoration:none;border:1px solid #294355;padding:16px;transition:.2s}a:hover,a:focus-visible{border-color:#43d7e8;color:#43d7e8;outline:none}a strong{display:block;font-size:13px}a span{display:block;color:#8297a6;font:10px/1.5 ui-monospace,monospace;margin-top:5px}@media(max-width:560px){nav{grid-template-columns:1fr}}
  </style>
</head>
<body><main>
  <div class="eyebrow">CourtVision · Data service</div>
  <div class="status"><i></i>Service online</div>
  <h1>Live NBA scores,<br>served securely.</h1>
  <p>This server-side service keeps the provider credential out of the browser, normalizes the current slate, and returns a cached last-known-good response during upstream errors.</p>
  <nav>
    <a href="/api/games"><strong>Live games</strong><span>GET /api/games</span></a>
    <a href="/api/players"><strong>Real NBA players</strong><span>GET /api/players</span></a>
    <a href="/health"><strong>Service health</strong><span>GET /health</span></a>
    <a href="${MAIN_SITE_ORIGIN}/games"><strong>Open CourtVision</strong><span>View the public scoreboard</span></a>
    <a href="${MAIN_SITE_ORIGIN}/operations"><strong>Data operations</strong><span>Architecture and provenance</span></a>
  </nav>
</main></body></html>`, { status: 200, headers });
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
    cacheSeconds: GAMES_CACHE_SECONDS,
    games,
  };
}

async function liveGames(env, ctx, origin) {
  void ctx;
  if (gamesCache.value && Date.now() - gamesCache.updatedAt < GAMES_CACHE_SECONDS * 1000) return json(gamesCache.value, 200, origin);
  if (!env.COURTVISION_BALLDONTLIE_API_KEY) {
    return json({ error: "Live provider is not configured" }, 503, origin);
  }

  if (!gamesCache.inFlight) {
    gamesCache.inFlight = fetchProvider(env.COURTVISION_BALLDONTLIE_API_KEY)
      .then((payload) => {
        gamesCache.value = payload;
        gamesCache.updatedAt = Date.now();
        return payload;
      })
      .finally(() => {
        gamesCache.inFlight = null;
      });
  }

  try {
    return json(await gamesCache.inFlight, 200, origin);
  } catch {
    if (gamesCache.value) return json({ ...gamesCache.value, stale: true }, 200, origin);
    return json({ error: "Live scores are temporarily unavailable" }, 503, origin);
  }
}

function leagueDashParams(season, measureType) {
  return {
    College: "", Conference: "", Country: "", DateFrom: "", DateTo: "", Division: "", DraftPick: "", DraftYear: "",
    GameScope: "", GameSegment: "", Height: "", LastNGames: "0", LeagueID: "00", Location: "", MeasureType: measureType,
    Month: "0", OpponentTeamID: "0", Outcome: "", PORound: "0", PaceAdjust: "N", PerMode: "PerGame", Period: "0",
    PlayerExperience: "", PlayerPosition: "", PlusMinus: "N", Rank: "N", Season: season, SeasonSegment: "",
    SeasonType: "Regular Season", ShotClockRange: "", StarterBench: "", TeamID: "0", VsConference: "", VsDivision: "", Weight: "",
  };
}

async function fetchNba(path, params) {
  const url = new URL(path, NBA_STATS_ORIGIN);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: NBA_HEADERS, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`NBA Stats returned ${response.status}`);
  return response.json();
}

async function fetchPlayers(now = new Date()) {
  const season = currentSeason(now);
  const indexParams = {
    College: "", Country: "", DraftPick: "", DraftRound: "", DraftYear: "", Height: "", Historical: "0",
    LeagueID: "00", Season: season, SeasonType: "Regular Season", TeamID: "0", Weight: "",
  };
  // NBA Stats intermittently stalls simultaneous requests from the same client.
  // Keep these calls sequential; the response is cached for 15 minutes.
  const indexPayload = await fetchNba("/stats/playerindex", indexParams);
  const basePayload = await fetchNba("/stats/leaguedashplayerstats", leagueDashParams(season, "Base"));
  const advancedPayload = await fetchNba("/stats/leaguedashplayerstats", leagueDashParams(season, "Advanced")).catch(() => null);
  const baseById = new Map(rows(nbaResultSet(basePayload)).map((row) => [String(row.PLAYER_ID), row]));
  const advancedById = new Map(rows(nbaResultSet(advancedPayload)).map((row) => [String(row.PLAYER_ID), row]));
  const players = rows(nbaResultSet(indexPayload))
    .filter((row) => number(row.ROSTER_STATUS) === 1)
    .map((row) => normalizePlayer(row, baseById.get(String(row.PERSON_ID)), advancedById.get(String(row.PERSON_ID)), season))
    .sort((left, right) => right.stats.points - left.stats.points || left.name.localeCompare(right.name));
  return { provider: "nba_stats", fetchedAt: now.toISOString(), season, cacheSeconds: NBA_CACHE_SECONDS, players };
}

async function livePlayers(origin) {
  if (playersCache.value && Date.now() - playersCache.updatedAt < NBA_CACHE_SECONDS * 1000) {
    return json(playersCache.value, 200, origin, NBA_CACHE_SECONDS);
  }
  if (!playersCache.inFlight) {
    playersCache.inFlight = fetchPlayers().then((payload) => {
      playersCache.value = payload;
      playersCache.updatedAt = Date.now();
      return payload;
    }).finally(() => { playersCache.inFlight = null; });
  }
  try {
    return json(await playersCache.inFlight, 200, origin, NBA_CACHE_SECONDS);
  } catch {
    if (playersCache.value) return json({ ...playersCache.value, stale: true }, 200, origin, NBA_CACHE_SECONDS);
    if (BUNDLED_PLAYERS.players.length) return json({ ...BUNDLED_PLAYERS, stale: true, snapshot: true }, 200, origin, NBA_CACHE_SECONDS);
    return json({ error: "NBA player data is temporarily unavailable" }, 503, origin, 30);
  }
}

function shotChartParams(playerId, season) {
  return {
    AheadBehind: "", CFID: "", CFPARAMS: "", ClutchTime: "", ContextFilter: "", ContextMeasure: "FGA",
    DateFrom: "", DateTo: "", EndPeriod: "10", EndRange: "28800", GameID: "", GameSegment: "", LastNGames: "0",
    LeagueID: "00", Location: "", Month: "0", OpponentTeamID: "0", Outcome: "", Period: "0", PlayerID: playerId,
    PlayerPosition: "", PointDiff: "", Position: "", RangeType: "0", RookieYear: "", Season: season, SeasonSegment: "",
    SeasonType: "Regular Season", StartPeriod: "1", StartRange: "0", StarterBench: "", TeamID: "0", VsConference: "", VsDivision: "",
  };
}

async function fetchShots(playerId, season, now = new Date()) {
  const payload = await fetchNba("/stats/shotchartdetail", shotChartParams(playerId, season));
  const shots = rows(nbaResultSet(payload)).map(normalizeShot);
  return { provider: "nba_stats", fetchedAt: now.toISOString(), season, playerId, cacheSeconds: NBA_CACHE_SECONDS, shots };
}

async function liveShots(url, origin) {
  const playerId = url.searchParams.get("player_id") ?? "";
  const season = url.searchParams.get("season") ?? currentSeason();
  if (!/^\d+$/.test(playerId)) return json({ error: "A numeric player_id is required" }, 400, origin, 30);
  if (!/^\d{4}-\d{2}$/.test(season)) return json({ error: "season must use YYYY-YY format" }, 400, origin, 30);
  const key = `${playerId}:${season}`;
  const cached = shotsCache.get(key) ?? { inFlight: null, value: null, updatedAt: 0 };
  shotsCache.set(key, cached);
  if (cached.value && Date.now() - cached.updatedAt < NBA_CACHE_SECONDS * 1000) return json(cached.value, 200, origin, NBA_CACHE_SECONDS);
  if (!cached.inFlight) {
    cached.inFlight = fetchShots(playerId, season).then((payload) => {
      cached.value = payload;
      cached.updatedAt = Date.now();
      return payload;
    }).finally(() => { cached.inFlight = null; });
  }
  try {
    return json(await cached.inFlight, 200, origin, NBA_CACHE_SECONDS);
  } catch {
    if (cached.value) return json({ ...cached.value, stale: true }, 200, origin, NBA_CACHE_SECONDS);
    return json({ error: "NBA shot data is temporarily unavailable" }, 503, origin, 30);
  }
}

function normalizedSearch(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function findPlayer(value) {
  const needle = normalizedSearch(value);
  if (!needle) return null;
  return BUNDLED_PLAYERS.players.find((player) => String(player.id) === needle)
    ?? BUNDLED_PLAYERS.players.find((player) => normalizedSearch(player.name) === needle)
    ?? BUNDLED_PLAYERS.players.find((player) => normalizedSearch(player.name).includes(needle))
    ?? null;
}

function playerFact(player) {
  if (!player) return null;
  return {
    source: "NBA Stats",
    season: player.season,
    id: player.id,
    name: player.name,
    position: player.position,
    number: player.number,
    team: player.team,
    gamesPlayed: player.stats.gamesPlayed,
    stats: player.stats,
  };
}

function searchPlayerFacts(query, limit = 8) {
  const needle = normalizedSearch(query);
  const matches = BUNDLED_PLAYERS.players.filter((player) => {
    const haystack = normalizedSearch(`${player.name} ${player.team.city} ${player.team.name} ${player.team.abbreviation}`);
    return !needle || haystack.includes(needle);
  });
  return {
    source: "NBA Stats",
    season: BUNDLED_PLAYERS.season,
    matches: matches.slice(0, Math.min(Math.max(Number(limit) || 8, 1), 15)).map(playerFact),
  };
}

const LEADER_METRICS = {
  points: "points",
  rebounds: "rebounds",
  assists: "assists",
  steals: "steals",
  blocks: "blocks",
  true_shooting: "trueShootingPct",
  net_rating: "netRating",
};

function leagueLeaders(metric, limit = 10) {
  const key = LEADER_METRICS[metric];
  if (!key) return { error: "Unsupported metric" };
  const leaders = BUNDLED_PLAYERS.players
    .filter((player) => Number.isFinite(player.stats[key]))
    .toSorted((left, right) => Number(right.stats[key]) - Number(left.stats[key]))
    .slice(0, Math.min(Math.max(Number(limit) || 10, 1), 15))
    .map((player, index) => ({ rank: index + 1, ...playerFact(player), value: player.stats[key], metric }));
  return { source: "NBA Stats", season: BUNDLED_PLAYERS.season, metric, leaders };
}

async function gameFacts(env) {
  try {
    const payload = gamesCache.value ?? await fetchProvider(env.COURTVISION_BALLDONTLIE_API_KEY);
    return { source: "BALLDONTLIE", fetchedAt: payload.fetchedAt, gameDate: payload.gameDate, games: payload.games };
  } catch {
    return { source: "BALLDONTLIE", unavailable: true, message: "The live game slate is temporarily unavailable." };
  }
}

async function shotProfile(value) {
  const player = findPlayer(value);
  if (!player) return { error: "Player not found" };
  try {
    const response = await fetch(`${MAIN_SITE_ORIGIN}/data/shots/${encodeURIComponent(player.id)}.json`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Shot snapshot unavailable");
    const payload = await response.json();
    const zones = {};
    for (const shot of payload.shots ?? []) {
      const zone = String(shot.zone ?? "Unknown");
      zones[zone] ??= { attempts: 0, makes: 0 };
      zones[zone].attempts += 1;
      if (shot.made) zones[zone].makes += 1;
    }
    return {
      source: "NBA Stats shot chart",
      season: payload.season,
      player: playerFact(player),
      attempts: payload.shots?.length ?? 0,
      zones: Object.entries(zones).map(([zone, totals]) => ({
        zone,
        attempts: totals.attempts,
        makes: totals.makes,
        fieldGoalPct: totals.attempts ? totals.makes / totals.attempts : null,
      })),
    };
  } catch {
    return { source: "NBA Stats shot chart", player: playerFact(player), unavailable: true };
  }
}

const ASK_TOOLS = [
  {
    type: "function", name: "search_players",
    description: "Search active NBA players by player name, team name, city, or abbreviation.",
    strict: true,
    parameters: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 15 } },
      required: ["query", "limit"], additionalProperties: false,
    },
  },
  {
    type: "function", name: "get_player",
    description: "Get a current-season NBA player profile and base/advanced statistics by name or ID.",
    strict: true,
    parameters: {
      type: "object", properties: { player: { type: "string" } }, required: ["player"], additionalProperties: false,
    },
  },
  {
    type: "function", name: "compare_players",
    description: "Compare two current NBA players using the same current-season statistical fields.",
    strict: true,
    parameters: {
      type: "object",
      properties: { player_a: { type: "string" }, player_b: { type: "string" } },
      required: ["player_a", "player_b"], additionalProperties: false,
    },
  },
  {
    type: "function", name: "get_league_leaders",
    description: "Rank current NBA players for a supported metric.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string", enum: Object.keys(LEADER_METRICS) },
        limit: { type: "integer", minimum: 1, maximum: 15 },
      },
      required: ["metric", "limit"], additionalProperties: false,
    },
  },
  {
    type: "function", name: "get_games",
    description: "Get the current NBA game slate, scores, statuses, and tipoff times.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function", name: "get_shot_profile",
    description: "Get a real current-season shot-zone profile for an NBA player.",
    strict: true,
    parameters: {
      type: "object", properties: { player: { type: "string" } }, required: ["player"], additionalProperties: false,
    },
  },
];

async function executeAskTool(name, args, env) {
  if (name === "search_players") return searchPlayerFacts(args.query, args.limit);
  if (name === "get_player") return playerFact(findPlayer(args.player)) ?? { error: "Player not found" };
  if (name === "compare_players") {
    return {
      source: "NBA Stats", season: BUNDLED_PLAYERS.season,
      players: [playerFact(findPlayer(args.player_a)), playerFact(findPlayer(args.player_b))].filter(Boolean),
    };
  }
  if (name === "get_league_leaders") return leagueLeaders(args.metric, args.limit);
  if (name === "get_games") return gameFacts(env);
  if (name === "get_shot_profile") return shotProfile(args.player);
  return { error: `Unknown tool: ${name}` };
}

function openAIText(response) {
  return (response.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

async function openAIResponse(apiKey, body) {
  const response = await fetch(`${OPENAI_ORIGIN}/v1/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code = payload?.error?.code ?? payload?.error?.type ?? "openai_error";
    throw new Error(`${code}:${response.status}`);
  }
  return response.json();
}

function safeConversation(history, question) {
  const messages = Array.isArray(history) ? history.slice(-8) : [];
  const clean = messages
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message?.content === "string")
    .map((message) => ({ role: message.role, content: message.content.slice(0, 2_000) }));
  clean.push({ role: "user", content: question });
  return clean;
}

async function askCourtVision(request, env, origin) {
  if (!env.COURTVISION_OPENAI_API_KEY) return privateJson({ error: "Ask CV is not configured" }, 503, origin);
  let input;
  try {
    input = await request.json();
  } catch {
    return privateJson({ error: "A JSON request body is required" }, 400, origin);
  }
  const question = String(input?.question ?? "").trim();
  if (question.length < 2 || question.length > 500) {
    return privateJson({ error: "Question must contain 2 to 500 characters" }, 400, origin);
  }

  const usedSources = new Set();
  const instructions = `You are Ask CV, CourtVision's concise NBA research assistant. Current date: ${new Date().toISOString().slice(0, 10)}. Use the supplied tools for every claim about current players, rankings, games, or shot profiles. Never invent a statistic, result, injury, transaction, or unavailable field. Distinguish facts from interpretation. Cite retrieved current facts inline with [NBA Stats], [NBA Stats shot chart], or [BALLDONTLIE]. You may explain stable basketball concepts from general knowledge, but say when a historical or current fact is outside CourtVision's available data. Prefer a direct answer followed by compact supporting bullets when useful.`;
  let body = {
    model: env.COURTVISION_OPENAI_MODEL || ASK_MODEL,
    instructions,
    input: safeConversation(input?.history, question),
    tools: ASK_TOOLS,
    parallel_tool_calls: false,
    max_output_tokens: 800,
  };

  try {
    for (let round = 0; round < ASK_MAX_ROUNDS; round += 1) {
      const response = await openAIResponse(env.COURTVISION_OPENAI_API_KEY, body);
      const calls = (response.output ?? []).filter((item) => item.type === "function_call");
      if (!calls.length) {
        const answer = openAIText(response);
        if (!answer) throw new Error("empty_response:502");
        return privateJson({
          answer,
          model: response.model ?? body.model,
          sources: [...usedSources],
          season: BUNDLED_PLAYERS.season,
        }, 200, origin);
      }
      const outputs = [];
      for (const call of calls) {
        let args = {};
        try { args = JSON.parse(call.arguments || "{}"); } catch { args = {}; }
        const result = await executeAskTool(call.name, args, env);
        if (result?.source) usedSources.add(result.source);
        outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      }
      body = {
        model: env.COURTVISION_OPENAI_MODEL || ASK_MODEL,
        instructions,
        previous_response_id: response.id,
        input: outputs,
        tools: ASK_TOOLS,
        parallel_tool_calls: false,
        max_output_tokens: 800,
      };
    }
    throw new Error("tool_round_limit:502");
  } catch (error) {
    const [code, statusText] = String(error?.message ?? "openai_error:502").split(":");
    const upstreamStatus = Number(statusText);
    const status = upstreamStatus === 429 ? 429 : upstreamStatus === 401 ? 503 : 502;
    const message = upstreamStatus === 429
      ? "Ask CV has reached its current API usage limit."
      : "Ask CV could not complete that answer right now.";
    return privateJson({ error: message, code }, status, origin);
  }
}

function resetCachesForTest() {
  gamesCache.inFlight = null; gamesCache.value = null; gamesCache.updatedAt = 0;
  playersCache.inFlight = null; playersCache.value = null; playersCache.updatedAt = 0;
  shotsCache.clear();
  askRateBuckets.clear();
}

export { currentSeason, easternDate, gameStatus, normalizeGame, normalizePlayer, normalizeShot, resetCachesForTest };

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
    if (url.pathname === "/api/ask" && request.method === "POST") {
      if (!allowAskRequest(request)) return privateJson({ error: "Ask CV rate limit reached. Try again in a minute." }, 429, responseOrigin);
      return askCourtVision(request, env, responseOrigin);
    }
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, responseOrigin);
    if (url.pathname === "/" || url.pathname === "/index.html") return statusPage(responseOrigin);
    if (url.pathname === "/health") {
      return json({ status: "ok", service: "courtvision-live-data", gamesConfigured: Boolean(env.COURTVISION_BALLDONTLIE_API_KEY), nbaStatsConfigured: true, askConfigured: Boolean(env.COURTVISION_OPENAI_API_KEY) }, 200, responseOrigin);
    }
    if (url.pathname === "/api/games") return liveGames(env, ctx, responseOrigin);
    if (url.pathname === "/api/players") return livePlayers(responseOrigin);
    if (url.pathname === "/api/shots") return liveShots(url, responseOrigin);
    return json({ error: "Not found" }, 404, responseOrigin);
  },
};
