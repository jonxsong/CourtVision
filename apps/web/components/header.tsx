import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

const links = [
  ["Players", "/players"], ["Compare", "/compare"], ["Games", "/games"],
  ["Shots", "/shots"], ["Insights", "/insights"]
];

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="CourtVision home">
          <span>Court</span><strong>Vision</strong><i aria-hidden="true" />
        </Link>
        <nav aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link href="/players" className="icon-link" aria-label="Search players"><Search size={18} /></Link>
          <Link href="/insights" className="ask-link"><Sparkles size={15} /> Ask CV</Link>
        </div>
      </div>
    </header>
  );
}
