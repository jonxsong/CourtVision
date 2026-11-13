import type { Game, GameEvent, Player, PlayerProfile, Shot, Team } from "./types";

export const teams: Record<string, Team> = {
  orbit: { id: "team-orbit", abbreviation: "ORB", city: "Oakland", name: "Orbit" },
  pinnacle: { id: "team-pinnacle", abbreviation: "PIN", city: "Portland", name: "Pinnacle" },
  sol: { id: "team-sol", abbreviation: "SOL", city: "San Diego", name: "Sol" },
  sound: { id: "team-sound", abbreviation: "SND", city: "Seattle", name: "Sound" }
};

export const players: Player[] = [
  { id: "p-miles-avery", slug: "miles-avery", name: "Miles Avery", initials: "MA", position: "G", number: "0", team: teams.orbit, active: true },
  { id: "p-jonah-ellis", slug: "jonah-ellis", name: "Jonah Ellis", initials: "JE", position: "F", number: "24", team: teams.pinnacle, active: true },
  { id: "p-darius-cole", slug: "darius-cole", name: "Darius Cole", initials: "DC", position: "G", number: "3", team: teams.sol, active: true },
  { id: "p-leon-park", slug: "leon-park", name: "Leon Park", initials: "LP", position: "C", number: "11", team: teams.sound, active: true },
  { id: "p-isaiah-reed", slug: "isaiah-reed", name: "Isaiah Reed", initials: "IR", position: "F", number: "7", team: teams.orbit, active: true },
  { id: "p-noah-bennett", slug: "noah-bennett", name: "Noah Bennett", initials: "NB", position: "G", number: "13", team: teams.pinnacle, active: true }
];

const metricLabels = [
  ["ppg", "Points", "Points scored per game."],
  ["apg", "Assists", "Assists credited per game."],
  ["rpg", "Rebounds", "Rebounds collected per game."],
  ["ts", "True shooting", "PTS / (2 × (FGA + 0.44 × FTA))."],
  ["usage", "Usage", "Estimated share of team plays used while on court."],
  ["tov", "Turnover rate", "Turnovers per 100 individual plays."]
] as const;

export function getProfile(id: string): PlayerProfile | undefined {
  const player = players.find((candidate) => candidate.id === id || candidate.slug === id);
  if (!player) return undefined;
  const i = players.indexOf(player);
  const raw = [27.4 - i * 1.7, 7.8 - i * .5, 5.6 + i * .8, 64.2 - i * 1.3, 30.1 - i * .7, 10.8 + i * .6];
  return {
    ...player,
    season: "2025–26",
    bio: { height: `${6 + Math.floor(i / 3)}′${3 + i % 4}″`, weight: `${195 + i * 11} lb`, experience: `${3 + i} seasons` },
    gamesPlayed: 64 - i,
    minutesPerGame: Number((35.2 - i * .4).toFixed(1)),
    metrics: metricLabels.map(([key, label, definition], index) => ({
      key, label, definition, value: Number(raw[index].toFixed(1)),
      display: `${raw[index].toFixed(1)}${index >= 3 ? "%" : ""}`,
      percentile: Math.max(45, 94 - i * 5 - index * 2)
    })),
    trend: [
      { season: "22–23", points: 20.8 - i, trueShooting: 58.3 - i * .5 },
      { season: "23–24", points: 23.6 - i, trueShooting: 60.5 - i * .5 },
      { season: "24–25", points: 25.9 - i, trueShooting: 62.1 - i * .6 },
      { season: "25–26", points: 27.4 - i * 1.7, trueShooting: 64.2 - i * 1.3 }
    ],
    zones: [
      { zone: "At rim", attempts: 191 - i * 7, fgPct: 68.4 - i },
      { zone: "Short mid", attempts: 72 + i * 4, fgPct: 46.1 + i * .4 },
      { zone: "Long mid", attempts: 89 - i * 3, fgPct: 43.7 - i * .5 },
      { zone: "Corner 3", attempts: 84 + i * 2, fgPct: 41.8 - i * .7 },
      { zone: "Above break 3", attempts: 267 - i * 9, fgPct: 39.6 - i * .8 }
    ],
    similarPlayers: players.filter((p) => p.id !== player.id).slice(0, 3).map((p, j) => ({ id: p.id, name: p.name, similarity: .92 - j * .05 }))
  };
}

