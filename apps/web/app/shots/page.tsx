import { ShotExplorer } from "@/components/shot-explorer";

export const metadata = { title: "Shot Explorer" };
export default function ShotsPage() { return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Shot explorer</span><h1>Every shot leaves<br />a fingerprint.</h1></div><p>Explore shot location, result, distance, and zone efficiency on a custom SVG half-court.</p></div></section><section className="content-section shell"><ShotExplorer /></section></>; }
