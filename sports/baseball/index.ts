/**
 * Baseball — the 162-0 game.
 *
 * WHY THE MATH IS SHAPED THIS WAY
 * -------------------------------
 * The obvious way to build this genre is to add a roster's counting stats into
 * a single "strength rating" and map that onto a record. It is also wrong, and
 * it is why those versions feel arbitrary: adding nine players' Runs Created
 * together double-counts, because a lineup of nine Babe Ruths does not score
 * nine times what one Babe Ruth does.
 *
 * Instead this computes team rates first and converts once:
 *
 *   1. Runs scored uses Bill James' basic Runs Created identity,
 *      RC = OBP x SLG x AB, applied to the *lineup's* aggregate OBP and SLG
 *      over a team-season of at-bats. Because it operates on rates, stacking
 *      great hitters compounds the way real offense does.
 *
 *   2. Runs allowed comes from staff ERA weighted by realistic innings shares
 *      (a rotation carries roughly 72% of modern innings), scaled up for
 *      unearned runs, which ERA excludes but the scoreboard does not.
 *
 *   3. Those two rates drive a game-by-game Poisson simulation, and the
 *      resulting totals are checked against Pythagenpat expectation so the
 *      result screen can separate roster quality from luck.
 *
 * The formula calibrates itself: plug in a league-average lineup (.330/.420)
 * and a 4.00 ERA staff and it returns roughly 762 runs scored, 697 allowed,
 * and 87 wins — which is what an average MLB team actually does.
 */

import type { CompareKey, LeagueContext, RatedPlayer, RosterSlot, Ruleset, TeamRating } from '@/engine/types'
import { pct3 } from '../parse'
import { ERAS, FRANCHISES, PLAYERS } from './players'

/** At-bats in a team-season. Real clubs land near 5,500. */
const TEAM_AT_BATS = 5500

/** Modern rotations throw about 72% of innings; the rest is bullpen. */
const ROTATION_SHARE = 0.72

/** ERA counts earned runs only; the scoreboard counts all of them. */
const UNEARNED_RUN_FACTOR = 1.075

const SEASON_GAMES = 162

/** League-average reference points, used to place a roster on the z scale. */
const LEAGUE_OBP = 0.32
const LEAGUE_SLG = 0.41
const LEAGUE_ERA = 4.0

export const SLOTS: RosterSlot[] = [
  { id: 'C', label: 'Catcher', group: 'Lineup', accepts: ['C'] },
  { id: '1B', label: 'First Base', group: 'Lineup', accepts: ['1B'] },
  { id: '2B', label: 'Second Base', group: 'Lineup', accepts: ['2B'] },
  { id: '3B', label: 'Third Base', group: 'Lineup', accepts: ['3B'] },
  { id: 'SS', label: 'Shortstop', group: 'Lineup', accepts: ['SS'] },
  { id: 'LF', label: 'Left Field', group: 'Lineup', accepts: ['LF', 'CF', 'RF', 'OF'] },
  { id: 'CF', label: 'Center Field', group: 'Lineup', accepts: ['CF', 'OF'] },
  { id: 'RF', label: 'Right Field', group: 'Lineup', accepts: ['RF', 'CF', 'LF', 'OF'] },
  { id: 'SP1', label: 'Ace', group: 'Rotation', accepts: ['SP'] },
  { id: 'SP2', label: 'No. 2 Starter', group: 'Rotation', accepts: ['SP'] },
  { id: 'CL', label: 'Closer', group: 'Bullpen', accepts: ['RP', 'SP'] },
]

