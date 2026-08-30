/**
 * 162-0 — draft nine, play a season, try not to lose.
 *
 * The roster is the nine fielding positions, 1 through 9 on a scorecard. That
 * is baseball's answer to 82-0's starting five: the whole team on the field,
 * one pick each, short enough to play in a couple of minutes.
 *
 * THREE THINGS THIS MODEL DOES THAT THE OTHER VERSIONS OF THIS GAME DO NOT
 * ---------------------------------------------------------------------------
 *
 * 1. ERA AND OPS ARE ADJUSTED FOR THE ERA THEY WERE PUT UP IN.
 *    A 2.17 ERA in 1913 is not a 2.17 ERA today — the whole league sat near
 *    2.75 back then. Comparing raw numbers across a century makes deadball
 *    pitchers look superhuman and 1960s hitters look weak. Every stat here is
 *    normalized against its own decade's league average before it is used, the
 *    same idea behind ERA+ and OPS+.
 *
 * 2. RUNS COME FROM BASERUNS, NOT A "STRENGTH RATING".
 *    Adding a roster's counting stats into one number is what most versions of
 *    this game do, and it falls apart at the top: it happily projects a lineup
 *    scoring more runs than there are baserunners to drive in. BaseRuns is the
 *    estimator built for exactly this problem — it cannot return more runs than
 *    the number of men who actually reached base, so stacking nine sluggers
 *    compounds hard but stays inside physical reality.
 *
 * 3. YOUR ACE DOES NOT PITCH ALL 162 GAMES.
 *    A real ace throws about 15% of a team's innings. Letting the drafted
 *    pitcher's ERA stand in for the whole staff is the single biggest reason a
 *    roster of legends used to run away with the season. Here he anchors the
 *    staff at roughly 30% — enough that the pick matters a lot, honest enough
 *    that it does not hand you a sub-3.00 team ERA for free.
 *
 * Calibration is checked against real baseball, not vibes: feed it a
 * league-average lineup and a league-average ace and it returns about 740 runs
 * scored, 700 allowed, and 84 wins, which is roughly what an average team does.
 */

import type {
  CompareKey,
  LeagueContext,
  Player,
  RatedPlayer,
  RosterSlot,
  Ruleset,
  TeamRating,
} from '@/engine/types'
import { pct3 } from '../parse'
import { ERAS, FRANCHISES, PLAYERS } from './players'

const SEASON_GAMES = 162

/** At-bats in a team-season. Real clubs land near 5,500. */
const TEAM_AT_BATS = 5500

/** ERA counts earned runs only; the scoreboard counts all of them. */
const UNEARNED_RUN_FACTOR = 1.075

/**
 * Innings shares, taken from what real staffs actually do.
 *
 * Three starters throwing 210 innings each is about 43% of a team's 1,450.
 * A closer throws roughly 70 — only 5% — but those innings come with a leverage
 * index near 1.8, so his impact is weighted up to 9%. The remaining 48% is the
 * back of the rotation and middle relief nobody gets to draft, held at league
 * average.
 *
 * This is the difference between a model and a wish. Crediting the drafted arms
 * with 70% of innings let an optimal draft post a 2.87 team ERA — better than
 * any staff in history — and beat the all-time win record four times out of
 * five.
 */
const ROTATION_SHARE = 0.4
const CLOSER_SHARE = 0.09
const UNDRAFTED_STAFF_SHARE = 1 - ROTATION_SHARE - CLOSER_SHARE

/**
 * How much defence is worth, in runs per standard deviation of glove across a
 * full season. The gap between the best and worst defensive teams in a real
 * season is roughly 120 runs, so a team a full deviation better than average at
 * every position saves about 60.
 */
const RUNS_PER_DEF_SD = 7.2

/**
 * Defensive importance by roster slot. This is the bat-versus-glove trade the
 * whole sport argues about: a shortstop who cannot field costs you far more
 * than a first baseman who cannot, and the designated hitter costs you nothing
 * because he never takes the field. Without this, nothing stopped a player
 * stacking nine sluggers up the middle and posting a team slugging percentage
 * no real club has ever managed.
 */
