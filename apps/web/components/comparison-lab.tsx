"use client";

import { ArrowLeftRight } from "lucide-react";
import { useMemo, useState } from "react";
import { getProfile, players } from "@/lib/demo-data";
import { DemoBadge } from "./demo-badge";

export function ComparisonLab() {
  const [leftId, setLeftId] = useState(players[0].id);
  const [rightId, setRightId] = useState(players[1].id);
  const left = useMemo(() => getProfile(leftId)!, [leftId]);
  const right = useMemo(() => getProfile(rightId)!, [rightId]);
  const swap = () => { setLeftId(rightId); setRightId(leftId); };
  return (
    <div className="compare-lab">
      <div className="compare-selectors">
        <label><small>Player A</small><select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{players.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <button onClick={swap} className="swap-button" aria-label="Swap players"><ArrowLeftRight size={19} /></button>
        <label><small>Player B</small><select value={rightId} onChange={(event) => setRightId(event.target.value)}>{players.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      </div>
      <div className="compare-stage">
        <div className="compare-player left"><span>{left.initials}</span><h2>{left.name}</h2><p>{left.team.abbreviation} · {left.position} · {left.season}</p></div>
        <div className="versus"><i />VS<i /></div>
        <div className="compare-player right"><span>{right.initials}</span><h2>{right.name}</h2><p>{right.team.abbreviation} · {right.position} · {right.season}</p></div>
      </div>
      <div className="comparison-table">
        <div className="comparison-header"><span>{left.name}</span><b>Metric</b><span>{right.name}</span></div>
        {left.metrics.map((metric, index) => {
          const other = right.metrics[index]; const max = Math.max(metric.value, other.value) * 1.15;
          return <div className="comparison-row" key={metric.key} title={metric.definition}>
            <div className="value-left"><strong>{metric.display}</strong><i style={{ width: `${metric.value / max * 100}%` }} /></div>
            <span>{metric.label}<small>{metric.key === "tov" ? "Lower can be better" : "Season rate"}</small></span>
            <div className="value-right"><strong>{other.display}</strong><i style={{ width: `${other.value / max * 100}%` }} /></div>
          </div>;
        })}
      </div>
      <div className="compare-note"><DemoBadge /><p>Percentiles and profiles use deterministic fixture values. Normalization is within the six-player demonstration cohort; it is not an NBA league comparison.</p></div>
    </div>
  );
}
