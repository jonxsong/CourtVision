# Data sources

Data acquisition is the highest external risk in CourtVision. Product code is designed to outlive any provider, but legal rights, coverage, latency, and cost determine which features can actually ship.

Reviewed: November 12, 2026. Terms and commercial offerings change; re-review before every production launch.

## Current strategy

1. Use the deterministic provider for development, testing, screenshots, and public source review.
2. Do not scrape NBA.com or treat unofficial endpoints as a production contract.
3. Use a licensed commercial feed for real NBA game accounts, live events, and redistribution.
4. Enable only the capabilities explicitly included in the selected provider agreement.
5. Store provenance and freshness beside every normalized dataset.

## Provider matrix

| Source | Coverage | Cost/rate limits | Reliability | Rights / product fit | Decision |
|---|---|---|---|---|---|
| CourtVision demo | Players, profiles, games, events, shots | Free; local | Fully deterministic | Fictional data owned by project | Default |
| Sportradar NBA | Schedule, rosters, stats, live play-by-play; official NBA source in covered products | Trial available; commercial quote/plan required | Commercial SLA options | Contract must specify display, storage, and redistribution | Preferred production evaluation |
| BALLDONTLIE | Players/games on free tier; richer box scores, plays, shot charts and win probabilities on paid tiers | Free tier: 5 requests/minute | Developer-oriented service | Review current terms and downstream display rights | Implemented for free schedule and scores |
| `nba_api` | Community client for NBA.com stats and live endpoints | Unofficial endpoints throttle and may block cloud IPs | Community maintained | NBA.com terms restrict reuse and public display without permission | Local research only; never public production |
| NBA.com/Stats | Broad first-party viewing experience | Not a supported downloadable developer feed | Endpoint behavior can change | NBA terms restrict many database, real-time, and commercial uses | Do not scrape |

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

## Implemented free mode

Set `COURTVISION_DATA_PROVIDER=balldontlie` and provide `COURTVISION_BALLDONTLIE_API_KEY` through an ignored `.env` file or production secret manager. The adapter currently exposes real teams, players, schedules, game state, and scores. Paid-only fields return explicit unavailable states; CourtVision does not fill them with estimates.

The public static deployment receives a timestamped, server-generated score snapshot. The provider key is never bundled into browser JavaScript. Continuous refresh requires the planned server-backed runtime or scheduled trusted updater.

## Rate protection

Adapters own a token-bucket limiter, request timeout, exponential backoff with jitter, and `Retry-After` handling. Scheduled work should prioritize live games, then recent finals, then low-frequency reference data. Backfills are isolated from live request budgets.