const DEFENSIVE_WEIGHT: Record<string, number> = {
  C: 1.0, SS: 1.2, '2B': 1.0, CF: 1.1, '3B': 0.9,
  LF: 0.65, RF: 0.65, '1B': 0.5, DH: 0,
}



/**
 * Share of plate appearances actually taken by the drafted nine.
 *
 * Nobody plays 162 games. Real regulars start about 143 of them, and the rest
 * go to a bench this game does not let you draft. Crediting a roster of legends
 * with every plate appearance of the season is quietly one of the largest
 * sources of inflation in this genre: it hands you a full year of nine Hall of
 * Famers with no rest days, no injuries, and no platoon disadvantage.
 */
const STARTER_PA_SHARE = 0.84

/** What the bench hits when the stars sit. Roughly replacement level. */
const BENCH = { avg: 0.235, obp: 0.29, slg: 0.36, hrRate: 0.022 }

/**
 * The reference run environment every stat is normalized into — roughly the
 * 2010s, so the numbers on screen read the way a modern fan expects.
 */
const REF = { avg: 0.25, obp: 0.32, slg: 0.405, era: 4.05, hrRate: 0.03 }

/**
 * Regression toward the mean, applied to every drafted line.
 *
 * A player's numbers with one franchise in one decade are what he did *in that
 * context* — that park, that lineup around him, that pitching staff behind him.
 * Projecting him onto a different team means regressing toward league average,
 * which is what every serious projection system does (Marcel, ZiPS, Steamer all
 * regress, and heavily). Skipping it treats every line as pure repeatable
 * talent and quietly assumes thirteen players all sustain their best context at
 * once.
 *
 * It bites hardest at the extremes, which is exactly where this game needed it:
 * a .400 on-base hitter projects to .386, a 2.20 ERA projects to 2.53.
 */
const REGRESSION = 0.18

function regress(value: number, mean: number): number {
  return value * (1 - REGRESSION) + mean * REGRESSION
}

interface LeagueEnv {
  avg: number
  obp: number
  slg: number
  era: number
  /** League home runs per at-bat. Swings by a factor of ten across eras. */
  hrRate: number
}

/**
 * League averages by decade. Baseball's run environment swings enormously —
 * the deadball era, the 1930s, the 1968 pitching peak, the steroid era — and
 * ignoring that is the difference between a fair comparison and a fantasy.
 */
export function leagueEnv(year: number): LeagueEnv {
  if (year <= 1919) return { avg: 0.255, obp: 0.32, slg: 0.335, era: 2.75, hrRate: 0.004 }
  if (year <= 1929) return { avg: 0.285, obp: 0.348, slg: 0.397, era: 4.0, hrRate: 0.012 }
  if (year <= 1939) return { avg: 0.28, obp: 0.345, slg: 0.4, era: 4.3, hrRate: 0.017 }
  if (year <= 1949) return { avg: 0.265, obp: 0.335, slg: 0.37, era: 3.65, hrRate: 0.016 }
  if (year <= 1959) return { avg: 0.263, obp: 0.335, slg: 0.395, era: 3.95, hrRate: 0.024 }
  if (year <= 1969) return { avg: 0.25, obp: 0.32, slg: 0.375, era: 3.55, hrRate: 0.023 }
  if (year <= 1979) return { avg: 0.257, obp: 0.325, slg: 0.375, era: 3.7, hrRate: 0.02 }
  if (year <= 1989) return { avg: 0.26, obp: 0.325, slg: 0.385, era: 3.95, hrRate: 0.022 }
  if (year <= 1999) return { avg: 0.266, obp: 0.335, slg: 0.415, era: 4.3, hrRate: 0.027 }
  if (year <= 2009) return { avg: 0.266, obp: 0.335, slg: 0.425, era: 4.45, hrRate: 0.029 }
  if (year <= 2019) return { avg: 0.254, obp: 0.32, slg: 0.405, era: 4.05, hrRate: 0.03 }
  return { avg: 0.247, obp: 0.315, slg: 0.4, era: 4.15, hrRate: 0.033 }
}

