# 162-0

Draft nine legends. Play a season. Try not to lose a game.

A roster-draft game in the style of the viral **82-0**, built for baseball:
spin for a franchise and an era, draft one player into each of the nine
fielding positions, then simulate all 162 games and find out how close you got
to a perfect season.

**One sport, done properly.** 82-0 spawned copies within weeks — `17-0` and
`20-0` for the NFL, at least six competing `38-0` sites for the Premier League,
knockoff apps chasing the official 82-0 app on the stores. Spreading across
four leagues means splitting the audience four ways and being second-best in
every one of them. So this is an MLB game, and the way it wins is by being a
better *baseball* game than the versions that treat the sport as a reskin.

## What makes it a better baseball game

Most versions of this genre add a roster's counting stats into a single
"strength rating" and map that onto a record. That is fast to build and it
feels arbitrary to play, because it is. Three things here are different, and
all three are things a baseball fan will notice.

### 1. Stats are adjusted for the era they were put up in

A 2.17 ERA in 1913 is not a 2.17 ERA today — the whole league sat near 2.75
back then. Comparing raw numbers across a century makes deadball pitchers look
superhuman and 1960s hitters look weak. Every stat is normalized against its own
decade's league average before it is used, the same idea behind ERA+ and OPS+.
Walter Johnson's 2.17 becomes an era-adjusted 3.20; Bob Gibson's 1968 season
gains rather than loses.

### 2. Runs come from BaseRuns, not a strength rating

BaseRuns is the run estimator built for extreme teams. Its core term is a
*rate* — the share of baserunners who come around to score — so it can never
return more runs than the number of men who actually reached base. Stack nine
sluggers and the offense compounds hard but stays inside physical reality.
Linear estimators happily project past it.

Calibration is checked against real baseball: a league-average lineup and a
league-average ace returns 729 runs scored and 705 allowed, against a real MLB
average near 740. That falls out of the formula rather than being tuned in, and
a test fails if it drifts.

### 3. Your ace does not pitch all 162 games

A real ace throws about 15% of a team's innings. Letting the drafted pitcher's
ERA stand in for the whole staff is the single biggest reason a roster of
legends used to run away with the season. Here he anchors the staff at 25% and
the rest of the rotation is league average — enough that the pick matters a
lot, honest enough that it does not hand you a sub-3.00 team ERA for free.

There is a fourth, smaller one that matters more than it sounds: **nobody plays
162 games.** Real regulars start about 143 of them, so the drafted nine take 88%
of the plate appearances and a replacement-level bench takes the rest.

## Difficulty

The point of the game is that a perfect season is out of reach and the real
record is not. With an honest model, 162-0 has odds around 1 in 20,000 even
drafting optimally — that is a fact about baseball, and faking it would mean
throwing away the model that makes the rest feel real.

So every result is graded against **the best real season on record: 116 wins**,
by the 1906 Cubs and 2001 Mariners. As tuned:

| How you play | Median wins | Beats 116 |
|---|---|---|
| Taking whoever | 102 | 6% |
| Middling picks | 100 | 2% |
| Drafting well | 107 | 17% |

Beating the all-time record is a real achievement and a real brag. Going 162-0
is the ghost you chase. A test guards this curve, so a future change that makes
a middling draft blow past the record again fails CI rather than shipping.

## Design decisions that matter

**Nine picks, one per position.** The roster is the nine fielding positions, 1
through 9 on a scorecard — baseball's answer to 82-0's starting five. The whole
team on the field, short enough to play in a couple of minutes.

**Ordinary players in the pool.** A pool made only of legends means every spin
is a good spin, which removes the entire tension of the draft. Alongside the
Hall of Famers are real everyday regulars — some good, some genuinely poor bats
kept in the lineup for their glove — so landing on a thin franchise/era actually
costs you something.

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
engine/            Game core — no React, no baseball knowledge
  types.ts           The Ruleset contract the sport pack implements
  rng.ts             Seeded deterministic RNG (mulberry32, Poisson, normal)
  draft.ts           Spin/pick state machine, feasibility-aware reel
  season.ts          Game-by-game simulation, Pythagenpat expectation
  run.ts             Orchestration: draft -> rating -> season
  share.ts           Share-code encode/decode, daily seeds
sports/
  parse.ts           Pipe-delimited roster table parser
  baseball/          Era adjustment, BaseRuns, staff model, roster pack
app/                 Next.js app; one route, the game
components/          Game shell, draft board, season report
standalone/          Entry for the single-file build
scripts/             Lahman importer, standalone bundler
tests/               Engine determinism, sim math, data integrity, difficulty
```

The engine stays separate from the baseball pack behind a `Ruleset` interface.
That is not a plan to add more sports — it is what keeps the simulation
testable on its own and the run-scoring model swappable when the Lahman import
replaces the seed data.

## Data and provenance

The roster pack is hand-curated career lines — Hall of Famers alongside ordinary
regulars, so the draft has real downside. Pre-2000 figures are the standard
published career numbers; players with recent or ongoing careers carry rounded
approximations. Negro Leagues players are included following MLB's 2020
recognition of those records, which are less complete than post-1920 AL/NL
bookkeeping.

For exact, sourced, season-level data, run the importer:

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
npm run dev              # http://localhost:3000
npm test                 # determinism, sim math, data integrity, difficulty
npm run typecheck
npm run build            # static export
npm run build:standalone # single self-contained HTML file
```

Requires Node 22+.

## Tuning the game

The knobs that move difficulty all live at the top of `sports/baseball/index.ts`
and every one of them is a real quantity, not a magic number:

- `ACE_INNINGS_SHARE` — how much of the staff your drafted pitcher is
- `STARTER_PA_SHARE` / `BENCH` — how much of the season the bench plays
- `REF` and `leagueEnv()` — the reference run environment and the per-decade
  league averages every stat is rebased against

`tests/sports.test.ts` holds the difficulty curve in place. Change a knob, run
`npm test`, and it tells you if a middling draft started beating the 2001
Mariners again.

## Native apps

The game is built web-first because that is where this genre spreads — a share
link into a group chat is the whole growth loop, and an app-store-only version
has no equivalent. The engine and roster pack are plain TypeScript with no DOM
dependencies, so they lift into an Expo/React Native shell unchanged; only
`components/` needs a native counterpart.

`npm run build:standalone` also emits a single self-contained HTML file with
React, the engine, the roster data, and the CSS inlined. It runs from a file://
URL or any static host with no server and no network — useful for testing on a
phone without a dev machine.

## Legal note

Player names and statistics are used to identify real athletes and their public
performance records. Statistics are facts and not copyrightable; names and
likenesses are a different question, and any commercial launch should get an
opinion on right-of-publicity and league trademark exposure in the target
markets. No league logos, team marks, or player images are used or bundled.
