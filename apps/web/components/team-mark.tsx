import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TeamMark({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" }) {
  return <span className={cn("team-mark", `team-mark-${size}`, `team-${team.abbreviation.toLowerCase()}`)}>{team.abbreviation}</span>;
}