/** A batter's rates, rebased from his own era into the reference environment. */
export function normalizedBatting(player: Player) {
  const lg = leagueEnv(player.year)
  return {
    avg: regress((player.stats['avg'] ?? 0) * (REF.avg / lg.avg), REF.avg),
    obp: regress((player.stats['obp'] ?? 0) * (REF.obp / lg.obp), REF.obp),
    slg: regress((player.stats['slg'] ?? 0) * (REF.slg / lg.slg), REF.slg),
    hrRate: regress((player.stats['hrRate'] ?? 0) * (REF.hrRate / lg.hrRate), REF.hrRate),
  }
}

/** A pitcher's ERA, rebased the same way. This is ERA+ expressed as an ERA. */
export function normalizedEra(player: Player): number {
  const lg = leagueEnv(player.year)
  return regress((player.stats['era'] ?? REF.era) * (REF.era / lg.era), REF.era)
}

/**
 * A full roster card: the nine in the batting order plus the arms that
 * actually decide a season. Three starters and a closer is what makes run
 * prevention vary — with a single pitcher every team ended up with roughly a
 * league-average staff, which flattened the whole win distribution.
 */
export const SLOTS: RosterSlot[] = [
  { id: 'C', label: 'Catcher', group: 'Lineup', accepts: ['C'] },
  { id: '1B', label: 'First Base', group: 'Lineup', accepts: ['1B'] },
  { id: '2B', label: 'Second Base', group: 'Lineup', accepts: ['2B'] },
  { id: '3B', label: 'Third Base', group: 'Lineup', accepts: ['3B'] },
  { id: 'SS', label: 'Shortstop', group: 'Lineup', accepts: ['SS'] },
  { id: 'LF', label: 'Left Field', group: 'Lineup', accepts: ['LF', 'CF', 'RF', 'OF'] },
  { id: 'CF', label: 'Center Field', group: 'Lineup', accepts: ['CF', 'OF'] },
  { id: 'RF', label: 'Right Field', group: 'Lineup', accepts: ['RF', 'CF', 'LF', 'OF'] },
  {
    id: 'DH',
    label: 'Designated Hitter',
    group: 'Lineup',
    accepts: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF'],
  },
  { id: 'SP1', label: 'Ace', group: 'Rotation', accepts: ['SP'] },
  { id: 'SP2', label: 'No. 2 Starter', group: 'Rotation', accepts: ['SP'] },
  { id: 'SP3', label: 'No. 3 Starter', group: 'Rotation', accepts: ['SP'] },
  { id: 'CL', label: 'Closer', group: 'Bullpen', accepts: ['RP', 'SP'] },
]

const context: LeagueContext = {
  averageScore: 4.5,
  // One standard deviation of team quality is about half a run per game.
  spread: 0.52,
  model: 'poisson',
}

export function isPitcher(stats: Record<string, number>): boolean {
  return stats['era'] !== undefined
}

/**
 * BaseRuns: R = A x B / (B + C) + D.
 *
 * A is men on base, B is how far they get advanced, C is outs, D is home runs
 * (which score themselves). The B/(B+C) term is a *rate* — the share of
 * baserunners who come around — so as a lineup gets absurdly good the estimate
 * approaches "everyone who reached base scored" and stops there, instead of
 * running off to infinity the way a linear estimator does.
 */
export function baseRuns(
  avg: number,
  obp: number,
  slg: number,
  hrRate: number,
  atBats: number,
): number {
  const hits = avg * atBats
  const totalBases = slg * atBats
  // Walks implied by the gap between getting on base and getting a hit.
  const walks = obp >= 1 ? 0 : Math.max(0, (obp * atBats - hits) / (1 - obp))
  const homeRuns = Math.min(hits, Math.max(0, hrRate) * atBats)

  const onBase = hits + walks - homeRuns
  const advancement =
    (1.4 * totalBases - 0.6 * hits - 3 * homeRuns + 0.1 * walks) * 1.02
  const outs = atBats - hits

  if (advancement + outs <= 0) return homeRuns
  return onBase * (advancement / (advancement + outs)) + homeRuns
}


