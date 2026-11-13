"use client";

import { useEffect, useState } from "react";
import { GameCard } from "@/components/game-card";
import type { Game } from "@/lib/types";

const LIVE_DATA_URL = "https://courtvision-live-data.perkyaisle4.chatgpt.site/api/games";
const REFRESH_MS = 60_000;

export type LiveGamesPayload = {
  provider: string;
  fetchedAt: string;
  gameDate: string;
  cacheSeconds?: number;
  games: Game[];
  stale?: boolean;
};

function timestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value));
}

export function LiveScoreboard({ initialData }: { initialData: LiveGamesPayload }) {
  const [data, setData] = useState(initialData);
  const [state, setState] = useState<"connecting" | "live" | "stale">("connecting");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch(LIVE_DATA_URL, {
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Live service returned ${response.status}`);
        const next = await response.json() as LiveGamesPayload;
        if (active) {
          setData(next);
          setState(next.stale ? "stale" : "live");
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setState("stale");
        }
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, REFRESH_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="content-section shell live-slate">
      <div className="date-rule">
        <span>Real NBA slate · {data.gameDate}</span>
        <b className={`live-refresh ${state}`} aria-live="polite">
          <i /> {state === "live" ? "Auto-refreshing" : state === "stale" ? "Snapshot fallback" : "Connecting"} · {timestamp(data.fetchedAt)}
        </b>
      </div>
      {data.games.length ? (
        <div className="games-grid games-page-grid">
          {data.games.map((game) => <GameCard game={game} source="live" linked={false} key={game.id} />)}
        </div>
      ) : (
        <div className="empty-state"><div><h2>No games on today&apos;s slate.</h2><p>The connector is online and will check again automatically.</p></div></div>
      )}
      <p className="snapshot-note">Secure server refresh · 60-second provider cache · last verified snapshot remains visible during upstream errors.</p>
    </section>
  );
}
