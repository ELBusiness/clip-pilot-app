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
import type { RatedPlayer, Ruleset, SeasonResult, TeamRating } from './types'

export interface RunResult {
  roster: RatedPlayer[]
  rating: TeamRating
  season: SeasonResult
}

/** Fingerprint of the drafted roster, so the season depends on the picks. */
function rosterSeed(state: DraftState): string {
  return state.picks
    .map((p) => `${p.slotId}~${p.playerId}`)
    .sort()
    .join('|')
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

  return { roster, rating, season }
}
