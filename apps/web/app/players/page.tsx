import { PlayerDirectory } from "@/components/player-directory";

export const metadata = { title: "Player DNA", alternates: { canonical: "/players" } };

export default function PlayersPage() {
  return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Player DNA</span><h1>Find the signal<br />in every season.</h1></div><div><span className="live-data-badge"><i /> NBA Stats</span><p>Search every active NBA player and evaluate current-season scoring, efficiency, playmaking, rebounding, and impact.</p></div></div></section><section className="content-section shell"><PlayerDirectory /></section></>;
}
