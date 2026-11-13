import { InsightTerminal } from "@/components/insight-terminal";

export const metadata = { title: "Ask CourtVision" };
export default function InsightsPage() { return <><section className="page-hero insight-page-hero"><div className="shell page-hero-row"><div><span className="kicker">Ask CourtVision</span><h1>Research, with<br />the receipts.</h1></div><p>Inspect real current-season NBA statistics. Retrieved facts and descriptive interpretation remain visibly separated.</p></div></section><section className="content-section shell"><InsightTerminal /></section></>; }