export const games: Game[] = [
  { id: "game-orb-pin-001", tipoffAt: "2026-03-18T02:00:00Z", status: "final", home: { team: teams.orbit, score: 118, record: "42–24" }, away: { team: teams.pinnacle, score: 114, record: "39–27" }, venue: "The Foundry", headline: "Orbit close on a 14–5 run", isDemo: true },
  { id: "game-sol-snd-002", tipoffAt: "2026-03-17T23:30:00Z", status: "final", home: { team: teams.sol, score: 101, record: "31–35" }, away: { team: teams.sound, score: 109, record: "45–21" }, venue: "Pacific Forum", headline: "Sound defense controls the fourth", isDemo: true },
  { id: "game-pin-snd-003", tipoffAt: "2026-03-21T02:00:00Z", status: "scheduled", home: { team: teams.pinnacle, score: 0, record: "39–27" }, away: { team: teams.sound, score: 0, record: "45–21" }, venue: "Rose Pavilion", headline: "Top-four seeds meet in Portland", isDemo: true }
];

export const replayEvents: GameEvent[] = [
  { id: "e1", sequence: 1, period: 1, clock: "12:00", eventType: "period_start", description: "Opening tip", homeScore: 0, awayScore: 0, homeWinProbability: .56 },
  { id: "e2", sequence: 2, period: 1, clock: "9:42", eventType: "three", description: "Avery pulls up from 27 feet", homeScore: 8, awayScore: 4, homeWinProbability: .61 },
  { id: "e3", sequence: 3, period: 1, clock: "4:18", eventType: "run", description: "Pinnacle answers with an 11–2 run", homeScore: 16, awayScore: 21, homeWinProbability: .43, isKeyEvent: true },
  { id: "e4", sequence: 4, period: 2, clock: "6:51", eventType: "dunk", description: "Reed finishes through contact", homeScore: 45, awayScore: 43, homeWinProbability: .58 },
  { id: "e5", sequence: 5, period: 2, clock: "0:00", eventType: "period_end", description: "Halftime", homeScore: 57, awayScore: 58, homeWinProbability: .51 },
  { id: "e6", sequence: 6, period: 3, clock: "7:09", eventType: "three", description: "Ellis hits consecutive corner threes", homeScore: 66, awayScore: 73, homeWinProbability: .32, isKeyEvent: true },
  { id: "e7", sequence: 7, period: 3, clock: "1:12", eventType: "run", description: "Orbit pressure forces three straight turnovers", homeScore: 84, awayScore: 82, homeWinProbability: .64, isKeyEvent: true },
  { id: "e8", sequence: 8, period: 4, clock: "8:33", eventType: "lead_change", description: "Bennett floater gives Pinnacle the lead", homeScore: 94, awayScore: 95, homeWinProbability: .45 },
  { id: "e9", sequence: 9, period: 4, clock: "2:04", eventType: "three", description: "Avery relocates and hits from the wing", homeScore: 111, awayScore: 108, homeWinProbability: .79, isKeyEvent: true },
  { id: "e10", sequence: 10, period: 4, clock: "0:18", eventType: "free_throw", description: "Reed makes both to seal it", homeScore: 118, awayScore: 112, homeWinProbability: .98 },
  { id: "e11", sequence: 11, period: 4, clock: "0:00", eventType: "final", description: "Final", homeScore: 118, awayScore: 114, homeWinProbability: 1 }
];

function seeded(seed: number) {
  let value = seed;
  return () => ((value = (value * 16807) % 2147483647) - 1) / 2147483646;
}

export const shots: Shot[] = players.flatMap((player, playerIndex) => {
  const random = seeded(420 + playerIndex * 31);
  return Array.from({ length: 64 }, (_, i) => {
    const angle = (random() - .5) * Math.PI;
    const distance = Math.min(29, 2 + random() * 28);
    const x = Math.sin(angle) * distance;
    const y = Math.cos(angle) * distance;
    const three = distance >= 22 && (Math.abs(x) > 8 || y > 14);
    return { id: `${player.id}-${i}`, playerId: player.id, playerName: player.name, x, y, distance, made: random() < Math.max(.28, .7 - distance * .014), points: three ? 3 : 2, zone: distance < 5 ? "Rim" : three ? "Three" : "Mid-range" };
  });
});
