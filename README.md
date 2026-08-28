# Perfect Season

Multi-sport roster-draft games in the style of the viral **82-0**: spin for a
franchise and an era, draft one legend at a time into every roster spot, then
simulate a full season and find out how close you got to never losing a game.

Four games ship today, all from one engine:

| Game | Sport | Season | Roster | Real record to beat |
|---|---|---|---|---|
| `162-0` | Baseball (MLB) | 162 games | 11 | 116 wins — 1906 Cubs, 2001 Mariners |
| `82-0` | Basketball (NBA) | 82 games | 5 | 73 wins — 2015-16 Warriors |
| `17-0` | Football (NFL) | 17 games | 10 | 16-0 — 2007 Patriots |
| `38-0` | Soccer (English top flight) | 38 games | 11 | 32 wins — 2017-18 Man City |

## The bet this repo is making

The obvious version of this project — clone 82-0 for another sport, ship fast —
is mostly closed. Within weeks of 82-0 going viral there were `17-0` and `20-0`
for the NFL, at least six competing `38-0` sites for the Premier League, a
`162-0` for baseball, and three knockoff apps chasing the official 82-0 app on
the stores. Being fourth to a reskin is not a business.

So the architecture is the bet instead. Everything sport-specific lives behind
a single `Ruleset` interface, which means a new sport is a data pack and a
scoring function, not a new app. When the next league trends, the turnaround is
a day. Two things follow from that:

- **The engine is the asset**, not any one game.
- **The simulation is the differentiator.** The incumbents mostly add a
  roster's counting stats into a "strength rating" and map it onto a record.
  That is fast to build and it feels arbitrary to play, because it is. This one
  models each sport the way that sport is actually modelled.

## How the simulation works

Every sport reduces a roster to two numbers — expected points scored and
allowed per game — and then plays the season one game at a time against
opponents drawn from the league's quality distribution. Simulating game by game
rather than mapping a rating straight onto a record matters: a great roster can
still drop a game it should have won, which is the entire drama of chasing a
perfect season.

The record is then checked against **Pythagenpat** expectation, so the result
screen can separate "this roster was good" from "these dice were kind."

Where the sports differ:

**Baseball** uses Bill James' Runs Created identity, `RC = OBP × SLG × AB`,
applied to the *lineup's aggregate rates* over a team-season of at-bats — not
to nine players summed individually, which double-counts badly. Run prevention
comes from staff ERA weighted by realistic innings shares, scaled for unearned
runs. The model calibrates itself: a league-average lineup and a 4.00 ERA staff
returns 762 runs scored, 697 allowed, and 88 expected wins, which is what an
average MLB team actually does.

**Basketball** sums the five starters' production — legitimate here, since a
lineup shares the same possessions — then compresses it against a league-average
starting five with a fractional exponent to model usage saturation. Five
30-point scorers cannot all take 30 shots.

**Football** scores each player against a baseline for his own position, then
combines them with real positional-value weights. Quarterback carries ~40% of
offensive outcome alone. Linemen are graded on All-Pro selections and career
starts, the only durable public record of line play.

**Soccer** goes straight to Poisson, which is the settled model for goals per
match, and treats draws as real outcomes — a perfect season means 38 wins, not
38 unbeaten.

Calibration targets are real seasons, not vibes. Soccer's model returns ~2.7
goals a game for an all-time front six (the 2017-18 champions scored 2.79) and
~0.6 conceded for an all-time back line (the 2018-19 champions conceded 0.61).

### Why 162-0 is not actually reachable

It is worth saying plainly: with an honest baseball model, a perfect 162-game
season has odds around 1 in 20,000 even with optimal drafting. That is a fact
about baseball, not a bug in the sim, and faking it would mean throwing away
the model that makes the game feel real.

So every result is also graded against **the best real season on record**. A
129-33 means something — it beat the 2001 Mariners. Chasing 116 is a target
players can actually hit, argue about, and share. The title stays `162-0`
because that is what people search for; the scoreboard is honest underneath it.

Basketball and football, with their shorter seasons, do produce genuine perfect
runs — roughly 4% and 1% of optimally drafted rosters respectively.

## Design decisions that matter

**No dead spins.** The genre's worst failure is landing on a franchise/era with
nobody you can legally play; it reads as the game being broken rather than as a
hard choice. `eligibleCombos` filters the reel to pools that can actually fill a
slot you still have open, so every spin is playable and the tension comes from
the trade-off. This is enforced by a test.

