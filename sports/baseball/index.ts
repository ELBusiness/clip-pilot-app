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
 * Share of team innings credited to the drafted ace. A real workhorse throws
 * closer to 15%; 25% is a deliberate thumb on the scale so the pitching pick
 * carries real weight without erasing the other four-fifths of a staff.
 */
const ACE_INNINGS_SHARE = 0.25

/** Home runs are estimated from isolated power; this is the fitted rate. */
const HR_PER_ISO_AB = 0.28

/**
 * Share of plate appearances actually taken by the drafted nine.
 *
 * Nobody plays 162 games. Real regulars start about 143 of them, and the rest
 * go to a bench this game does not let you draft. Crediting a roster of legends
 * with every plate appearance of the season is quietly one of the largest
 * sources of inflation in this genre: it hands you a full year of nine Hall of
 * Famers with no rest days, no injuries, and no platoon disadvantage.
 */
const STARTER_PA_SHARE = 0.88

/** What the bench hits when the stars sit. Roughly replacement level. */
const BENCH = { avg: 0.235, obp: 0.29, slg: 0.36 }

/**
 * The reference run environment every stat is normalized into — roughly the
 * 2010s, so the numbers on screen read the way a modern fan expects.
 */
const REF = { avg: 0.25, obp: 0.32, slg: 0.405, era: 4.05 }

interface LeagueEnv {
  avg: number
  obp: number
  slg: number
  era: number
}

/**
 * League averages by decade. Baseball's run environment swings enormously —
 * the deadball era, the 1930s, the 1968 pitching peak, the steroid era — and
 * ignoring that is the difference between a fair comparison and a fantasy.
 */
export function leagueEnv(year: number): LeagueEnv {
  if (year <= 1919) return { avg: 0.255, obp: 0.32, slg: 0.335, era: 2.75 }
  if (year <= 1929) return { avg: 0.285, obp: 0.348, slg: 0.397, era: 4.0 }
  if (year <= 1939) return { avg: 0.28, obp: 0.345, slg: 0.4, era: 4.3 }
  if (year <= 1949) return { avg: 0.265, obp: 0.335, slg: 0.37, era: 3.65 }
  if (year <= 1959) return { avg: 0.263, obp: 0.335, slg: 0.395, era: 3.95 }
  if (year <= 1969) return { avg: 0.25, obp: 0.32, slg: 0.375, era: 3.55 }
  if (year <= 1979) return { avg: 0.257, obp: 0.325, slg: 0.375, era: 3.7 }
  if (year <= 1989) return { avg: 0.26, obp: 0.325, slg: 0.385, era: 3.95 }
  if (year <= 1999) return { avg: 0.266, obp: 0.335, slg: 0.415, era: 4.3 }
  if (year <= 2009) return { avg: 0.266, obp: 0.335, slg: 0.425, era: 4.45 }
  if (year <= 2019) return { avg: 0.254, obp: 0.32, slg: 0.405, era: 4.05 }
  return { avg: 0.247, obp: 0.315, slg: 0.4, era: 4.15 }
}

/** A batter's rates, rebased from his own era into the reference environment. */
export function normalizedBatting(player: Player) {
  const lg = leagueEnv(player.year)
  return {
    avg: (player.stats['avg'] ?? 0) * (REF.avg / lg.avg),
    obp: (player.stats['obp'] ?? 0) * (REF.obp / lg.obp),
    slg: (player.stats['slg'] ?? 0) * (REF.slg / lg.slg),
  }
}

/** A pitcher's ERA, rebased the same way. This is ERA+ expressed as an ERA. */
export function normalizedEra(player: Player): number {
  const lg = leagueEnv(player.year)
  return (player.stats['era'] ?? REF.era) * (REF.era / lg.era)
}

export const SLOTS: RosterSlot[] = [
  { id: 'P', label: 'Pitcher', group: 'Battery', accepts: ['SP', 'RP'] },
  { id: 'C', label: 'Catcher', group: 'Battery', accepts: ['C'] },
  { id: '1B', label: 'First Base', group: 'Infield', accepts: ['1B'] },
  { id: '2B', label: 'Second Base', group: 'Infield', accepts: ['2B'] },
  { id: '3B', label: 'Third Base', group: 'Infield', accepts: ['3B'] },
  { id: 'SS', label: 'Shortstop', group: 'Infield', accepts: ['SS'] },
  { id: 'LF', label: 'Left Field', group: 'Outfield', accepts: ['LF', 'CF', 'RF', 'OF'] },
  { id: 'CF', label: 'Center Field', group: 'Outfield', accepts: ['CF', 'OF'] },
  { id: 'RF', label: 'Right Field', group: 'Outfield', accepts: ['RF', 'CF', 'LF', 'OF'] },
]

