/**
 * Sport-agnostic contract for a "perfect season" roster draft game.
 *
 * The engine owns the loop that every version of this genre shares: spin for a
 * franchise/era, draft one legend into an open roster slot, repeat until the
 * roster is full, then simulate a season. Everything sport-specific — what a
 * roster looks like, which stats matter, how a roster becomes runs or points —
 * lives behind `Ruleset`.
 */

export type SportId = 'baseball' | 'basketball' | 'football' | 'soccer'

/** A slice of history. Spins land on a franchise/era pair. */
export interface Era {
  id: string
  label: string
  startYear: number
  endYear: number
}

export interface Franchise {
  id: string
  name: string
  /** Short name used on the reel and on player cards. */
  short: string
  /** [primary, secondary] hex colors, used for the card treatment. */
  colors: [string, string]
}

/**
 * One draftable player. `stats` is sport-specific and interpreted only by that
 * sport's `Ruleset`; the engine never looks inside it.
 */
export interface Player {
  id: string
  name: string
  franchiseId: string
  eraId: string
  /** Slot codes this player is eligible to fill (e.g. ['SS', '2B']). */
  positions: string[]
  /** The season this stat line is drawn from, shown on the card. */
  year: number
  stats: Record<string, number>
}

/** A position on the roster that must be filled before the season can run. */
export interface RosterSlot {
  id: string
  label: string
  /** Grouping for the roster board (e.g. 'Lineup', 'Rotation'). */
  group: string
  /** Position codes accepted here. A player qualifies if any of its positions match. */
  accepts: string[]
}

/** The result of one spin: the pool a pick must come from. */
export interface Combo {
  franchiseId: string
  eraId: string
}

export interface Pick {
  slotId: string
  playerId: string
  franchiseId: string
  eraId: string
  /** Draft round this pick was made in, 1-indexed. */
  round: number
}

/** One line of the "why did I get this record" explanation. */
export interface RatingFactor {
  label: string
  /** Formatted value, e.g. '.412' or '3.18'. */
  value: string
  /** Where this sits against the league, -1 (awful) .. 1 (historic). */
  z: number
  detail?: string
}

/** A roster reduced to the two numbers a season simulation needs. */
export interface TeamRating {
  /** Expected points/runs/goals scored per game. */
  offense: number
  /** Expected points/runs/goals allowed per game. */
  defense: number
  factors: RatingFactor[]
}

/** League baseline the drafted team is measured against. */
export interface LeagueContext {
  /** Average score per game for one side. */
  averageScore: number
  /** Standard deviation of team quality across the league, in score-per-game. */
  spread: number
  /** Score distribution model used to sample a single game. */
  model: 'poisson' | 'normal'
  /** Normal-model games need a per-game scoring sigma. */
  sigma?: number
}

export interface Ruleset {
  /**
   * Legendary teams a strong season earns a series against. Optional: a sport
   * pack without a curated list simply never stages one.
   */
  opponents?: import('./series').Opponent[]

  id: SportId
  /** URL slug and the game's public name, e.g. '162-0'. */
  slug: string
  /** Human sport name, e.g. 'Baseball'. */
  sport: string
  /** League label shown in the UI, e.g. 'MLB'. */
  league: string
  tagline: string
  seasonGames: number
  /** True for sports where a game can end level (soccer). */
  drawsPossible: boolean
  /**
   * The best real season on record. A perfect season is the title, but in the
   * longer sports it is close to physically impossible — baseball's record is
   * 116 wins out of 162. Scoring a run against what actually happened gives
   * every result meaning instead of grading everyone against an unreachable
   * ideal.
   */
  benchmark: Benchmark
  slots: RosterSlot[]
  eras: Era[]
  franchises: Franchise[]
  players: Player[]
  context: LeagueContext
  /** Reduce a complete roster to scoring rates plus a legible breakdown. */
  rate(roster: RatedPlayer[]): TeamRating
  /** Headline stat line for a player card, e.g. '.376 / .690  ·  54 HR'. */
  statLine(player: Player): string
  /** Columns shown when comparing the candidates in a draft pool. */
  compareKeys: CompareKey[]
}

export interface Benchmark {
  /** Wins in the best real season. */
  wins: number
  /** Who did it, e.g. '2001 Mariners'. */
  holder: string
  /** Shown when a run beats it. */
  note: string
}

export interface CompareKey {
  key: string
  label: string
  higherIsBetter: boolean
  /** Formatter for the raw stat value. */
  format?: (value: number) => string
}

/** A drafted player paired with the slot they were assigned to. */
export interface RatedPlayer {
  player: Player
  slot: RosterSlot
}

export interface GameResult {
  /** Runs/points scored by the drafted team. */
  scored: number
  allowed: number
  outcome: 'W' | 'L' | 'D'
}

export interface SeasonResult {
  wins: number
  losses: number
  draws: number
  scored: number
  allowed: number
  /** Record string, e.g. '162-0' or '34-3-1'. */
  record: string
  /** Pythagorean-expected wins from the season's own run/point totals. */
  expectedWins: number
  /** Actual wins minus expected — how much the dice helped or hurt. */
  luck: number
  perfect: boolean
  games: GameResult[]
  /** Longest winning streak, for the share card. */
  longestStreak: number
}
