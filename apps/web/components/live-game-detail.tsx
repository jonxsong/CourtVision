"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchLiveData, type LiveGamesPayload } from "@/lib/live-data";
import type { Game } from "@/lib/types";
import { TeamMark } from "./team-mark";

function tipoff(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(date);
}

export function LiveGameDetail() {
  const gameId = useSearchParams().get("game");
  const [game, setGame] = useState<Game | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    if (!gameId) { setState("missing"); return; }
    const controller = new AbortController();
    void fetchLiveData<LiveGamesPayload>("/api/games", controller.signal).then((payload) => {
      const match = payload.games.find((item) => item.id === gameId);
      setGame(match ?? null);
      setState(match ? "ready" : "missing");
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setState("error");
    });
    return () => controller.abort();
  }, [gameId]);

  if (state === "loading") return <section className="content-section shell"><div className="empty-state"><div><h2>Loading the matchup…</h2><p>Retrieving the latest NBA game state.</p></div></div></section>;
  if (state !== "ready" || !game) return <section className="content-section shell"><div className="empty-state"><div><h2>{state === "error" ? "Game data is temporarily unavailable." : "Game not found on today’s slate."}</h2><p><Link href="/games">Return to today&apos;s real NBA games</Link></p></div></div></section>;

  return <>
    <section className="game-hero"><div className="shell">
      <div className="breadcrumbs"><Link href="/games"><ArrowLeft size={13} /> Games</Link><span>/</span><span>{game.away.team.abbreviation} at {game.home.team.abbreviation}</span><span className="live-data-badge"><i /> NBA game</span></div>
      <div className="scoreboard">
        <div className="score-team"><TeamMark team={game.away.team} size="lg" /><div><h1>{game.away.team.city}</h1><p>{game.away.team.name}</p></div><strong>{game.status === "scheduled" ? "—" : game.away.score}</strong></div>
        <div className="game-status"><span>{game.status}</span><b>{game.venue}</b></div>
        <div className="score-team home"><strong>{game.status === "scheduled" ? "—" : game.home.score}</strong><div><h1>{game.home.team.city}</h1><p>{game.home.team.name}</p></div><TeamMark team={game.home.team} size="lg" /></div>
      </div>
    </div></section>
    <section className="content-section shell"><div className="operations-status">
      <article><span>Tipoff</span><strong>{tipoff(game.tipoffAt)}</strong><p>Displayed in Pacific Time.</p></article>
      <article><span>Game state</span><strong>{game.status}</strong><p>{game.headline}</p></article>
      <article><span>Source</span><strong>BALLDONTLIE</strong><p>Real schedule and score data through the CourtVision service.</p></article>
    </div><div className="empty-state"><div><h2>Live matchup details</h2><p>Current score, status, venue, and tipoff are available above. Play-by-play is not included by the free provider and is not fabricated.</p></div></div></section>
  </>;
}
