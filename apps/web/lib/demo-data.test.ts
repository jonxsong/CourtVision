import { describe, expect, it } from "vitest";
import { games, getProfile, players, replayEvents, shots } from "./demo-data";

describe("deterministic demo data", () => {
  it("links every player to a complete profile", () => {
    for (const player of players) {
      const profile = getProfile(player.id);
      expect(profile?.metrics).toHaveLength(6);
      expect(profile?.gamesPlayed).toBeGreaterThan(0);
    }
  });

  it("keeps replay events ordered and bounded", () => {
    expect(replayEvents.map((event) => event.sequence)).toEqual(
      [...replayEvents].map((event) => event.sequence).sort((a, b) => a - b)
    );
    expect(replayEvents.every((event) => event.homeWinProbability >= 0 && event.homeWinProbability <= 1)).toBe(true);
  });

  it("only exposes shot coordinates for labeled fixtures", () => {
    expect(shots.length).toBe(players.length * 64);
    expect(games.every((game) => game.isDemo)).toBe(true);
  });
});
