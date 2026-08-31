# 162-0

Draft thirteen legends. Play a season. Try not to lose a game.

A roster-draft game in the style of the viral **82-0**, built for baseball:
spin for a franchise and a decade, draft a full roster — nine in the batting
order, three starters and a closer — then simulate all 162 games and find out
how close you got to a perfect season.

**One sport, done properly.** 82-0 spawned copies within weeks — `17-0` and
`20-0` for the NFL, at least six competing `38-0` sites for the Premier League,
knockoff apps chasing the official 82-0 app on the stores. Spreading across
four leagues means splitting the audience four ways and being second-best in
every one of them. So this is an MLB game, and the way it wins is by being a
better *baseball* game than the versions that treat the sport as a reskin.

## What makes it a better baseball game

Most versions of this genre add a roster's counting stats into a single
"strength rating" and map that onto a record. That is fast to build and it
feels arbitrary to play, because it is. Four things here are different, and all
four are things a baseball fan will notice.

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

A real ace throws about 15% of a team's innings. Letting one drafted pitcher's
ERA stand in for the whole staff is the single biggest reason a roster of
legends used to run away with the season. So you draft three starters and a
closer: the rotation covers 40% of the innings, the closer 9% weighted for
leverage, and the half of the season nobody you drafted pitches runs at league
average. The picks matter a lot; they do not hand you a sub-3.00 team ERA.

The same applies to the bats. **Nobody plays 162 games.** Real regulars start
about 143 of them, so the drafted nine take 84% of the plate appearances and a
replacement-level bench takes the rest — which is why a roster of nine stars
still does not score like nine stars.

### 4. The draft is a draft, not a slot machine

