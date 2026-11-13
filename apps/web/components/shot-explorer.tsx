"use client";

import { useMemo, useState } from "react";
import { players, shots } from "@/lib/demo-data";
import { Court } from "./court";
import { DemoBadge } from "./demo-badge";

export function ShotExplorer() {
  const [playerId, setPlayerId] = useState(players[0].id);
  const [result, setResult] = useState<"all" | "made" | "missed">("all");
  const filtered = useMemo(() => shots.filter((shot) => shot.playerId === playerId && (result === "all" || shot.made === (result === "made"))), [playerId, result]);
  const attempts = filtered.length, makes = filtered.filter(s => s.made).length;
  const threes = filtered.filter(s => s.points === 3); const rim = filtered.filter(s => s.zone === "Rim");
  return (
    <div className="shot-layout">
      <aside className="shot-controls">
        <DemoBadge />
        <label><small>Player</small><select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label><small>Season</small><select defaultValue="2025-26"><option>2025–26</option></select></label>
        <fieldset><legend>Result</legend><div className="segmented">{(["all", "made", "missed"] as const).map(value => <button className={result === value ? "active" : ""} onClick={() => setResult(value)} key={value}>{value}</button>)}</div></fieldset>
        <div className="shot-summary"><div><strong>{attempts ? (makes / attempts * 100).toFixed(1) : "—"}%</strong><span>FG</span></div><div><strong>{attempts}</strong><span>Attempts</span></div></div>
        <div className="legend"><span><i className="made" />Made</span><span><i className="missed" />Missed</span></div>
      </aside>
      <div className="court-panel"><Court shots={filtered} /><p>Coordinates are deterministic fixtures in feet from basket center. They do not represent an NBA player.</p></div>
      <aside className="zone-breakdown">
        <span className="kicker">Efficiency by area</span><h2>Shot profile</h2>
        {[{ label: "At rim", data: rim }, { label: "Mid-range", data: filtered.filter(s => s.zone === "Mid-range") }, { label: "Three", data: threes }].map(zone => {
          const made = zone.data.filter(s => s.made).length; const pct = zone.data.length ? made / zone.data.length * 100 : 0;
          return <div className="zone-stat" key={zone.label}><div><span>{zone.label}</span><b>{pct.toFixed(1)}%</b></div><i><em style={{ width: `${pct}%` }} /></i><small>{made} / {zone.data.length}</small></div>;
        })}
      </aside>
    </div>
  );
}
