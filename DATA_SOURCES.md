# Data sources

Data acquisition is the highest external risk in CourtVision. Product code is designed to outlive any provider, but legal rights, coverage, latency, and cost determine which features can actually ship.

Reviewed: November 12, 2026. Terms and commercial offerings change; re-review before every production launch.

## Current strategy

1. Use BALLDONTLIE for the current NBA schedule, game state, and scores.
2. Use NBA Stats-compatible endpoints through the `nba_api` contract for real player and shot data.
3. Refresh versioned static snapshots so cloud-IP blocking does not make the public product unusable.
4. Never replace missing upstream values with synthetic statistics.
5. Store source, season, fetch time, and freshness beside every normalized dataset.

## Provider matrix

| Source | Coverage | Cost/rate limits | Reliability | Rights / product fit | Decision |
|---|---|---|---|---|---|
| Sportradar NBA | Schedule, rosters, stats, live play-by-play; official NBA source in covered products | Trial available; commercial quote/plan required | Commercial SLA options | Contract must specify display, storage, and redistribution | Preferred production evaluation |
| BALLDONTLIE | Players/games on free tier; richer box scores, plays, shot charts and win probabilities on paid tiers | Free tier: 5 requests/minute | Developer-oriented service | Review current terms and downstream display rights | Implemented for free schedule and scores |
| `nba_api` / NBA Stats | Active roster, season metrics, advanced rates, shot coordinates | No API key; unofficial endpoints throttle and may block cloud IPs | Community contract over unstable endpoints | Review NBA terms before public or commercial redistribution | Implemented with versioned snapshots |
| NBA.com/Stats | Broad first-party viewing experience | Not a supported downloadable developer feed | Endpoint behavior can change | NBA terms restrict many database, real-time, and commercial uses | Upstream source; never treated as an SLA |

Primary references:

- [NBA.com Terms of Use](https://www.nba.com/termsofuse)
- [NBA Stats FAQ](https://www.nba.com/stats/help/faq)
- [Sportradar NBA overview](https://developer.sportradar.com/basketball/reference/nba-overview)
- [Sportradar Synergy FAQ](https://developer.sportradar.com/basketball/reference/synergy-basketball-faqs)
- [BALLDONTLIE NBA API](https://nba.balldontlie.io/)

This document is engineering due diligence, not legal advice.

## Capability gate

| Product feature | Required provider capability |
|---|---|
| Player directory | Stable players, teams, rosters |
| Player DNA | Season totals, minutes, attempts, documented advanced fields |
| Game intelligence | Schedule, participants, scores, ordered play-by-play |
| Live game | Contracted low-latency events and live-display rights |
| Shot explorer | Shot x/y coordinates with documented coordinate system |
| Win probability | Historical event corpus and timestamp-available pregame features |

If a feed lacks coordinates, CourtVision must return `available: false` with a reason. Coordinates will never be imputed and displayed as observed shots.

## Provenance record

Every ingestion should capture:

- source and provider version;
- external entity/event ID;
- request or file timestamp;
- effective game/season timestamp;
- permitted raw payload location, when storage is allowed;
- normalized row version;
- checksum and ingestion job ID;
- freshness and last-success timestamps.

## Implemented no-cost mode

BALLDONTLIE is configured with `COURTVISION_BALLDONTLIE_API_KEY` through a hosted secret. The public Worker exposes real schedules, game state, and scores through a 60-second cache.

`services/live-api-site/scripts/refresh-nba-snapshot.mjs` retrieves the current roster, per-game base and advanced metrics, and league-wide shot-chart detail. It writes one player snapshot plus per-player shot assets, allowing the browser to download only the selected player's attempts. The Worker also bundles the player snapshot as its cloud-egress fallback.

The checked-in November 12, 2026 snapshot contains 523 active players and 30,414 real 2026–27 field-goal attempts. Refresh it with `node services/live-api-site/scripts/refresh-nba-snapshot.mjs` before releases.

## Rate protection

Adapters own a token-bucket limiter, request timeout, exponential backoff with jitter, and `Retry-After` handling. Scheduled work should prioritize live games, then recent finals, then low-frequency reference data. Backfills are isolated from live request budgets.
