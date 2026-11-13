import type { Metric } from "@/lib/types";

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <div className="metric-cell" key={metric.key} title={metric.definition}>
          <div><span>{metric.label}</span><em>{metric.percentile}th pct.</em></div>
          <strong>{metric.display}</strong>
          <div className="percentile-track" aria-label={`${metric.label}, ${metric.percentile}th percentile`}>
            <i style={{ width: `${metric.percentile}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
