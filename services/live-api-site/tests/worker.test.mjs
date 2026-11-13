import assert from "node:assert/strict";
import test from "node:test";

import worker, { easternDate, gameStatus } from "../worker/index.js";

const MAIN_ORIGIN = "https://courtvision-analytics.perkyaisle4.chatgpt.site";

test("normalizes Eastern game day and live states", () => {
  assert.equal(easternDate(new Date("2026-11-13T02:00:00Z")), "2026-11-12");
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
  assert.match(page, /courtvision-analytics\.perkyaisle4\.chatgpt\.site\/games/);
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
      home_team_score: 51,
      visitor_team_score: 48,
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
  assert.equal(upstreamCalls, 1);
});

test("rejects an untrusted browser origin", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/api/games", { headers: { origin: "https://evil.example" } }),
    {},
    { waitUntil() {} },
  );
  assert.equal(response.status, 403);
});