const context: LeagueContext = {
  averageScore: 4.5,
  // One standard deviation of team quality is about half a run per game.
  spread: 0.45,
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
export function baseRuns(avg: number, obp: number, slg: number, atBats: number): number {
  const hits = avg * atBats
  const totalBases = slg * atBats
  // Walks implied by the gap between getting on base and getting a hit.
  const walks = obp >= 1 ? 0 : Math.max(0, (obp * atBats - hits) / (1 - obp))
  const homeRuns = Math.max(0, slg - avg) * HR_PER_ISO_AB * atBats

  const onBase = hits + walks - homeRuns
  const advancement =
    (1.4 * totalBases - 0.6 * hits - 3 * homeRuns + 0.1 * walks) * 1.02
  const outs = atBats - hits

  if (advancement + outs <= 0) return homeRuns
  return onBase * (advancement / (advancement + outs)) + homeRuns
}

function rate(roster: RatedPlayer[]): TeamRating {
  const batters = roster.filter((r) => !isPitcher(r.player.stats))
  const ace = roster.find((r) => isPitcher(r.player.stats))

  // --- Offense -----------------------------------------------------------
  // Team rates first, then one conversion. Averaging is a deliberate
  // simplification: the top of a real order gets about 15% more plate
  // appearances than the bottom, worth only a handful of runs across a season.
  const size = Math.max(1, batters.length)
  const norm = batters.map((r) => normalizedBatting(r.player))
  const starterAvg = norm.reduce((s, n) => s + n.avg, 0) / size
  const starterObp = norm.reduce((s, n) => s + n.obp, 0) / size
  const starterSlg = norm.reduce((s, n) => s + n.slg, 0) / size

  // Blend in the bench that takes the other twelve percent of the season.
  const blend = (starter: number, bench: number) =>
    starter * STARTER_PA_SHARE + bench * (1 - STARTER_PA_SHARE)
  const teamAvg = blend(starterAvg, BENCH.avg)
  const teamObp = blend(starterObp, BENCH.obp)
  const teamSlg = blend(starterSlg, BENCH.slg)

  const runsScored = baseRuns(teamAvg, teamObp, teamSlg, TEAM_AT_BATS)
  const offense = runsScored / SEASON_GAMES

  // --- Run prevention ----------------------------------------------------
  const aceEra = ace ? normalizedEra(ace.player) : REF.era
  const staffEra = aceEra * ACE_INNINGS_SHARE + REF.era * (1 - ACE_INNINGS_SHARE)
  const defense = staffEra * UNEARNED_RUN_FACTOR
  const runsAllowed = defense * SEASON_GAMES

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
      label: 'Ace',
      value: aceEra.toFixed(2),
      z: clamp((REF.era - aceEra) / 1.4),
      detail: ace
        ? `${ace.player.name}, era-adjusted from ${(ace.player.stats['era'] ?? 0).toFixed(2)}`
        : 'No pitcher drafted',
    },
    {
      label: 'Staff ERA',
      value: staffEra.toFixed(2),
      z: clamp((REF.era - staffEra) / 0.55),
      detail: `Your ace covers ${Math.round(ACE_INNINGS_SHARE * 100)}% of innings; the rest is league average`,
    },
    {
      label: 'Projected runs allowed',
      value: Math.round(runsAllowed).toString(),
      z: clamp((context.averageScore - defense) / 1.0),
      detail: `${defense.toFixed(2)} per game`,
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
  { key: 'era', label: 'ERA', higherIsBetter: false, format: (v) => v.toFixed(2) },
  { key: 'w', label: 'W', higherIsBetter: true },
  { key: 'so', label: 'SO', higherIsBetter: true },
  { key: 'whip', label: 'WHIP', higherIsBetter: false, format: (v) => v.toFixed(2) },
]

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
