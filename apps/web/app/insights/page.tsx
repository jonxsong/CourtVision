import { InsightTerminal } from "@/components/insight-terminal";

export const metadata = { title: "Ask CourtVision", alternates: { canonical: "/insights" } };
export default function InsightsPage() { return <><section className="page-hero insight-page-hero"><div className="shell page-hero-row"><div><span className="kicker">Ask CourtVision</span><h1>Your NBA questions.<br />Grounded answers.</h1></div><p>Chat with an NBA research assistant that retrieves CourtVision player, shot, and live game data before answering.</p></div></section><section className="content-section shell"><InsightTerminal /></section></>; }
