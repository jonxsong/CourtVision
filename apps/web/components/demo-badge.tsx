import { FlaskConical } from "lucide-react";

export function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="demo-badge" title="Synthetic deterministic data—not NBA statistics">
      <FlaskConical size={12} aria-hidden="true" /> {compact ? "Demo" : "Deterministic demo data"}
    </span>
  );
}
