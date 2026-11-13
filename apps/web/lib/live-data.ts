import type { Game, LivePlayer, Shot } from "@/lib/types";

export const LIVE_DATA_BASE = "https://courtvision-live-data.perkyaisle4.chatgpt.site";

export type PlayersPayload = {
  provider: "nba_stats";
  fetchedAt: string;
  season: string;
  cacheSeconds: number;
  players: LivePlayer[];
  stale?: boolean;
  snapshot?: boolean;
};

export type ShotsPayload = {
  provider: "nba_stats";
  fetchedAt: string;
  season: string;
  playerId: string;
  cacheSeconds: number;
  shots: Shot[];
  stale?: boolean;
  snapshot?: boolean;
};

export type LiveGamesPayload = {
  provider: "balldontlie";
  fetchedAt: string;
  gameDate: string;
  cacheSeconds?: number;
  games: Game[];
  stale?: boolean;
};

export type AskHistoryMessage = { role: "user" | "assistant"; content: string };

export type AskResponse = {
  answer: string;
  model: string;
  sources: string[];
  season: string;
};

export async function fetchLiveData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeoutMs = path === "/api/games" ? 4_000 : 1_500;
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  const response = await fetch(`${LIVE_DATA_BASE}${path}`, {
    cache: "no-store",
    credentials: "omit",
    signal: requestSignal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `CourtVision data service returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPlayersData(): Promise<PlayersPayload> {
  try {
    return await fetchLiveData<PlayersPayload>("/api/players");
  } catch {
    const response = await fetch("/data/nba-players.json", { cache: "no-store" });
    if (!response.ok) throw new Error("NBA player snapshot is unavailable");
    return response.json() as Promise<PlayersPayload>;
  }
}

export async function fetchShotsData(playerId: string, season: string, signal?: AbortSignal): Promise<ShotsPayload> {
  try {
    return await fetchLiveData<ShotsPayload>(`/api/shots?player_id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(season)}`, signal);
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === "AbortError") throw reason;
    const response = await fetch(`/data/shots/${encodeURIComponent(playerId)}.json`, { cache: "no-store", signal });
    if (!response.ok) throw new Error("NBA shot snapshot is unavailable for this player");
    return response.json() as Promise<ShotsPayload>;
  }
}

export async function askCourtVision(
  question: string,
  history: AskHistoryMessage[],
  signal?: AbortSignal,
): Promise<AskResponse> {
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(45_000)])
    : AbortSignal.timeout(45_000);
  const response = await fetch(`${LIVE_DATA_BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
    cache: "no-store",
    credentials: "omit",
    signal: requestSignal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Ask CV returned ${response.status}`);
  }
  return response.json() as Promise<AskResponse>;
}

export function displayNumber(value: number | null | undefined, digits = 1) {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

export function displayPercent(value: number | null | undefined, digits = 1) {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(digits)}%`;
}
