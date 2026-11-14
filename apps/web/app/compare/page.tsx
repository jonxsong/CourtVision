import { ComparisonLab } from "@/components/comparison-lab";

export const metadata = { title: "Comparison Lab", alternates: { canonical: "/compare" } };
export default function ComparePage() { return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Comparison lab</span><h1>Context changes<br />the comparison.</h1></div><p>Select any two active NBA players and compare their real current-season production, efficiency, usage, and impact.</p></div></section><section className="content-section shell"><ComparisonLab /></section></>; }