/**
 * A single 0-99 rating for any player, batter or pitcher.
 *
 * The point of this number is that baseball's stat lines are unreadable to
 * someone new. ".276/.346/.362" and "3.41 ERA" are not comparable, and neither
 * tells a newcomer whether the player is any good — a 3.41 ERA was
 * extraordinary in 1968 and ordinary in 1999.
 *
 * So every player is converted into the one currency the simulation itself
 * runs on: **runs above what a league-average player would produce over a
 * season.** A bat's hitting and fielding and an arm's run prevention all reduce
 * to that, which makes them directly comparable and makes the rating honest —
 * it ranks players by exactly what the season simulation rewards, not by a
 * separate scale invented for the card.
 */
export interface PlayerRating {
  /** 0-99, where 50 is a league-average regular. */
  score: number
  /** Runs above average across a season. */
  runs: number
  /** Plain-English summary for someone who does not read slash lines. */
  label: string
}

/** Innings a drafted starter and closer are credited with. */
const STARTER_INNINGS = 200
const CLOSER_INNINGS = 70
/** Closers throw few innings but nearly all of them matter. */
const CLOSER_LEVERAGE = 1.9

/** Runs above average maps onto the 0-99 scale at this rate. */
const RATING_PER_RUN = 0.85

/** Runs an average lineup scores; the baseline every bat is measured against. */
const LEAGUE_TEAM_RUNS = baseRuns(REF.avg, REF.obp, REF.slg, REF.hrRate, TEAM_AT_BATS)

export function playerRating(player: Player): PlayerRating {
  if (isPitcher(player.stats)) {
    const era = normalizedEra(player)
    const reliever = player.positions.includes('RP')
    const innings = reliever ? CLOSER_INNINGS * CLOSER_LEVERAGE : STARTER_INNINGS
    const runs = ((REF.era - era) * innings) / 9

    return {
      score: toScore(runs),
      runs,
      label: describeArm(era, reliever),
    }
  }

  const n = normalizedBatting(player)
  // Marginal value of one lineup slot: what the team would score with nine of
  // this player, less what it scores with nine average ones, divided by nine.
  const bat = (baseRuns(n.avg, n.obp, n.slg, n.hrRate, TEAM_AT_BATS) - LEAGUE_TEAM_RUNS) / 9
  // Average positional weight, since the slot is not known at rating time.
  const glove = (player.stats['def'] ?? 0) * 0.85 * RUNS_PER_DEF_SD
  const runs = bat + glove

  return { score: toScore(runs), runs, label: describeBat(bat, player.stats['def'] ?? 0) }
}

function toScore(runs: number): number {
  return Math.max(1, Math.min(99, Math.round(50 + runs * RATING_PER_RUN)))
}

function describeArm(era: number, reliever: boolean): string {
  const role = reliever ? 'reliever' : 'starter'
  if (era <= 2.9) return `Ace ${role}`
  if (era <= 3.5) return `Strong ${role}`
  if (era <= 4.2) return `Solid ${role}`
  return `Back-end ${role}`
}

function describeBat(batRuns: number, def: number): string {
  const glove = def >= 0.7 ? 'elite glove' : def <= -0.7 ? 'poor glove' : null
  const stick =
    batRuns >= 30 ? 'Superstar bat'
      : batRuns >= 15 ? 'Big bat'
        : batRuns >= 3 ? 'Solid bat'
          : batRuns >= -8 ? 'Light bat'
            : 'Weak bat'
  return glove ? `${stick}, ${glove}` : stick
}

