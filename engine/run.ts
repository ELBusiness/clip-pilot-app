/**
 * Run orchestration — the one entry point the UI needs.
 *
 * Ties the pieces together and, importantly, keeps the season reproducible:
 * the simulation seed is derived from the run seed plus the actual picks, so
 * the same roster always produces the same season. Re-simulating cannot be used
 * to reroll a bad result, and a share link replays to the identical record.
 */

import { buildRoster, type DraftState } from './draft'
import { createRng, deriveSeed } from './rng'
import { simulateSeason } from './season'
import { simulateSeries, type Opponent, type SeriesResult } from './series'
import type { RatedPlayer, Ruleset, SeasonResult, TeamRating } from './types'

export interface RunResult {
  roster: RatedPlayer[]
  rating: TeamRating
  season: SeasonResult
  /**
   * The series against a legendary team, or null if the season did not earn
   * one. Absent when the ruleset ships no opponents.
   */
  series: SeriesResult | null
  /** Wins needed to earn the series, so the UI can say how short you fell. */
  seriesLine: number
}

/** Fingerprint of the drafted roster, so the season depends on the picks. */
function rosterSeed(state: DraftState): string {
  return state.picks
    .map((p) => `${p.slotId}~${p.playerId}`)
    .sort()
    .join('|')
}

/**
 * Wins that earn the series.
 *
 * Not the real playoff cut, which sits near 90 — these rosters are all-star
 * teams and their win totals run high, so borrowing baseball's number would
 * make the series automatic. It is set by measuring instead. Over 400 drafts:
 *
 *   near-optimal play   median 106 wins   88% reach 98
 *   looser play         median  99 wins   56% reach 98
 *
 * So a well-played draft is usually rewarded and a loose one is a coin flip,
 * which is what gives the win total a second consequence besides its distance
 * from an unreachable 116.
 */
export const SERIES_WINS = 98

/**
 * Draw the opponent and play the series, on a stream of its own so the season
 * that precedes it is bit-for-bit unchanged by this existing.
 */
function playSeries(
  ruleset: Ruleset,
  state: DraftState,
  rating: TeamRating,
  wins: number,
): SeriesResult | null {
  const bosses: Opponent[] = ruleset.opponents ?? []
  if (bosses.length === 0 || wins < SERIES_WINS) return null

  const rng = createRng(deriveSeed(state.seed, `series:${rosterSeed(state)}`))
  const opponent = rng.pick(bosses)
  return simulateSeries(rating, opponent, ruleset.context, rng)
}

export function isComplete(ruleset: Ruleset, state: DraftState): boolean {
  return state.picks.length >= ruleset.slots.length
}

export function runSeason(ruleset: Ruleset, state: DraftState): RunResult | null {
  if (!isComplete(ruleset, state)) return null

  const roster = buildRoster(ruleset, state)
  if (roster.length !== ruleset.slots.length) return null

  const rating = ruleset.rate(roster)
  const rng = createRng(deriveSeed(state.seed, `season:${rosterSeed(state)}`))
  const season = simulateSeason(
    rating,
    ruleset.context,
    ruleset.seasonGames,
    rng,
    ruleset.drawsPossible,
  )

  // October has to be earned, or the win total only ever means one thing.
  const series = playSeries(ruleset, state, rating, season.wins)

  return { roster, rating, season, series, seriesLine: SERIES_WINS }
}