const context: LeagueContext = {
  averageScore: 4.5,
  // One standard deviation of team quality is about half a run per game.
  spread: 0.45,
  model: 'poisson',
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

export function isPitcher(stats: Record<string, number>): boolean {
  return typeof stats['era'] === 'number'
}

function rate(roster: RatedPlayer[]): TeamRating {
  const batters = roster.filter((r) => !isPitcher(r.player.stats))
  const pitchers = roster.filter((r) => isPitcher(r.player.stats))

  // --- Offense -------------------------------------------------------------
  // Average the lineup's rates, then run Runs Created once on the team line.
  // Equal weighting is a deliberate simplification: real lineups give the top
  // of the order roughly 15% more plate appearances than the bottom, which
  // moves a team's run total by only a handful of runs across a season.
  const lineupSize = Math.max(1, batters.length)
  const teamObp = batters.reduce((sum, r) => sum + (r.player.stats['obp'] ?? 0), 0) / lineupSize
  const teamSlg = batters.reduce((sum, r) => sum + (r.player.stats['slg'] ?? 0), 0) / lineupSize
  const runsScored = teamObp * teamSlg * TEAM_AT_BATS
  const offense = runsScored / SEASON_GAMES

  // --- Run prevention ------------------------------------------------------
  const starters = pitchers.filter((r) => r.slot.group === 'Rotation')
  const relievers = pitchers.filter((r) => r.slot.group !== 'Rotation')

  const meanEra = (group: RatedPlayer[], fallback: number) =>
    group.length === 0
      ? fallback
      : group.reduce((sum, r) => sum + (r.player.stats['era'] ?? fallback), 0) / group.length

  const rotationEra = meanEra(starters, LEAGUE_ERA)
  const bullpenEra = meanEra(relievers, LEAGUE_ERA)
  const staffEra = rotationEra * ROTATION_SHARE + bullpenEra * (1 - ROTATION_SHARE)
  const defense = staffEra * UNEARNED_RUN_FACTOR

  // --- Legible breakdown ---------------------------------------------------
  // z is a rough "how far from league average" scale so the UI can colour a
  // factor without every sport inventing its own thresholds.
  const factors = [
    {
      label: 'Lineup OBP',
      value: pct3(teamObp),
      z: clamp((teamObp - LEAGUE_OBP) / 0.09),
      detail: 'How often the order avoids making an out',
    },
    {
      label: 'Lineup SLG',
      value: pct3(teamSlg),
      z: clamp((teamSlg - LEAGUE_SLG) / 0.16),
      detail: 'Total bases per at-bat',
    },
    {
      label: 'Projected runs',
      value: Math.round(runsScored).toString(),
      z: clamp((offense - context.averageScore) / 2.2),
      detail: `${offense.toFixed(2)} per game`,
    },
    {
      label: 'Staff ERA',
      value: staffEra.toFixed(2),
      z: clamp((LEAGUE_ERA - staffEra) / 1.3),
      detail: `Rotation ${rotationEra.toFixed(2)} · bullpen ${bullpenEra.toFixed(2)}`,
    },
    {
      label: 'Projected runs allowed',
      value: Math.round(defense * SEASON_GAMES).toString(),
      z: clamp((context.averageScore - defense) / 2.2),
      detail: `${defense.toFixed(2)} per game`,
    },
  ]

  return { offense, defense, factors }
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

function statLine(player: Parameters<Ruleset['statLine']>[0]): string {
  const s = player.stats
  if (isPitcher(s)) {
    return `${(s['era'] ?? 0).toFixed(2)} ERA · ${s['w'] ?? 0} W · ${s['so'] ?? 0} K`
  }
  return `${pct3(s['avg'] ?? 0)}/${pct3(s['obp'] ?? 0)}/${pct3(s['slg'] ?? 0)} · ${s['hr'] ?? 0} HR`
}

export const baseball: Ruleset = {
  id: 'baseball',
  slug: '162-0',
  sport: 'Baseball',
  league: 'MLB',
  tagline: 'Draft a roster that never loses a game.',
  seasonGames: SEASON_GAMES,
  drawsPossible: false,
  benchmark: { wins: 116, holder: '1906 Cubs & 2001 Mariners', note: 'No team has ever won more than 116 games in a season.' },
  slots: SLOTS,
  eras: ERAS,
  franchises: FRANCHISES,
  players: PLAYERS,
  context,
  rate,
  statLine,
  compareKeys,
}
