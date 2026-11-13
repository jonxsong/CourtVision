import { DemoBadge } from "@/components/demo-badge";
import { PlayerDirectory } from "@/components/player-directory";
import { players } from "@/lib/demo-data";

export const metadata = { title: "Player DNA" };

export default function PlayersPage() {
  return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Player DNA</span><h1>Find the signal<br />in every season.</h1></div><div><DemoBadge /><p>Search detailed player profiles, efficiency, shot selection, and style similarity. This preview uses fictional players and deterministic statistics.</p></div></div></section><section className="content-section shell"><PlayerDirectory players={players} /></section></>;
}
