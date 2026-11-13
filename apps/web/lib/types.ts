export type Team = { id: string; abbreviation: string; city: string; name: string };
export type Player = {
  id: string; slug: string; name: string; initials: string; position: string; number: string;
  team: Team; active: boolean;
};
export type Metric = {
  key: string; label: string; value: number; display: string; percentile: number; definition: string;
};
export type PlayerProfile = Player & {
  season: string; bio: Record<string, string>; gamesPlayed: number; minutesPerGame: number;
  metrics: Metric[]; trend: { season: string; points: number; trueShooting: number }[];
  zones: { zone: string; attempts: number; fgPct: number }[];
  similarPlayers: { id: string; name: string; similarity: number }[];
};
export type Game = {
  id: string; tipoffAt: string; status: "scheduled" | "live" | "final" | "postponed";
  home: { team: Team; score: number; record: string };
  away: { team: Team; score: number; record: string };
  venue: string; headline: string; isDemo: boolean;
};
export type GameEvent = {
  id: string; sequence: number; period: number; clock: string; eventType: string;
  description: string; homeScore: number; awayScore: number; homeWinProbability: number; isKeyEvent?: boolean;
};
export type Shot = {
  id: string; playerId: string; playerName: string; x: number; y: number; distance: number;
  made: boolean; points: 2 | 3; zone: string;
};
