import assert from "node:assert/strict";
import test from "node:test";

import worker, { currentSeason, easternDate, gameStatus, normalizeShot, resetCachesForTest } from "../worker/index.js";

const MAIN_ORIGIN = "https://courtvision.jonzhang.dev";

test.beforeEach(() => resetCachesForTest());

test("normalizes Eastern game day and live states", () => {
  assert.equal(easternDate(new Date("2026-11-13T02:00:00Z")), "2026-11-12");
  assert.equal(currentSeason(new Date("2026-11-13T02:00:00Z")), "2026-27");
  assert.equal(gameStatus({ status_state: "in_progress" }), "live");
  assert.equal(gameStatus({ status_state: "final" }), "final");
});

test("serves an operational status page at the site root", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/"),
    {},
    { waitUntil() {} },
  );
  const page = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.match(page, /Service online/);
  assert.match(page, /href="\/api\/games"/);
  assert.match(page, /href="\/api\/players"/);
  assert.match(page, /courtvision\.jonzhang\.dev\/games/);
});

test("serves active NBA players with real base and advanced statistics", async () => {
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    calls.push(url);
    if (url.pathname === "/stats/playerindex") {
      return Response.json({ resultSets: [{
        headers: ["PERSON_ID", "PLAYER_LAST_NAME", "PLAYER_FIRST_NAME", "PLAYER_SLUG", "TEAM_ID", "TEAM_CITY", "TEAM_NAME", "TEAM_ABBREVIATION", "JERSEY_NUMBER", "POSITION", "HEIGHT", "WEIGHT", "COLLEGE", "COUNTRY", "DRAFT_YEAR", "DRAFT_ROUND", "DRAFT_NUMBER", "ROSTER_STATUS"],
        rowSet: [[2544, "James", "LeBron", "lebron-james", 1610612755, "Philadelphia", "76ers", "PHI", "23", "F", "6-9", "250", "St. Vincent-St. Mary HS", "USA", 2003, 1, 1, 1]],
      }] });
    }
    const advanced = url.searchParams.get("MeasureType") === "Advanced";
    return Response.json({ resultSets: [{
      headers: advanced
        ? ["PLAYER_ID", "TS_PCT", "EFG_PCT", "USG_PCT", "AST_PCT", "REB_PCT", "NET_RATING", "OFF_RATING", "DEF_RATING", "PACE", "PIE"]
        : ["PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION", "GP", "MIN", "PTS", "REB", "AST", "STL", "BLK", "TOV", "FG_PCT", "FG3_PCT", "FT_PCT", "PLUS_MINUS"],
      rowSet: advanced
        ? [[2544, 0.612, 0.574, 0.281, 0.338, 0.091, 6.2, 119.4, 113.2, 99.8, 0.164]]
        : [[2544, "LeBron James", 1610612755, "PHI", 8, 34.2, 24.5, 7.8, 8.1, 1.2, 0.7, 3.4, 0.52, 0.36, 0.78, 5.1]],
    }] });
  };

  const response = await worker.fetch(new Request("https://api.test/api/players", { headers: { origin: MAIN_ORIGIN } }), {}, { waitUntil() {} });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.provider, "nba_stats");
  assert.equal(payload.players[0].name, "LeBron James");
  assert.equal(payload.players[0].position, "F");
  assert.equal(payload.players[0].stats.points, 24.5);
  assert.equal(payload.players[0].stats.trueShootingPct, 0.612);
  assert.equal(calls.length, 3);
});

test("falls back to the bundled real NBA snapshot when NBA Stats blocks cloud egress", async () => {
  globalThis.fetch = async () => { throw new Error("upstream blocked"); };
  const response = await worker.fetch(new Request("https://api.test/api/players", { headers: { origin: MAIN_ORIGIN } }), {}, { waitUntil() {} });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.provider, "nba_stats");
  assert.equal(payload.snapshot, true);
  assert.ok(payload.players.length > 500);
  assert.ok(payload.players.some((player) => player.name === "Stephen Curry"));
});

test("serves real NBA shot coordinates in court feet", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    assert.equal(url.pathname, "/stats/shotchartdetail");
    assert.equal(url.searchParams.get("PlayerID"), "2544");
    return Response.json({ resultSets: [{
      headers: ["GAME_ID", "GAME_EVENT_ID", "PLAYER_ID", "PLAYER_NAME", "PERIOD", "MINUTES_REMAINING", "SECONDS_REMAINING", "ACTION_TYPE", "SHOT_TYPE", "SHOT_ZONE_BASIC", "SHOT_DISTANCE", "LOC_X", "LOC_Y", "SHOT_MADE_FLAG", "GAME_DATE"],
      rowSet: [["0022600002", 29, 2544, "LeBron James", 1, 9, 35, "Jump Shot", "3PT Field Goal", "Right Corner 3", 23, 239, -5, 0, "20261020"]],
    }] });
  };
  const response = await worker.fetch(new Request("https://api.test/api/shots?player_id=2544&season=2026-27", { headers: { origin: MAIN_ORIGIN } }), {}, { waitUntil() {} });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.shots[0].x, 23.9);
  assert.equal(payload.shots[0].y, 2);
  assert.equal(payload.shots[0].points, 3);
  assert.equal(payload.shots[0].zone, "Three");
  assert.deepEqual(normalizeShot({ GAME_ID: "1", GAME_EVENT_ID: 2, PLAYER_ID: 3, PLAYER_NAME: "A", SHOT_TYPE: "2PT Field Goal", SHOT_ZONE_BASIC: "Restricted Area", LOC_X: 0, LOC_Y: 0, SHOT_MADE_FLAG: 1 }).zone, "Rim");
});

