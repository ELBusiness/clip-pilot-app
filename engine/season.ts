/**
 * Season simulation.
 *
 * Two numbers come out of the roster — points scored and points allowed per
 * game — and the season is played one game at a time against opponents drawn
 * from the league's quality distribution. Simulating game by game rather than
 * mapping a "strength rating" straight onto a record matters for two reasons:
 * a great roster can still drop a game it should have won, which is the whole
 * drama of chasing a perfect season, and the resulting box scores give the
 * player something concrete to argue with.
 *
 * The record is then checked against Pythagorean expectation, so the result
 * screen can separate "this roster was good" from "these dice were kind".
 */

import type {
  GameResult,
  LeagueContext,
  SeasonResult,
  TeamRating,
} from './types'
import type { Rng } from './rng'

/**
 * Pythagenpat (David Smyth). The exponent is derived from the game's own
 * scoring environment rather than fixed, which is why it holds up across
 * sports as different as baseball and basketball. Baseball-Reference's fixed
 * 1.83 is a special case of this at a normal MLB run environment.
 */
export function pythagenpatExponent(scored: number, allowed: number, games: number): number {
  if (games <= 0) return 2
  const perGame = (scored + allowed) / games
  if (perGame <= 0) return 2
  return Math.pow(perGame, 0.287)
}

/** Expected winning percentage from scoring totals alone. */
export function pythagoreanWinPct(scored: number, allowed: number, games: number): number {
  if (scored <= 0) return 0
  if (allowed <= 0) return 1
  const x = pythagenpatExponent(scored, allowed, games)
  const s = Math.pow(scored, x)
  const a = Math.pow(allowed, x)
  return s / (s + a)
}

function sampleScore(rng: Rng, mean: number, context: LeagueContext): number {
  const safeMean = Math.max(0.05, mean)
  if (context.model === 'poisson') {
    return rng.poisson(safeMean)
  }
  const sigma = context.sigma ?? Math.sqrt(safeMean)
  return Math.max(0, Math.round(safeMean + sigma * rng.normal()))
}

/**
 * Play one game against an opponent of the given quality.
 *
 * Opponent quality shifts both sides: a strong opponent scores more and
 * concedes less. Each side's expectation is its own rate adjusted by how far
 * the other side sits from league average, which keeps the league's total
 * scoring roughly stable instead of letting good defenses deflate the whole
 * simulation.
 */
function playGame(
  rng: Rng,
  rating: TeamRating,
  context: LeagueContext,
  opponentQuality: number,
  drawsPossible: boolean,
): GameResult {
  const league = context.averageScore
  const opponentOffense = league + opponentQuality
  const opponentDefense = league - opponentQuality

  // Our expected output: our offense, moved by how good their defense is.
  const scoredMean = rating.offense * (opponentDefense / league)
  // Theirs: their offense, moved by how good our defense is.
  const allowedMean = opponentOffense * (rating.defense / league)

  let scored = sampleScore(rng, scoredMean, context)
  let allowed = sampleScore(rng, allowedMean, context)

  if (!drawsPossible) {
    // No sport in this engine ends level except soccer; replay the tie the way
    // extra innings or overtime would, rather than coin-flipping it.
    let guard = 0
    while (scored === allowed && guard < 64) {
      scored += sampleScore(rng, scoredMean / 9, context)
      allowed += sampleScore(rng, allowedMean / 9, context)
      guard += 1
    }
    if (scored === allowed) {
      // Degenerate case only reachable with a near-zero scoring rate.
      scored += rng.next() < 0.5 ? 1 : 0
      allowed += scored > allowed ? 0 : 1
    }
  }

  const outcome: GameResult['outcome'] =
    scored > allowed ? 'W' : scored < allowed ? 'L' : 'D'

  return { scored, allowed, outcome }
}

export function simulateSeason(
  rating: TeamRating,
  context: LeagueContext,
  games: number,
  rng: Rng,
  drawsPossible: boolean,
): SeasonResult {
  const results: GameResult[] = []
  let wins = 0
  let losses = 0
  let draws = 0
  let scored = 0
  let allowed = 0
  let streak = 0
  let longestStreak = 0

  for (let i = 0; i < games; i += 1) {
    // Opponent quality is drawn per game, so the schedule contains genuine
    // contenders and genuine cellar-dwellers instead of 82 average teams.
    const opponentQuality = rng.normal() * context.spread
    const game = playGame(rng, rating, context, opponentQuality, drawsPossible)

    results.push(game)
    scored += game.scored
    allowed += game.allowed

    if (game.outcome === 'W') {
      wins += 1
      streak += 1
      longestStreak = Math.max(longestStreak, streak)
    } else {
      if (game.outcome === 'L') losses += 1
      else draws += 1
      streak = 0
    }
  }

  const expectedWins = pythagoreanWinPct(scored, allowed, games) * games
  const record = drawsPossible ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`

  return {
    wins,
    losses,
    draws,
    scored,
    allowed,
    record,
    expectedWins,
    luck: wins - expectedWins,
    perfect: losses === 0 && draws === 0,
    games: results,
    longestStreak,
  }
}
