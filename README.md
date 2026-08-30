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

Calibration is checked against real baseball twice over. A league-average
lineup returns 724 runs against a real MLB average near 740; feed it the 1927
Yankees' actual line and it returns 981 runs against the 975 they really
scored. Both fall out of the formula rather than being tuned in, and a test
fails if either drifts.

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
| Taking whoever | 89 | 0% |
| Middling picks | 88 | 0.3% |
| Picking the best card each spin | 109 | 14% |
| Exhaustive optimizer | 110 | 15% |

Beating the all-time record is a real achievement and a real brag. Going 162-0
is the ghost you chase. A test guards this curve, so a future change that makes
a middling draft blow past the record again fails CI rather than shipping.

Getting here took four corrections, and all four were places the model was
quietly generous rather than places the game was tuned wrong:

- **Projection regression.** A player's line with one franchise in one decade is
  what he did *in that context*. Projecting him elsewhere means regressing 18%
  toward league average, which every serious projection system does.
- **Real home-run rates.** Estimating homers from isolated power counts doubles
  and triples as homers — it credited the 1927 Yankees with 280 when they hit
  158, and in BaseRuns a homer scores itself.
- **Defence.** Nothing stopped a player stacking nine sluggers up the middle.
  Range factor from the fielding tables is now weighted by position, so a
  shortstop who cannot field costs real runs and the DH costs none.
- **Real regulars, not a best-of.** The roster pack keeps the three players who
  logged the most time at each franchise, era, and position — not the three
  best. The tension in this genre comes from spinning a team that has nothing
  you need, and that only exists if the data admits teams that had nothing.

## Reading the game without knowing baseball

Baseball's stat lines are unreadable to a newcomer. `.276/.346/.362` and
`3.41 ERA` are not comparable to each other, and neither one tells you whether
the player is any good — a 3.41 ERA was extraordinary in 1968 and ordinary in
1999.

So every player carries a **0-99 rating** and a plain-English label, and the
pick list is sorted best-first. The rating is not a separate scale invented for
the card: it is the player's **runs above what a league-average player produces
over a season**, which is the exact currency the season simulation runs on. A
bat's hitting and fielding and an arm's run prevention all reduce to it, which
makes them directly comparable and makes the number honest — it ranks players
by precisely what the game rewards.

50 is a league-average regular. The pool's median is 53. Babe Ruth rates 99;
Bill Bergen, the standard example of the worst hitter in major league history,
rates 12. A test asserts both, and asserts that the top-rated bat really does
outscore the bottom-rated one in the simulation, so the rating can never drift
away from what the sim actually does.

Pitchers top out near 79 where bats reach 99. That is not a bug in the scale —
you draft nine bats and four arms, so a single bat is worth more to this roster
than a single arm. The rating tells you the truth about the trade.

## The Daily Challenge

Everyone gets the same spins, once a day, with **no re-spins**. You cannot dodge
a thin franchise, so the skill is squeezing the best roster out of whatever the
date hands you, and the argument becomes about choices rather than luck.

The share card carries the record, the day number, and a small progress bar —
and deliberately **not the roster**. Everyone played the same draft, so the only
interesting question is what someone else did with it. Revealing the picks
answers that question and removes the reason to open the game.

```text
162-0 Daily #63
118-44
■■■■■■■□□□
```

Today's result is remembered locally, so the daily reads as a single attempt
rather than something to grind.

## Interface

The draft is two screens, not one, because the spin and the pick are two
different moments and cramming them together wastes both.

**The spin screen** is the reels, a SPIN button, the running projection, and the
roster as a baseball field.

- **The roster is a field, not a list.** The nine fielders sit where they
  actually stand — the ace on the mound, the catcher behind the plate, the
  outfield beyond the arc — with the designated hitter and the rest of the staff
  off to the side, because that is where they are. "SS" and "CF" are jargon
  until you see the position; the diagram is the sport's own and needs no
  legend.
- **Two reels, team and era**, drawn separately the way a slot machine reads,
  and stopping at different times so each landing gets its own beat.
- **An explicit SPIN button.** Auto-rolling straight into a list throws away the
  one moment of anticipation the genre has.
