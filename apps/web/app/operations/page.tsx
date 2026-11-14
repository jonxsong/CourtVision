import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  KeyRound,
  LockKeyhole,
  RadioTower,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export const metadata = { title: "Data Operations", alternates: { canonical: "/operations" } };

const pipeline = [
  { icon: RadioTower, label: "Providers", detail: "NBA Stats + BALLDONTLIE" },
  { icon: Gauge, label: "Rate guard", detail: "60s games · 15m analytics" },
  { icon: ShieldCheck, label: "Normalize", detail: "Typed, validated records" },
  { icon: RefreshCw, label: "Upsert", detail: "Checksum + stable IDs" },
  { icon: Database, label: "Serve", detail: "Sites Worker → browser" },
];

const sources = [
  { name: "BALLDONTLIE", role: "Live games", state: "Online", detail: "Current schedules, game state, and real-time scores through the server-side key.", tone: "ready" },
  { name: "NBA Stats / nba_api", role: "Player analytics", state: "Online", detail: "Active rosters, base and advanced player metrics, and real shot-location events.", tone: "ready" },
  { name: "Sportradar", role: "Production upgrade", state: "Optional", detail: "Official commercial path for contracted real-time play-by-play and redistribution rights.", tone: "optional" },
];

export default function OperationsPage() {
  return (
    <>
      <section className="page-hero shell operations-hero">
        <div className="page-hero-row">
          <div><span className="kicker">Data operations · Build 01</span><h1>Trust the feed.<br /><em>Then</em> trust the model.</h1></div>
          <p>CourtVision now has a provider-neutral ingestion boundary for real basketball data—rate protected, provenance aware, and idempotent when providers resend or reorder events.</p>
        </div>
      </section>

      <section className="shell operations-status" aria-label="Connector status">
        <article><CheckCircle2 size={18} /><span>Connectors</span><strong>Real NBA feeds online</strong><p>Players, shots, schedules, game state, and scores.</p></article>
        <article><ShieldCheck size={18} /><span>Safety rails</span><strong>Validated contracts</strong><p>Timeouts, caches, schema normalization, and last-known-good responses.</p></article>
        <article><LockKeyhole size={18} /><span>Public runtime</span><strong>Live service online</strong><p>The hosted secret stays server-side behind a 60-second provider cache.</p></article>
      </section>

      <section className="content-section shell">
        <div className="operations-heading"><div><span className="kicker">01 · Ingestion path</span><h2>One controlled path from source to screen.</h2></div><p>Every batch carries its source, provider version, fetch time, checksum, target game, and job outcome.</p></div>
        <div className="pipeline-map">
          {pipeline.map(({ icon: Icon, label, detail }, index) => (
            <div className="pipeline-step" key={label}>
              <div><Icon size={21} /></div><small>0{index + 1}</small><strong>{label}</strong><span>{detail}</span>
              {index < pipeline.length - 1 && <ArrowRight className="pipeline-arrow" size={17} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <section className="operations-band">
        <div className="shell">
          <div className="operations-heading"><div><span className="kicker">02 · Source policy</span><h2>Free where it is safe.<br />Licensed where it matters.</h2></div><p>Capability and permission are separate gates. Open-source client code does not grant rights to republish the data it retrieves.</p></div>
          <div className="source-table">
            <div className="source-head"><span>Source</span><span>Role</span><span>Capability</span><span>Status</span></div>
            {sources.map((source) => <article key={source.name}><strong>{source.name}</strong><span>{source.role}</span><p>{source.detail}</p><em className={`source-state ${source.tone}`}>{source.state}</em></article>)}
          </div>
        </div>
      </section>

      <section className="content-section shell setup-grid">
        <div>
          <span className="kicker">03 · Connect the free key</span><h2>Private by default.</h2>
          <p>The key belongs in the ignored server environment—not in GitHub, browser JavaScript, screenshots, or documentation.</p>
          <div className="secret-example"><KeyRound size={18} /><code>COURTVISION_BALLDONTLIE_API_KEY=••••••••</code></div>
        </div>
        <ol className="setup-steps">
          <li><span>1</span><div><strong>Authenticate the provider</strong><p>The free connector has now been verified against a real NBA slate.</p></div></li>
          <li><span>2</span><div><strong>Keep credentials server-side</strong><p>Use the ignored <code>.env</code> file locally and a secret manager in production.</p></div></li>
          <li><span>3</span><div><strong>Never manufacture gaps</strong><p>Unavailable upstream values render as unavailable instead of becoming synthetic statistics.</p></div></li>
        </ol>
        <div className="setup-links">
          <a href="https://nba.balldontlie.io/" target="_blank" rel="noreferrer">Provider documentation <ArrowRight size={15} /></a>
          <Link href="/games">View today&apos;s NBA slate <ArrowRight size={15} /></Link>
        </div>
      </section>
    </>
  );
}