test("validates shot chart query parameters", async () => {
  const response = await worker.fetch(new Request("https://api.test/api/shots", { headers: { origin: MAIN_ORIGIN } }), {}, { waitUntil() {} });
  assert.equal(response.status, 400);
});

test("serves a cached browser-safe live slate", async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async (_url, options) => {
    upstreamCalls += 1;
    assert.equal(options.headers.Authorization, "secret-value");
    return new Response(JSON.stringify({ data: [{
      id: 42,
      datetime: "2026-11-13T03:00:00Z",
      status: "2nd Qtr",
      status_state: "in_progress",
      period: 2,
      time: "Q2 4:12",
      home_team_score: 51,
      visitor_team_score: 48,
      home_q1: 27,
      home_q2: 24,
      home_q3: 0,
      home_q4: 0,
      visitor_q1: 25,
      visitor_q2: 23,
      visitor_q3: 0,
      visitor_q4: 0,
      home_timeouts_remaining: 5,
      visitor_timeouts_remaining: 4,
      home_in_bonus: true,
      visitor_in_bonus: false,
      ist_stage: "West Group A",
      home_team: { id: 1, abbreviation: "LAL", city: "Los Angeles", name: "Lakers" },
      visitor_team: { id: 2, abbreviation: "GSW", city: "Golden State", name: "Warriors" },
    }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const ctx = { waitUntil() {} };
  const request = new Request("https://api.test/api/games", { headers: { origin: MAIN_ORIGIN } });
  const first = await worker.fetch(request, { COURTVISION_BALLDONTLIE_API_KEY: "secret-value" }, ctx);
  const second = await worker.fetch(request, { COURTVISION_BALLDONTLIE_API_KEY: "secret-value" }, ctx);
  const payload = await second.json();

  assert.equal(first.status, 200);
  assert.equal(payload.games[0].status, "live");
  assert.equal(payload.games[0].home.score, 51);
  assert.equal(payload.games[0].clock, "Q2 4:12");
  assert.deepEqual(payload.games[0].periodScores.home, [27, 24, null, null, null, null, null]);
  assert.deepEqual(payload.games[0].periodScores.away, [25, 23, null, null, null, null, null]);
  assert.deepEqual(payload.games[0].timeouts, { home: 5, away: 4 });
  assert.deepEqual(payload.games[0].inBonus, { home: true, away: false });
  assert.equal(payload.games[0].tournamentStage, "West Group A");
  assert.equal(upstreamCalls, 1);
});

test("requires a server-side OpenAI secret for Ask CV", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/api/ask", {
      method: "POST",
      headers: { origin: MAIN_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ question: "Who leads the NBA in scoring?" }),
    }),
    {},
    { waitUntil() {} },
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("grounds Ask CV answers with CourtVision player tools", async () => {
  const requests = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.openai.com");
    assert.equal(options.headers.Authorization, "Bearer openai-secret");
    const body = JSON.parse(options.body);
    requests.push(body);
    if (requests.length === 1) {
      return Response.json({
        id: "resp_tool",
        model: "gpt-6-luna",
        output: [{
          type: "function_call",
          name: "get_player",
          call_id: "call_luka",
          arguments: JSON.stringify({ player: "Luka Dončić" }),
        }],
      });
    }
    const toolOutput = JSON.parse(body.input[0].output);
    assert.equal(toolOutput.name, "Luka Dončić");
    assert.equal(toolOutput.source, "NBA Stats");
    return Response.json({
      id: "resp_answer",
      model: "gpt-6-luna",
      output: [{ type: "message", content: [{ type: "output_text", text: "Luka is averaging 38.6 points per game. [NBA Stats]" }] }],
    });
  };

  const response = await worker.fetch(
    new Request("https://api.test/api/ask", {
      method: "POST",
      headers: { origin: MAIN_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ question: "How is Luka scoring this season?", history: [] }),
    }),
    { COURTVISION_OPENAI_API_KEY: "openai-secret" },
    { waitUntil() {} },
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.match(payload.answer, /38\.6 points/);
  assert.deepEqual(payload.sources, ["NBA Stats"]);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].previous_response_id, "resp_tool");
});

test("validates Ask CV question length before calling OpenAI", async () => {
  globalThis.fetch = async () => { throw new Error("fetch should not run"); };
  const response = await worker.fetch(
    new Request("https://api.test/api/ask", {
      method: "POST",
      headers: { origin: MAIN_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ question: "" }),
    }),
    { COURTVISION_OPENAI_API_KEY: "openai-secret" },
    { waitUntil() {} },
  );
  assert.equal(response.status, 400);
});

test("rate limits repeated Ask CV requests from one client", async () => {
  globalThis.fetch = async () => { throw new Error("fetch should not run"); };
  let response;
  for (let index = 0; index < 7; index += 1) {
    response = await worker.fetch(
      new Request("https://api.test/api/ask", {
        method: "POST",
        headers: { origin: MAIN_ORIGIN, "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
        body: JSON.stringify({ question: "" }),
      }),
      { COURTVISION_OPENAI_API_KEY: "openai-secret" },
      { waitUntil() {} },
    );
  }
  assert.equal(response.status, 429);
});

test("rejects an untrusted browser origin", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/api/games", { headers: { origin: "https://evil.example" } }),
    {},
    { waitUntil() {} },
  );
  assert.equal(response.status, 403);
});
