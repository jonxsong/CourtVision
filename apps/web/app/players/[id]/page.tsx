import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge } from "@/components/demo-badge";
import { MetricGrid } from "@/components/metric-grid";
import { getProfile } from "@/lib/demo-data";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const profile = getProfile(id); if (!profile) notFound();
  return <>
    <section className="profile-hero"><div className="shell"><div className="breadcrumbs"><Link href="/players">Players</Link><span>/</span><span>{profile.name}</span></div><div className="profile-main"><div className="profile-avatar">{profile.initials}</div><div className="profile-title"><DemoBadge /><h1>{profile.name}</h1><p>{profile.team.city} {profile.team.name} · {profile.position} · #{profile.number}</p></div><div className="profile-meta"><div><small>Height</small><strong>{profile.bio.height}</strong></div><div><small>Weight</small><strong>{profile.bio.weight}</strong></div><div><small>Experience</small><strong>{profile.bio.experience}</strong></div></div></div><div className="profile-tabs"><span>Overview</span><span>Shooting</span><span>Trends</span><span>Similar players</span></div></div></section>
    <section className="profile-content shell"><div className="section-label"><h2>Season pulse</h2><span>{profile.season} · {profile.gamesPlayed} games · {profile.minutesPerGame} MPG</span></div><MetricGrid metrics={profile.metrics} /><div className="analysis-grid"><div className="panel"><h3>Scoring trajectory</h3><span className="panel-subtitle">Points per game · four-season view</span><div className="trend-chart">{profile.trend.map(season => <div className="trend-column" key={season.season}><b>{season.points.toFixed(1)}</b><i style={{ height: `${season.points / 32 * 100}%` }} /><span>{season.season}</span></div>)}</div></div><div className="panel"><h3>Shot zones</h3><span className="panel-subtitle">Accuracy and sample size</span><div className="zone-list">{profile.zones.map(zone => <div className="zone-row" key={zone.zone}><span>{zone.zone}</span><b>{zone.fgPct.toFixed(1)}%</b><small>{zone.attempts} FGA</small></div>)}</div></div></div></section>
  </>;
}
