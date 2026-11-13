import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Game } from "@/lib/types";
import { DemoBadge } from "./demo-badge";
import { TeamMark } from "./team-mark";

export function GameCard({ game, compact = false, source = "demo", linked = true }: { game: Game; compact?: boolean; source?: "demo" | "live"; linked?: boolean }) {
  const className = compact ? "game-card compact" : "game-card";
  const content = (
    <>
      <div className="game-card-top">
        <span>{game.status === "final" ? "Final" : game.status === "live" ? "Live" : "Scheduled"}</span>
        {source === "demo" ? <DemoBadge compact /> : <span className="live-data-badge"><i /> Live provider</span>}
      </div>
      <div className="matchup">
        <div><TeamMark team={game.away.team} size={compact ? "sm" : "md"} /><span><b>{game.away.team.city}</b><small>{game.away.record}</small></span></div>
        <strong>{game.status === "scheduled" ? "—" : game.away.score}</strong>
      </div>
      <div className="matchup">
        <div><TeamMark team={game.home.team} size={compact ? "sm" : "md"} /><span><b>{game.home.team.city}</b><small>{game.home.record}</small></span></div>
        <strong>{game.status === "scheduled" ? "—" : game.home.score}</strong>
      </div>
      {!compact && <div className="game-card-bottom"><span>{game.headline}</span><ArrowUpRight size={16} /></div>}
    </>
  );
  return linked ? <Link href={`/games/${game.id}`} className={className}>{content}</Link> : <article className={className}>{content}</article>;
}
