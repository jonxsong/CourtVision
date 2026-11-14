"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchLiveData, type LiveGamesPayload } from "@/lib/live-data";
import type { Game } from "@/lib/types";
import { TeamMark } from "./team-mark";

const REFRESH_MS = 60_000;

function pacificTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(date);
}

function LineScore({ game }: { game: Game }) {
  const labels = ["Q1", "Q2", "Q3", "Q4", "OT", "2OT", "3OT"];
  const home = game.periodScores?.home ?? [];
  const away = game.periodScores?.away ?? [];
  let visiblePeriods = Math.max(4, game.period ?? 0);
  while (visiblePeriods > 4 && home[visiblePeriods - 1] == null && away[visiblePeriods - 1] == null) visiblePeriods -= 1;
  const columns = labels.slice(0, visiblePeriods);
  const score = (value: number | null | undefined) => value == null ? "—" : value;

  return <section className="line-score-panel" aria-labelledby="line-score-heading">
    <div><span className="kicker">Live scoring</span><h2 id="line-score-heading">Quarter-by-quarter</h2></div>
    <div className="line-score-scroll"><table>
      <thead><tr><th scope="col">Team</th>{columns.map((label) => <th scope="col" key={label}>{label}</th>)}<th scope="col">Total</th></tr></thead>
      <tbody>
        <tr><th scope="row">{game.away.team.abbreviation}</th>{columns.map((_, index) => <td key={index}>{score(away[index])}</td>)}<td>{game.status === "scheduled" ? "—" : game.away.score}</td></tr>
        <tr><th scope="row">{game.home.team.abbreviation}</th>{columns.map((_, index) => <td key={index}>{score(home[index])}</td>)}<td>{game.status === "scheduled" ? "—" : game.home.score}</td></tr>
      </tbody>
    </table></div>
  </section>;
}

export function LiveGameDetail() {
  const gameId = useSearchParams().get("game");
  const [game, setGame] = useState<Game | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [refreshState, setRefreshState] = useState<"connecting" | "live" | "stale">("connecting");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    let active = true;
    const controller = new AbortController();

    async function refresh() {
      try {
        const payload = await fetchLiveData<LiveGamesPayload>("/api/games", controller.signal);
        if (!active) return;
        const match = payload.games.find((item) => item.id === gameId);
        setGame(match ?? null);
        setFetchedAt(payload.fetchedAt);
        setState(match ? "ready" : "missing");
        setRefreshState(payload.stale ? "stale" : "live");
      } catch (error: unknown) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        setRefreshState("stale");
        setState((current) => current === "ready" ? current : "error");
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, REFRESH_MS);
    return () => { active = false; controller.abort(); window.clearInterval(interval); };
  }, [gameId]);

  if (!gameId) return <section className="content-section shell"><div className="empty-state"><div><h2>Choose a game from today’s slate.</h2><p><Link href="/games">View today&apos;s real NBA games</Link></p></div></div></section>;
  if (state === "loading") return <section className="content-section shell"><div className="empty-state"><div><h2>Loading the matchup…</h2><p>Retrieving the latest NBA game state.</p></div></div></section>;
  if (state !== "ready" || !game) return <section className="content-section shell"><div className="empty-state"><div><h2>{state === "error" ? "Game data is temporarily unavailable." : "Game not found on today’s slate."}</h2><p><Link href="/games">Return to today&apos;s real NBA games</Link></p></div></div></section>;

  return <>
    <section className="game-hero"><div className="shell">
      <div className="breadcrumbs"><Link href="/games"><ArrowLeft size={13} /> Games</Link><span>/</span><span>{game.away.team.abbreviation} at {game.home.team.abbreviation}</span><span className="live-data-badge"><i /> NBA game</span></div>
      <div className="scoreboard">
        <div className="score-team"><TeamMark team={game.away.team} size="lg" /><div><h1>{game.away.team.city}</h1><p>{game.away.team.name}</p></div><strong>{game.status === "scheduled" ? "—" : game.away.score}</strong></div>
        <div className="game-status"><span>{game.status}</span><b>{game.clock ?? game.headline}</b></div>
        <div className="score-team home"><strong>{game.status === "scheduled" ? "—" : game.home.score}</strong><div><h1>{game.home.team.city}</h1><p>{game.home.team.name}</p></div><TeamMark team={game.home.team} size="lg" /></div>
      </div>
    </div></section>
    <section className="content-section shell live-game-content">
      <div className="date-rule"><span>Real NBA game detail</span><b className={`live-refresh ${refreshState}`} aria-live="polite"><i /> {refreshState === "live" ? "Auto-refreshing every 60 seconds" : refreshState === "stale" ? "Showing last verified score" : "Connecting to live feed"}{fetchedAt ? ` · ${pacificTime(fetchedAt)}` : ""}</b></div>
      <div className="operations-status">
        <article><span>Tipoff</span><strong>{pacificTime(game.tipoffAt)}</strong><p>Displayed in Pacific Time.</p></article>
        <article><span>Game clock</span><strong>{game.clock ?? game.status}</strong><p>{game.headline}</p></article>
        <article><span>Competition</span><strong>{game.tournamentStage ?? (game.postseason ? "Playoffs" : "Regular season")}</strong><p>{game.venue}</p></article>
      </div>
      <LineScore game={game} />
      <div className="game-context-grid">
        <article><span>Timeouts remaining</span><strong>{game.away.team.abbreviation} {game.timeouts?.away ?? "—"} · {game.home.team.abbreviation} {game.timeouts?.home ?? "—"}</strong></article>
        <article><span>Bonus status</span><strong>{game.away.team.abbreviation} {game.inBonus?.away ? "In bonus" : "Not in bonus"} · {game.home.team.abbreviation} {game.inBonus?.home ? "In bonus" : "Not in bonus"}</strong></article>
        <article><span>Data source</span><strong>BALLDONTLIE live scores</strong></article>
      </div>
      <p className="snapshot-note">Score, period, clock, quarter totals, timeouts, and bonus state refresh automatically. Player box scores and play-by-play require a provider tier that is not enabled, so CourtVision does not invent them.</p>
    </section>
  </>;
}