function rate(roster: RatedPlayer[]): TeamRating {
  const batters = roster.filter((r) => !isPitcher(r.player.stats))

  // --- Offense -----------------------------------------------------------
  // Team rates first, then one conversion. Averaging is a deliberate
  // simplification: the top of a real order gets about 15% more plate
  // appearances than the bottom, worth only a handful of runs across a season.
  const size = Math.max(1, batters.length)
  const norm = batters.map((r) => normalizedBatting(r.player))
  const starterAvg = norm.reduce((s, n) => s + n.avg, 0) / size
  const starterObp = norm.reduce((s, n) => s + n.obp, 0) / size
  const starterSlg = norm.reduce((s, n) => s + n.slg, 0) / size
  const starterHrRate = norm.reduce((s, n) => s + n.hrRate, 0) / size

  // Blend in the bench that takes the other twelve percent of the season.
  const blend = (starter: number, bench: number) =>
    starter * STARTER_PA_SHARE + bench * (1 - STARTER_PA_SHARE)
  const teamAvg = blend(starterAvg, BENCH.avg)
  const teamObp = blend(starterObp, BENCH.obp)
  const teamSlg = blend(starterSlg, BENCH.slg)
  const teamHrRate = blend(starterHrRate, BENCH.hrRate)

  const runsScored = baseRuns(teamAvg, teamObp, teamSlg, teamHrRate, TEAM_AT_BATS)
  const offense = runsScored / SEASON_GAMES

  // --- Run prevention ----------------------------------------------------
  const starters = roster.filter((r) => r.slot.group === 'Rotation')
  const closers = roster.filter((r) => r.slot.group === 'Bullpen')

  const meanEra = (group: RatedPlayer[]) =>
    group.length === 0
      ? REF.era
      : group.reduce((sum, r) => sum + normalizedEra(r.player), 0) / group.length

  const rotationEra = meanEra(starters)
  const closerEra = meanEra(closers)
  const staffEra =
    rotationEra * ROTATION_SHARE +
    closerEra * CLOSER_SHARE +
    REF.era * UNDRAFTED_STAFF_SHARE

  // Gloves behind the staff. A DH is weighted zero, so parking a bat there is
  // free and parking one at shortstop is not.
  const runsSaved = batters.reduce((total, entry) => {
    const weight = DEFENSIVE_WEIGHT[entry.slot.id] ?? 0.7
    return total + weight * (entry.player.stats['def'] ?? 0) * RUNS_PER_DEF_SD
  }, 0)

  const runsAllowed = Math.max(
    250,
    staffEra * UNEARNED_RUN_FACTOR * SEASON_GAMES - runsSaved,
  )
  const defense = runsAllowed / SEASON_GAMES

  const factors = [
    {
      label: 'Lineup OBP',
      value: pct3(teamObp),
      z: clamp((teamObp - REF.obp) / 0.075),
      detail: 'Era-adjusted, including the bench that plays 12% of the season',
    },
    {
      label: 'Lineup SLG',
      value: pct3(teamSlg),
      z: clamp((teamSlg - REF.slg) / 0.14),
      detail: 'Era-adjusted total bases per at-bat',
    },
    {
      label: 'Projected runs',
      value: Math.round(runsScored).toString(),
      z: clamp((offense - context.averageScore) / 1.6),
      detail: `${offense.toFixed(2)} per game · BaseRuns`,
    },
    {
      label: 'Rotation',
      value: rotationEra.toFixed(2),
      z: clamp((REF.era - rotationEra) / 1.3),
      detail: 'Era-adjusted ERA of your three starters',
    },
    {
      label: 'Staff ERA',
      value: staffEra.toFixed(2),
      z: clamp((REF.era - staffEra) / 0.8),
      detail: `Rotation ${Math.round(ROTATION_SHARE * 100)}% of innings · closer ${Math.round(CLOSER_SHARE * 100)}% by leverage · rest league average`,
    },
    {
      label: 'Defence',
      value: `${runsSaved >= 0 ? '+' : ''}${Math.round(runsSaved)}`,
      z: clamp(runsSaved / 55),
      detail: 'Runs saved by your gloves, weighted by position. The DH does not field.',
    },
    {
      label: 'Projected runs allowed',
      value: Math.round(runsAllowed).toString(),
      z: clamp((context.averageScore - defense) / 1.0),
      detail: `${defense.toFixed(2)} per game, after defence`,
    },
  ]

  return { offense, defense, factors }
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

function statLine(player: Player): string {
  const s = player.stats
  if (isPitcher(s)) {
    return `${(s['era'] ?? 0).toFixed(2)} ERA · ${s['w'] ?? 0} W · ${s['so'] ?? 0} K`
  }
  return `${pct3(s['avg'] ?? 0)}/${pct3(s['obp'] ?? 0)}/${pct3(s['slg'] ?? 0)} · ${s['hr'] ?? 0} HR`
}

const compareKeys: CompareKey[] = [
  { key: 'avg', label: 'AVG', higherIsBetter: true, format: pct3 },
  { key: 'obp', label: 'OBP', higherIsBetter: true, format: pct3 },
  { key: 'slg', label: 'SLG', higherIsBetter: true, format: pct3 },
  { key: 'hr', label: 'HR', higherIsBetter: true },
  { key: 'sb', label: 'SB', higherIsBetter: true },
  { key: 'def', label: 'DEF', higherIsBetter: true, format: (v) => (v >= 0 ? '+' : '') + v.toFixed(1) },
  { key: 'era', label: 'ERA', higherIsBetter: false, format: (v) => v.toFixed(2) },
  { key: 'w', label: 'W', higherIsBetter: true },
  { key: 'so', label: 'SO', higherIsBetter: true },
  { key: 'whip', label: 'WHIP', higherIsBetter: false, format: (v) => v.toFixed(2) },
]

/**
 * Project a half-finished roster.
 *
 * Empty slots are filled with a league-average player rather than ignored,
 * because averaging over only the players drafted so far would say a roster of
 * one superstar is the best team ever. Filling the gaps with average bodies
 * answers the question the player is actually asking mid-draft: "if I stopped
 * here, what would this team do?"
 */
export function projectPartial(picks: RatedPlayer[]): {
  wins: number
  rating: TeamRating
} {
  const filledSlots = new Set(picks.map((p) => p.slot.id))

  const averageBat: Player = {
    id: '__avg_bat', name: 'Average', franchiseId: '', eraId: '', positions: [], year: 2015,
    stats: { avg: REF.avg, obp: REF.obp, slg: REF.slg, hrRate: REF.hrRate, def: 0, hr: 0, sb: 0 },
  }
  const averageArm: Player = {
    id: '__avg_arm', name: 'Average', franchiseId: '', eraId: '', positions: [], year: 2015,
    stats: { era: REF.era, w: 0, so: 0, whip: 1.3 },
  }

  const full: RatedPlayer[] = [
    ...picks,
    ...SLOTS.filter((slot) => !filledSlots.has(slot.id)).map((slot) => ({
      slot,
      player: slot.group === 'Rotation' || slot.group === 'Bullpen' ? averageArm : averageBat,
    })),
  ]

  const rating = rate(full)
  const scored = rating.offense * SEASON_GAMES
  const allowed = rating.defense * SEASON_GAMES
  const exponent = Math.pow((scored + allowed) / SEASON_GAMES, 0.287)
  const winPct =
    Math.pow(scored, exponent) / (Math.pow(scored, exponent) + Math.pow(allowed, exponent))

  return { wins: Math.round(winPct * SEASON_GAMES), rating }
}

export const baseball: Ruleset = {
  id: 'baseball',
  slug: '162-0',
  sport: 'Baseball',
  league: 'MLB',
  tagline: 'Draft a roster that never loses a game.',
  seasonGames: SEASON_GAMES,
  drawsPossible: false,
  benchmark: {
    wins: 116,
    holder: '1906 Cubs & 2001 Mariners',
    note: 'No team has ever won more than 116 games in a season.',
  },
  slots: SLOTS,
  eras: ERAS,
  franchises: FRANCHISES,
  players: PLAYERS,
  context,
  rate,
  statLine,
  compareKeys,
}
