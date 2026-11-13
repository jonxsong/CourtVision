import type { GameEvent } from "@/lib/types";

export function WinProbabilityChart({ events }: { events: GameEvent[] }) {
  const width = 920, height = 270, pad = 28;
  const points = events.map((event, index) => ({
    x: pad + index * ((width - pad * 2) / Math.max(1, events.length - 1)),
    y: pad + (1 - event.homeWinProbability) * (height - pad * 2), event
  }));
  const line = points.map((point, i) => `${i ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1)?.x},${height - pad} L${pad},${height - pad} Z`;
  return (
    <div className="wp-chart" role="img" aria-label="Home win probability over the game replay">
      <div className="chart-label chart-label-top">100% ORB</div>
      <div className="chart-label chart-label-mid">50%</div>
      <div className="chart-label chart-label-bottom">100% PIN</div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs><linearGradient id="wp-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6a2a" stopOpacity=".32"/><stop offset="1" stopColor="#ff6a2a" stopOpacity="0"/></linearGradient></defs>
        <line x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} className="midline" />
        <path d={area} fill="url(#wp-fill)" />
        <path d={line} className="probability-line" />
        {points.filter((p) => p.event.isKeyEvent).map((p) => <circle key={p.event.id} cx={p.x} cy={p.y} r="5" />)}
      </svg>
      <div className="quarter-labels"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>
    </div>
  );
}
