import type { Shot } from "@/lib/types";

export function Court({ shots, selected }: { shots: Shot[]; selected?: string | null }) {
  // Keep SVG attributes stable across the server and browser float serializers.
  const sx = (x: number) => Number((250 + x * 10).toFixed(3));
  const sy = (y: number) => Number((470 - y * 10).toFixed(3));
  return (
    <svg className="court" viewBox="0 0 500 470" role="img" aria-label={`Half-court shot chart with ${shots.length} attempts`}>
      <g className="court-lines">
        <rect x="1" y="1" width="498" height="468" />
        <path d="M30 470V330H470V470" /><rect x="170" y="280" width="160" height="190" />
        <circle cx="250" cy="410" r="60" /><path d="M190 280a60 60 0 0 1 120 0" strokeDasharray="7 7" />
        <line x1="220" y1="425" x2="280" y2="425" /><circle cx="250" cy="445" r="7.5" />
        <path d="M30 330A237.5 237.5 0 0 1 470 330" /><line x1="30" y1="330" x2="30" y2="470" /><line x1="470" y1="330" x2="470" y2="470" />
      </g>
      <g className="shot-points" aria-hidden="true">{shots.map((shot) => <circle key={shot.id} cx={sx(shot.x)} cy={sy(shot.y)} r={selected === shot.id ? 6 : 3.4} className={shot.made ? "made" : "missed"} data-shot-id={shot.id} />)}</g>
    </svg>
  );
}
