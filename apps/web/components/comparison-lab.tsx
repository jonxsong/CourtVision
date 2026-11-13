"use client";

import { ArrowLeftRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { displayNumber, displayPercent } from "@/lib/live-data";
import type { LivePlayer, PlayerStats } from "@/lib/types";
import { useLivePlayers } from "@/lib/use-live-players";

type MetricSpec = { key: keyof PlayerStats; label: string; format: (value: number | null) => string; note: string };
const metrics: MetricSpec[] = [
  { key: "points", label: "Points", format: displayNumber, note: "Per game" },
  { key: "rebounds", label: "Rebounds", format: displayNumber, note: "Per game" },
  { key: "assists", label: "Assists", format: displayNumber, note: "Per game" },
  { key: "trueShootingPct", label: "True shooting", format: displayPercent, note: "Scoring efficiency" },
  { key: "usagePct", label: "Usage", format: displayPercent, note: "Possessions used" },
  { key: "assistPct", label: "Assist rate", format: displayPercent, note: "Teammate FGs assisted" },
  { key: "reboundPct", label: "Rebound rate", format: displayPercent, note: "Available rebounds" },
  { key: "netRating", label: "Net rating", format: displayNumber, note: "Per 100 possessions" },
];

function metricValue(player: LivePlayer, key: keyof PlayerStats) {
  const value = player.stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function ComparisonLab() {
  const { data, players, loading, error } = useLivePlayers();
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  useEffect(() => {
    if (players.length > 1 && !leftId && !rightId) {
      setLeftId(players[0].id);
      setRightId(players[1].id);
    }
  }, [players, leftId, rightId]);

  const left = useMemo(() => players.find((player) => player.id === leftId), [players, leftId]);
  const right = useMemo(() => players.find((player) => player.id === rightId), [players, rightId]);
  const swap = () => { setLeftId(rightId); setRightId(leftId); };

  if (loading) return <div className="empty-state"><div><h2>Loading real NBA players…</h2><p>Current-season base and advanced statistics are on the way.</p></div></div>;
  if (error || !left || !right) return <div className="empty-state"><div><h2>Comparison data is unavailable.</h2><p>{error ?? "No active players were returned."}</p></div></div>;

  return (
    <div className="compare-lab">
      <div className="date-rule"><span>{players.length} active players · {data?.season}</span><b>Real NBA season statistics</b></div>
      <div className="compare-selectors">
        <label><small>Player A</small><select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{players.map((player) => <option value={player.id} key={player.id}>{player.name} · {player.team.abbreviation}</option>)}</select></label>
        <button onClick={swap} className="swap-button" aria-label="Swap players"><ArrowLeftRight size={19} /></button>
        <label><small>Player B</small><select value={rightId} onChange={(event) => setRightId(event.target.value)}>{players.map((player) => <option value={player.id} key={player.id}>{player.name} · {player.team.abbreviation}</option>)}</select></label>
      </div>
      <div className="compare-stage">
        <div className="compare-player left"><span>{left.initials}</span><h2>{left.name}</h2><p>{left.team.abbreviation} · {left.position} · {left.season}</p></div>
        <div className="versus"><i />VS<i /></div>
        <div className="compare-player right"><span>{right.initials}</span><h2>{right.name}</h2><p>{right.team.abbreviation} · {right.position} · {right.season}</p></div>
      </div>
      <div className="comparison-table">
        <div className="comparison-header"><span>{left.name}</span><b>Metric</b><span>{right.name}</span></div>
        {metrics.map((metric) => {
          const leftValue = metricValue(left, metric.key);
          const rightValue = metricValue(right, metric.key);
          const scale = Math.max(Math.abs(leftValue ?? 0), Math.abs(rightValue ?? 0), 0.01) * 1.1;
          return <div className="comparison-row" key={metric.key}>
            <div className="value-left"><strong>{metric.format(leftValue)}</strong><i style={{ width: `${Math.abs(leftValue ?? 0) / scale * 100}%` }} /></div>
            <span>{metric.label}<small>{metric.note}</small></span>
            <div className="value-right"><strong>{metric.format(rightValue)}</strong><i style={{ width: `${Math.abs(rightValue ?? 0) / scale * 100}%` }} /></div>
          </div>;
        })}
      </div>
      <div className="compare-note"><span className="live-data-badge"><i /> NBA Stats</span><p>Values are current regular-season results. Missing upstream metrics are shown as unavailable and are never estimated.</p></div>
    </div>
  );
}