Every open position shows what is still typically available there, and the
positions are genuinely unequal — 42 at shortstop against 59 at first base. So
the correct pick is often not the highest number on the screen, and the game
becomes about what you give up rather than what you take. See
[Position scarcity](#position-scarcity).

## The series

A win total is a number. *Beat the 1927 Yankees in six* is the argument every
baseball fan has already had.

So a season strong enough earns a best-of-seven against one of twelve
legendary teams, drawn from the seed so each draft gets a different one. Their
records are real — Murderers' Row, the 1906 Cubs, the Big Red Machine, the
2001 Mariners — and they play at their real strength:

| | Record | Runs scored / allowed |
|---|---|---|
| 1906 Cubs | 116-36 | 705 / 381 |
| 1927 Yankees | 110-44 | 975 / 599 |
| 2001 Mariners | 116-46 | 927 / 627 |
| 1939 Yankees | 106-45 | 967 / 556 |
| …and eight more | | |

Their run rates are rebased into the game's own scoring environment the same
way every player's line is, because the 1906 Cubs scored 4.7 a game in a league
where that was a lot. Left unscaled they would look punchless next to a modern
club; scaled, their run prevention is the best on the board, which is what it
actually was. Both rates move by the same factor, so the differential that made
them great survives.

**Beating one is hard on purpose.** Measured across 200 drafts, teams that
reach a series win it **35%** of the time. Short series are mostly noise, which
is the point rather than a flaw: the better team loses often enough that
winning is worth something and losing is not an indictment.

**And it has to be earned.** The cut is 98 wins — not baseball's real playoff
line near 90, because these are all-star rosters whose win totals run high and
borrowing that number would make the series automatic. It is set by
measurement instead:

| | Median wins | Reach 98 |
|---|---|---|
| Near-optimal play | 106 | 88% |
| Looser play | 99 | 56% |

So a well-played draft is usually rewarded and a loose one is a coin flip —
which finally gives the win total a second consequence besides its distance
from an unreachable 116.

The idea comes from the "boss mode" several competing 162-0 clones advertise.
What is here is our own: a real simulation between two real run profiles,
rather than a badge for beating a number.

## Payroll

Every player carries a salary and a roster has a $110M competitive-balance
threshold. Going over is allowed — a hard cap would let a bad spin strand you
with slots you cannot fill — but it is paid for the way real clubs pay for it.
A club that spends everything on its starters has nothing left for the bench
and the back of the staff, so the penalty is not a number subtracted at the
end: it degrades the replacement players who take 16% of the plate appearances
and 51% of the innings, and the simulation feels it on its own.

This exists because position count is not a difficulty lever. Going from nine
slots to thirteen made the game *easier* — every extra slot is another chance
to take the best player on the board. What actually made drafts easy was that
nothing stopped you stacking thirteen stars, and baseball already has the
mechanism that stops that in life.

Costs are exponential in the rating, because that is how the market prices
talent: an average player runs about $3M, a star near $16M, an all-time season
past $45M. Both the threshold and the penalty curve were set by measurement
rather than by the real MLB figure, tuned until managing the payroll was worth
as much as ignoring it:

| Approach | Median wins | Payroll | Beats 116 |
|---|---|---|---|
| Take the best card every time | 106 | $125M | 3.3% |
| Draft to the threshold | 103 | $109M | 3.7% |

Neither dominates, which is the point — the threshold is a decision rather than
decoration. Before payroll existed, taking the best card every time beat the
all-time record 18.7% of the time.

## Difficulty

The point of the game is that a perfect season is out of reach and the real
record is not. With an honest model, 162-0 has odds around 1 in 20,000 even
drafting optimally — that is a fact about baseball, and faking it would mean
throwing away the model that makes the rest feel real.

So every result is graded against **the best real season on record: 116 wins**,
by the 1906 Cubs and 2001 Mariners. As tuned:

| How you play | Median wins | Beats 116 |
|---|---|---|
| Picking the best card each spin | 103 | 2.3% |
| Drafting to the payroll threshold | 103 | 3.7% |
| Ignoring payroll entirely | 106 | 3.3% |

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

So every player carries a **0-99 rating** and the pick list is sorted
best-first. The rating is not a separate scale invented for the card: it is the
player's **runs above what a league-average player produces over a season**,
which is the exact currency the season simulation runs on. A bat's hitting and
fielding and an arm's run prevention all reduce to it, which makes them directly
comparable and makes the number honest — it ranks players by precisely what the
game rewards.

That number does the whole job, so it does the job alone. Cards used to carry a
written grade beside it too — "Ace SP", "Big bat", "Weak bat" — which said
nothing the rating had not already said more precisely, in more words, on every
row. One number, three stats, a price. The only words a card gets now are the
scarcity flag, because that is the one thing the rating cannot tell you.

50 is a league-average regular. The pool's median is 53. Babe Ruth rates 99;
Bill Bergen, the standard example of the worst hitter in major league history,
rates 12. A test asserts both, and asserts that the top-rated bat really does
outscore the bottom-rated one in the simulation, so the rating can never drift
away from what the sim actually does.

Pitchers top out near 79 where bats reach 99. That is not a bug in the scale —
you draft nine bats and four arms, so a single bat is worth more to this roster
than a single arm. The rating tells you the truth about the trade.

## Position scarcity

A draft where every pick is judged only against the players in front of you is
not a draft — it is a slot machine with a leaderboard. You take the highest
number on the screen, every time, and there is nothing to think about.

What makes it a game is knowing what you are giving up. So every open position
carries **the going rate**: the median rating still left in the pool that could
fill it. The positions are genuinely unequal, and the gap is large enough to
play against:

| Position | Going rate | Position | Going rate |
| --- | --- | --- | --- |
| SS | 42 | 3B | 51 |
| 2B | 44 | SP | 53 |
| C | 47 | OF | 56 |
| DH | 51 | 1B | 59 |

Seventeen points separate shortstop from first base. That means a 60-rated
shortstop is a far better pick than a 60-rated first baseman, because the pool
will keep offering you first basemen and will not keep offering you shortstops.
When a player is clearly above his position's going rate, the card says so and
names the spot: **+29 at SS**.

**In words, on the card, and nowhere else.** The going rate was also printed on
every empty slot in the position dock, which is real information that entirely
failed to communicate: the same small number in the same place meant a drafted
player's rating on one cell and a forecast on the next, thirteen at once with
no label. Extracting "shortstop is thin" from it meant scanning and comparing
thirteen two-digit numbers in 27px cells. Asked what they were, the first
answer back was "random numbers" — so they are gone, and the dock does the one
job it is good at: showing which positions are filled and with whom.

**DH and closer never carry the flag.** Any hitter can DH and any arm can close,
so their pools are the widest on the board and their medians mean nothing — the
DH median only sits at 51 because it mixes shortstops in with sluggers. Reading
that as an edge would have told you to put your best bat at DH, which is exactly
backwards: those are the slots you fill with whoever is left over. Any slot
drawing more than 60% of the widest pool is treated as residual and scores zero,
however low its median.

## Your personal best

A single-run game has no reason to be opened twice. The all-time record is 116
wins, which most drafts do not come close to, so grading every season against it
gives a returning player nothing to aim at.

So the game remembers your best season and marks it on the projection bar
**next to** the all-time record, in the accent colour, with both ticks labelled.
That is the number you are actually playing against, and it moves as you get
better at it.

The result screen names where the run landed — a new best and by how much, or
the gap to the one that stands, with the season count. Missing is reported as
plainly as beating; a game that only celebrates is a game you stop believing.

Only free play sets it. The daily is one draft for everybody, so a good daily
would raise a bar that cannot then be attacked — the draft is spent. It is
stored in `localStorage` and nowhere else: there is no account, and every write
is wrapped, because a private window can make the whole API throw.

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

## Visual direction

Flat, near-black, and almost entirely without chrome.

This was a painted scoreboard first: bottle green, a condensed poster face, an
amber wash behind every screen, a gradient and a drop-glow on the primary
button, near-square 3px corners, and a 1px outline around every surface on the
page. It was a coherent idea and it read as cheap, because each of those is
decoration and together they are a lot of decoration on a 390px screen.

What replaced it is discipline rather than a new set of effects:

| | Before | Now |
| --- | --- | --- |
| Typefaces | 3 — condensed display, mono, sans | **1** — Inter, tabular figures |
| Border declarations | 48 | **11**, all on controls |
| Corner radii | 9 distinct values, 11 of them 3px | **3** — 8 / 12 / 16 |
| Gradients | 8 | **0** |
| Page background | Two radial washes | **Flat** |

- **Colour** — `#0b0e13` page, `#151a22` panel, `#1c222c` raised, `#f2f5f8`
  ink, `#f97a1f` accent. Surfaces separate by background step, not by outline,
  which is most of the difference between a clean interface and a busy one.
- **Type** — one family at four weights. Three typefaces arguing on a phone was
  the loudest thing after the amber wash. Caps and wide tracking are spent on
  section labels only; everything else takes its hierarchy from size and weight.
- **Restraint on the accent** — the one saturated thing on a screen is either
  the primary action or a club's colours, never both at the same scale. That is
  why the reel takes a club *bar* rather than a club fill: an orange club above
  an orange SPIN button read as two accents stacked.

### Club colours

Thirteen picks come from thirteen different franchises, and a list of surnames
does not show you that. So every drafted player wears his club's colours — on
the field, in the position dock, on the reel when it lands, and on the roster
that ends the run. The board becomes a team sheet you can read at a glance.

The colours are the real ones and were already in the roster pack. What was
missing is that **a club's own pairing is not always legible**. Nineteen of the
thirty-one pair two dark colours — Seattle's navy on teal, Toronto's two blues,
Detroit's navy and orange — and a badge in one on the other is a blur. So the
pairing is measured, and a club whose own colours fail gets a legible ink
instead. The primary always survives, because that is the colour the club is
known by.

| | |
| --- | --- |
| Keep their own pairing | 12 — Pittsburgh's gold on black, Oakland's gold on green, the Yankees' silver on navy |
| Keep the primary, get a legible ink | 18 |
| Ground moved as well | 1 — Phillies red, below |

Phillies red sits at exactly the lightness where **both** neutrals fail: 4.1
against charcoal and less against cream. Rather than ship a badge nobody can
read, its ground is stepped until the ink clears, scaling the channels so the
hue holds — still plainly Phillies red, just far enough along to be legible. A
test asserts it is the only club this happens to, and that every one of the
thirty-one clears 4.5:1.

The chip rim is derived from the pair rather than from the page, so a navy club
separates from the grass and a gold one from a cream background without either
needing to know which palette is active. Measured in the browser: the faintest
chip sits at 1.15 against the page ground, and its rim at 4.8.

**The reel takes the colour only once it stops.** Painting it while it cycles
would strobe saturated colour at roughly 20Hz, which is a photosensitivity
hazard rather than a flourish. Landing on the colour also makes it the payoff
of the spin — as a short bar under the club name rather than a filled card, so
it never competes with the primary action.

### The spin

The reel used to swap a single line of text on a timer: eighteen React state
updates per spin, each re-rendering the screen and restarting a CSS animation.
Measured on a 4×-throttled CPU, the spin dropped a frame every other tick
through its fastest stretch.

It is now the shape a slot machine actually has — a fixed window with the
symbols stacked behind it, moved by one `transform` on the compositor. Three
details keep it there:

- **A CSS animation, not a transition.** A transition needs a starting point
  the browser has already accepted, which costs a forced reflow per reel in the
  exact frame the spin begins.
- **The strip is mounted once.** The symbols that blur past are fixed for the
  run, so a spin changes one line of text instead of re-mounting forty.
  Mounting the strip per spin measured about 35ms of that first frame.
- **Replay is a keyframe swap.** `animation-name` alternates between two
  identical keyframes. Nothing remounts, nothing is measured, no effect runs.

The travel is a percentage of the strip rather than pixels, so nothing reads
the DOM and the window can change height without the maths following it around.
The easing is `easeOutCubic`, and the tick sounds are scheduled from the inverse
of that same curve, so what you hear is what is passing the window.

| Frames over 32ms during one spin | Before | After |
|---|---|---|
| Total | 9 | **3** |
| Worst frame | 333ms | **133ms** |
| Through the spin itself | 6 | **0** |

What is left sits at the two transition boundaries, where a short staggered
entrance turns the cost of mounting twenty player cards into something that
looks deliberate rather than into a frozen frame.

### Four palettes

Each defines every token in full rather than patching the one before it, so no
colour can survive a switch and leave one surface reading against another's
ground.

| Palette | | |
|---|---|---|
| **Midnight** | Near-black, cool cast | the default |
| **Daylight** | Paper white | light |
| **Warm** | Near-black, weighted brown | warm neutral |
| **Mono** | Colour out of the way | cool neutral |

Contrast is measured rather than eyeballed, by walking every text node on every
screen in a real browser, resolving each one's ground through its ancestors —
necessary now that almost nothing declares its own background — and compositing
alpha before taking the ratio.

Flattening the design cost separation that outlines used to provide, and the
audit caught it: `--rule-hi` had been a mid grey against bottle-green panels
and sits at **1.57:1** against a near-black one. Two things were painted in it
— the going rate on an empty position and the empty bench marker — so the pass
that made the interface cleaner had quietly made a number the draft depends on
invisible. Both now take real ink and earn their recessive reading from weight
and italics instead of from being nearly the colour of the page.

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

### Haptics only work at the top level

The Vibration API reports nothing useful: `navigator.vibrate()` returns true on
a laptop with no vibration motor, and Chrome calls `vibrate` an unrecognized
permissions-policy feature, so neither the return value nor
`featurePolicy.allowsFeature` can be trusted. Two things actually stop it, both
silently:

- **iPhone and iPad.** Safari has never shipped the Vibration API.
- **Being embedded.** Chrome discards vibration inside a cross-origin frame, so
  the game buzzes when opened in its own tab and does nothing in an embed. No
  page can fix this from the inside — the parent has to grant it.

Rather than leave a switch on that does nothing, the settings sheet detects
both cases, disables the toggle, and says which one applies. Where haptics do
work there is a Test button, because the only way to be sure is to feel it.
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

**One re-spin per run, and you aim it.** Two controls, one per reel, the way
82-0 splits them: turn the club and hold the decade, or turn the decade and
hold the club. A loaded franchise in the wrong era is a fixable problem, and
saying which half was wrong is a better decision than rolling both again. Only
the reel you turned animates — watching the half you kept cycle back to itself
would say the opposite of what happened.

The budget is deliberately still one. A targeted re-spin is the stronger move,
so splitting the control gives you a choice of where to aim it, not more shots;
a control with nowhere else to land is disabled rather than sold, and costs
nothing if somehow pressed. The daily still runs with none.

**Mobile-first, not desktop-shrunk.** The draft never scrolls the page and the
type scale is viewport-driven.

Tap targets get the same treatment. Thirteen positions across a phone is a 27px
cell — fine to read, far too small to hit without mistakes. But the strip is
*only* ever tapped while a player is being placed, and only the slots he can
legally take are tappable at all. So during placement those slots take the row
over and the rest shrink to markers: measured in the browser, a target goes
from 27×34 to **49×48** with four positions eligible, and larger with fewer.
The nine you cannot press stop competing for the space, and the label grows
with the cell so a big target does not carry small type.

**Static.** The game prerenders to static HTML with no server calls, so hosting
is free and a viral spike costs nothing. The only state that outlives a run is
your own best season, in `localStorage`.

## Project structure

```text
engine/            Game core — no React, no baseball knowledge
  types.ts           The Ruleset contract the sport pack implements
  rng.ts             Seeded deterministic RNG (mulberry32, Poisson, normal)
  draft.ts           Spin/pick state machine, feasibility-aware reel
  season.ts          Game-by-game simulation, Pythagenpat expectation
  series.ts          Best-of-seven against one specific opponent
  run.ts             Orchestration: draft -> rating -> season -> series
  share.ts           Share-code encode/decode, daily seeds
sports/
  parse.ts           Pipe-delimited roster table parser
  baseball/          BaseRuns, staff model, roster pack
    era.ts             Run environment by decade, shared by rating and bosses
    bosses.ts          The twelve teams worth beating
app/                 Next.js app; one route, the game, all launch metadata
components/          Start screen, game shell, draft board, season report
lib/                 Sound and haptics, palettes, personal best, club colours
public/              Manifest, icons, share card, robots.txt, sitemap
standalone/          Entry for the single-file build
scripts/             Lahman importer, standalone bundler, launch-asset renderer
tests/               Engine determinism, sim math, data integrity, difficulty
```

The engine stays separate from the baseball pack behind a `Ruleset` interface.
That is not a plan to add more sports — it is what keeps the simulation
testable on its own and the run-scoring model swappable when the Lahman import
replaces the seed data.

## Data and provenance

The roster pack is generated from the **Lahman Baseball Database / Chadwick
Baseball Databank** — 4,712 players covering 31 franchises and the seasons from
1901 to 2019, the four who logged the most time at each franchise, decade, and
position. Every rate, home-run rate, and fielding number traces back to real box
scores.

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
npm run build            # static export -> out/
npm run preview          # serve out/ as a host would
npm run build:standalone # single self-contained HTML file
npm run build:assets     # re-render icons and the share card (rarely)
```

Requires Node 22+.

## Shipping it

`npm run build` writes a directory of plain files to `out/`. There is no server
and no build step at the host: every screen is decided in the browser from a
seed, and the roster pack is in the bundle. That means it hosts anywhere static
— a bucket, a CDN, GitHub Pages, Netlify, Vercel, Cloudflare Pages — for
nothing, and a spike in traffic costs nothing either.

### The one-click path: GitHub Pages

`.github/workflows/deploy.yml` typechecks, tests and publishes on every push to
the development branch. The site lives at `https://<user>.github.io/<repo>/`.

**One manual step, once, and it cannot be automated:** repository Settings →
Pages → set Source to *GitHub Actions*. Every run after that is hands-off.

It is worth knowing why, because the obvious shortcut does not work. The
`configure-pages` action takes `enablement: true`, which sounds like exactly
this — but the workflow's own token can deploy to a Pages site without being
able to create one, so that call returns *Resource not accessible by
integration*. The only way around it is a personal access token with admin
scope stored as a repository secret, which is a worse trade than one click. So
the workflow leaves enablement off, where the failure at least names its cause:
*verify that the repository has Pages enabled*.

The repository also has to be public, or on a plan that includes Pages for
private repositories.

### Anywhere else

```bash
npm run build
# then upload out/ — for example:
npx wrangler pages deploy out          # Cloudflare Pages
npx netlify deploy --prod --dir out    # Netlify
npx vercel deploy --prebuilt           # Vercel
```

### Two environment variables decide every absolute URL

| | |
| --- | --- |
| `SITE_URL` | Origin only, no path. Used for the Open Graph image, the sitemap and the canonical share link. |
| `BASE_PATH` | `''` for a root domain, `/repo` for a GitHub Pages project site. |

They matter more than they look. A project site serves from `/<repo>/`, so the
manifest, the icons and the share card all have to carry that prefix — get it
wrong and you get the classic failure where the page works perfectly on
localhost and serves a blank screen with four 404s in production. The Pages
workflow reads both from `actions/configure-pages`, so it is correct by
construction; a custom domain later means setting `SITE_URL` to it and clearing
`BASE_PATH`.

Verified by building at `/clip-pilot-app`, serving it from a subdirectory, and
playing a full thirteen-pick draft through to a result: every asset 200s and
the console stays clean.

### What is in place

| | |
| --- | --- |
| **Hosting** | Static export, no server, no runtime cost |
| **Link previews** | Open Graph and Twitter card meta, plus a 1200×630 card rendered from the real design tokens |
| **Installable** | Web app manifest, standalone display, 192/512 and maskable icons, apple-touch-icon |
| **Discoverable** | Title, description, `robots.txt`, `sitemap.xml`, SVG and PNG favicons |
| **Licence** | CC BY-SA credit on the opening screen and in the settings sheet, plus `DATA-LICENSE.md` |
| **Deployable** | A Pages workflow that typechecks, tests and publishes on push |
| **Guarded** | `npm run verify:build` opens the built file in a browser before anything ships |
| **Offline** | Not yet — see below |

The share card is drawn as HTML and captured with the same Chromium the tests
use, so it is built from the real tokens rather than redrawn by hand in a
graphics tool and left to drift. `npm run build:assets` regenerates it; the
output is committed, so a normal install never touches a browser.

### What is deliberately not built

These need something this repository cannot provide on its own, and pretending
otherwise would be worse than saying so:

- **A leaderboard and accounts.** Needs a backend and a database. The daily is
  currently a private score plus a share card, which is the whole loop Wordle
  ran on for months before it had anything else.
- **Native apps.** Needs developer accounts, review, and store listings. The
  manifest means it installs to a home screen and runs full-screen in the
  meantime, which covers most of what a wrapper app would.
- **Ads.** 82-0 gates its extra re-spins behind rewarded video. The hooks for
  that would go on the two re-spin controls, which already know when they are
  spent.
- **Offline play.** A service worker would make it work on a plane. The bundle
  is entirely self-contained already, so this is a small job, but an incorrect
  service worker is a good way to serve a stale build forever.

### Before charging money for it

Club names, colours and marks belong to the clubs. Fan projects in this genre
generally run unbothered, and this one does not use logos, wordmarks or team
imagery — but "generally unbothered" is not a licence, and the exposure grows
the moment there is revenue attached. Worth a lawyer's hour before a paid tier,
an ad deal, or a store listing.

The player data carries its own obligation: **CC BY-SA 3.0 is copyleft.**
Attribution is required and is now in the interface, and ShareAlike means a
derivative of that database has to be shared under the same terms. That governs
the roster pack, not your source code — but read
[DATA-LICENSE.md](DATA-LICENSE.md) before a commercial launch rather than after.

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
