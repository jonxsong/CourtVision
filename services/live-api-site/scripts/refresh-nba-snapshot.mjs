import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import worker, { resetCachesForTest } from "../worker/index.js";

const project = resolve(import.meta.dirname, "..");
const webPublic = resolve(project, "..", "..", "apps", "web", "public", "data");
const shotsDirectory = resolve(webPublic, "shots");
const origin = "http://localhost:3000";
const context = { waitUntil() {} };

resetCachesForTest();
const playersResponse = await worker.fetch(new Request("https://snapshot.local/api/players", { headers: { origin } }), {}, context);
if (!playersResponse.ok) throw new Error(`Player snapshot failed with ${playersResponse.status}`);
const playersPayload = await playersResponse.json();
if (!playersPayload.players?.length) throw new Error("Player snapshot returned no players");

const shotsResponse = await worker.fetch(new Request(`https://snapshot.local/api/shots?player_id=0&season=${playersPayload.season}`, { headers: { origin } }), {}, context);
if (!shotsResponse.ok) throw new Error(`Shot snapshot failed with ${shotsResponse.status}`);
const allShotsPayload = await shotsResponse.json();

await mkdir(webPublic, { recursive: true });
await rm(shotsDirectory, { recursive: true, force: true });
await mkdir(shotsDirectory, { recursive: true });

const stablePlayers = { ...playersPayload, snapshot: true };
await writeFile(resolve(webPublic, "nba-players.json"), JSON.stringify(stablePlayers));
await writeFile(resolve(project, "worker", "nba-snapshot.js"), `export const BUNDLED_PLAYERS = ${JSON.stringify(stablePlayers)};\n`);

const shotsByPlayer = new Map();
for (const shot of allShotsPayload.shots ?? []) {
  const list = shotsByPlayer.get(shot.playerId) ?? [];
  list.push(shot);
  shotsByPlayer.set(shot.playerId, list);
}
for (const player of playersPayload.players) {
  const payload = {
    provider: "nba_stats",
    fetchedAt: allShotsPayload.fetchedAt,
    season: playersPayload.season,
    playerId: player.id,
    cacheSeconds: 900,
    snapshot: true,
    shots: shotsByPlayer.get(player.id) ?? [],
  };
  await writeFile(resolve(shotsDirectory, `${player.id}.json`), JSON.stringify(payload));
}

console.log(`Saved ${playersPayload.players.length} players and ${allShotsPayload.shots.length} shots for ${playersPayload.season}`);