**Seeded and reproducible.** A run is fully described by its seed and picks, so
a share link replays someone else's exact draft — same reel, same pools — rather
than just showing their score. You do not beat a number, you beat a specific
run. The season seed is derived from the roster too, so re-simulating cannot be
used to reroll a bad result.

**One re-spin per run.** A scarce resource turns a bad spin into a decision.

**Mobile-first, not desktop-shrunk.** The draft never scrolls the page, tap
targets clear 44px, and the type scale is viewport-driven.

**Static.** All four games prerender to static HTML with no server calls, so
hosting is free and a viral spike costs nothing.

## Project structure

```text
engine/            Sport-agnostic core — no React, no sport knowledge
  types.ts           The Ruleset contract every sport implements
  rng.ts             Seeded deterministic RNG (mulberry32, Poisson, normal)
  draft.ts           Spin/pick state machine, feasibility-aware reel
  season.ts          Game-by-game simulation, Pythagenpat expectation
  run.ts             Orchestration: draft -> rating -> season
  share.ts           Share-code encode/decode, daily seeds
sports/
  parse.ts           Pipe-delimited roster table parser
  baseball/          162-0 — Runs Created + staff ERA  (flagship)
  basketball/        82-0  — usage-compressed lineup production
  football/          17-0  — position-weighted grading
  soccer/            38-0  — Poisson goals, draws enabled
app/                 Next.js routes; /[slug] renders each game
components/          Game shell, draft board, season report
scripts/             Lahman database importer
tests/               Engine determinism, sim math, data integrity
```

## Data and provenance

Roster packs are hand-curated career lines for recognizable players — enough to
make each game playable and balanced. Pre-2000 figures are the standard
published career numbers; players with recent or ongoing careers carry rounded
approximations. Two packs carry explicit caveats in their file headers:

- **Basketball**: steals and blocks were not official NBA statistics before
  1973-74, so earlier lines use researcher estimates.
- **Soccer**: attacking output is real (club goals, assists, appearances), but
  defenders and goalkeepers have no equivalent public counting stat, so that
  pack carries a labelled editorial strength grade. It is judgment, and it is
  marked as judgment.
- **Baseball** includes Negro Leagues players following MLB's 2020 recognition
  of those records, which are less complete than post-1920 AL/NL bookkeeping.

For exact, sourced, season-level baseball data, run the importer:

```bash
# 1. Download the Lahman database (CC BY-SA 3.0, 1871-present):
#    https://sabr.org/lahman-database/
# 2. Unzip People.csv, Batting.csv, Pitching.csv, Fielding.csv into data/lahman/
npm run import:lahman
```

That emits `sports/baseball/players.generated.ts` in the same table format, with
the best seasons per franchise/era/position. The Lahman data is CC BY-SA 3.0 —
derived data inherits ShareAlike and must credit Sean Lahman, which is why the
generated file is gitignored rather than committed without that decision.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # engine determinism, sim math, data integrity
npm run typecheck
npm run build        # static export of all four games
```

Requires Node 22+.

## Adding a sport

Implement `Ruleset` and register it. Concretely:

1. Create `sports/<name>/index.ts`.
2. Define `slots`, `eras`, `franchises`, and a player table parsed by
   `parsePlayers`.
3. Write `rate(roster)` — reduce a roster to `{ offense, defense, factors }`.
   The `factors` array is what the result screen explains the record with, so
   make each one something a fan would argue about.
4. Set `context` (league average, spread, `poisson` or `normal`) and
   `benchmark` (the best real season).
5. Add it to `SPORTS` in `sports/index.ts`.

The route, draft loop, reel, share codes, and season report all come for free.
`tests/sports.test.ts` will immediately check the new pack for unknown
franchises, thin slots, dead spins, and implausible ratings.

## Native apps

The games are built web-first because that is where this genre spreads — a
share link into a group chat is the whole growth loop, and an app-store-only
version has no equivalent. The engine and sport packs are plain TypeScript with
no DOM dependencies, so they lift into an Expo/React Native shell unchanged;
only `components/` needs a native counterpart.

## Legal note

Player names and statistics are used to identify real athletes and their public
performance records. Statistics are facts and not copyrightable; names and
likenesses are a different question, and any commercial launch should get an
opinion on right-of-publicity and league trademark exposure in the target
markets. No league logos, team marks, or player images are used or bundled.
