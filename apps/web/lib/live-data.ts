import type { Game, LivePlayer, Shot } from "@/lib/types";

export const LIVE_DATA_BASE = "https://courtvision-live-data.perkyaisle4.chatgpt.site";

export type PlayersPayload = {
  provider: "nba_stats";
  fetchedAt: string;
  season: string;
  cacheSeconds: number;
  players: LivePlayer[];
  stale?: boolean;
};

export type ShotsPayload = {
  provider: "nba_stats";
  fetchedAt: string;
  season: string;
  playerId: string;
  cacheSeconds: number;
  shots: Shot[];
  stale?: boolean;
};

export type LiveGamesPayload = {
  provider: "balldontlie";
  fetchedAt: string;
  gameDate: string;
  cacheSeconds?: number;
  games: Game[];
  stale?: boolean;
};

export async function fetchLiveData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${LIVE_DATA_BASE}${path}`, {
    cache: "no-store",
    credentials: "omit",
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `CourtVision data service returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function displayNumber(value: number | null | undefined, digits = 1) {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

export function displayPercent(value: number | null | undefined, digits = 1) {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(digits)}%`;
}
