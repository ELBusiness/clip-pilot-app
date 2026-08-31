/**
 * A short series against one specific opponent.
 *
 * The season answers "how good is this roster" against a league. It cannot
 * answer the question baseball fans actually argue about, which is whether
 * your team beats *that* team — and 116 wins is an abstraction next to the
 * 1927 Yankees. A best-of-seven is the sport's own way of settling it, and it
 * gives a run a second, sharper outcome than a win total.
 *
 * Short series are mostly noise, which is the point rather than a flaw: the
 * better team loses one often enough that winning is worth something and
 * losing is not an indictment.
 */

import { playMatch } from './season'
import type { GameResult, LeagueContext, TeamRating } from './types'
import type { Rng } from './rng'

export interface Opponent {
  id: string
  /** Display name, e.g. "1927 Yankees". */
  name: string
  /** What they really did that year, for the result screen. */
  record: string
  note: string
  offense: number
  defense: number
}

export interface SeriesResult {
  opponent: Opponent
  games: GameResult[]
  wins: number
  losses: number
  won: boolean
  /** Series line as it is written, winner first: "4-2". */
  line: string
}

/**
 * Best-of-seven, stopping the moment it is decided rather than playing dead
 * games — a 4-0 sweep is four games, the way it is in life.
 */
export function simulateSeries(
  us: Pick<TeamRating, 'offense' | 'defense'>,
  opponent: Opponent,
  context: LeagueContext,
  rng: Rng,
  bestOf = 7,
): SeriesResult {
  const target = Math.floor(bestOf / 2) + 1
  const games: GameResult[] = []
  let wins = 0
  let losses = 0

  while (wins < target && losses < target) {
    const game = playMatch(rng, us, opponent, context, false)
    games.push(game)
    if (game.outcome === 'W') wins += 1
    else losses += 1
  }

  const won = wins > losses
  return {
    opponent,
    games,
    wins,
    losses,
    won,
    line: won ? `${wins}-${losses}` : `${losses}-${wins}`,
  }
}
