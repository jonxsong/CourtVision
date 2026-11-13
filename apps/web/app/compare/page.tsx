import { ComparisonLab } from "@/components/comparison-lab";

export const metadata = { title: "Comparison Lab" };
export default function ComparePage() { return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Comparison lab</span><h1>Context changes<br />the comparison.</h1></div><p>Compare rate statistics, efficiency, and role-aware profiles. Every transformation is visible and documented.</p></div></section><section className="content-section shell"><ComparisonLab /></section></>; }