- **A reel that decelerates, with sound.** Clicks are spaced by the inverse of
  an ease-out curve, so they start about 50ms apart and finish 300ms apart —
  the tail is where the tension is. Every click and thunk is synthesized with
  the Web Audio API: the game ships as one self-contained file whose host blocks
  external media, so a few oscillators cost a few hundred bytes where sound
  files would cost hundreds of kilobytes and a network round trip. Audio stays
  silent until the first tap, and Sounds and Haptics both have toggles, because
  a game that makes noise with no way to stop it gets closed.
- **A live projection** with the all-time 116-win mark drawn on the bar,
  updating on every pick. Empty slots project as league-average players, so it
  answers "if I stopped here, what would this team do?" That turns each pick
  into a visible consequence and teaches a newcomer what good looks like without
  a tutorial.

**The pick screen** is the player list, with the roster compressed into a
thirteen-slot dock so nothing has to be remembered from the previous screen.

- **Filter and search**: all, infield, outfield, pitchers, plus a name search.
- **Labelled stat columns** rather than a slash line. `.276/.346/.362` is
  unreadable unless you already know the order; a column with `OBP` written
  under it at least names the number.
- **Historical club names.** Brooklyn Dodgers, Philadelphia Athletics, St. Louis
  Browns, Montreal Expos — not the modern franchise that inherited them.

## Eras

The reel spins one decade at a time, 1900s through 2010s. Twelve buckets
rather than the six wide ones this replaced, which is both truer to how fans
argue ("the 70s Reds", not "the 1960s-70s Reds") and better for the draft: it
splits long careers into the decades they actually happened in, so a spin
offers 12.7 players on average and almost never fewer than three.

Labels come from when a club really played, not from the seasons of the players
on offer. A franchise that was around all decade gets the decade; one that
arrived partway through gets the years it was there, so the Mariners read
"1977-1979" rather than "1970s".

There is no 2020s. The open databank stops at 2020 and that lone season is the
60-game pandemic year — around 220 plate appearances for a regular, which is
noise, not a career. Drop a newer databank into `data/lahman`, re-run the
importer, and the decade fills itself: era ids are derived from the year.

Playing-time floors scale with how much of a decade the data covers, so a
partly-covered decade is not asked for a full decade's worth of at-bats.

## Design decisions that matter

**A full roster, thirteen picks.** The nine in the batting order plus three
starters and a closer. One pitcher meant every team ended up with a
near-league-average staff, which flattened the win distribution.

**Real regulars, not a best-of.** The roster pack keeps the three players who
logged the most *time* at each franchise, era, and position — not the three
best. The tension in this genre comes from spinning a team that has nothing you
need, and that only exists if the data admits teams that had nothing.

**Honest era labels.** The reel shows the years a franchise actually fielded
players in that bucket, so the Mariners never appear under "1960s-70s" when
they did not exist until 1977.

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

The roster pack is generated from the **Lahman Baseball Database / Chadwick
Baseball Databank** — 2,662 players covering 30 franchises and 120 years, the
three who logged the most time at each franchise, era, and position. Every rate,
home-run rate, and fielding number traces back to real box scores.

Negro Leagues players are carried by hand on top: MLB recognized those records
in 2020, but the 2021 databank predates their integration. Their figures follow
the published Seamheads / Negro Leagues Database numbers and are less complete
than post-1920 AL/NL bookkeeping, and they carry a defensive rating of zero
rather than an invented one.

**The data is CC BY-SA 3.0.** That is a copyleft license with real attribution
and ShareAlike obligations — see [DATA-LICENSE.md](DATA-LICENSE.md) before any
commercial launch.

To regenerate the pack:

```bash
# 1. Download the Lahman database (CC BY-SA 3.0, 1871-present):
#    https://sabr.org/lahman-database/
# 2. Unzip People.csv, Batting.csv, Pitching.csv, Fielding.csv into data/lahman/
npm run import:lahman
```

That emits `sports/baseball/players.generated.ts`. The importer is deliberately
the only thing that touches the raw database, so swapping to a differently
licensed source means changing one script.

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
