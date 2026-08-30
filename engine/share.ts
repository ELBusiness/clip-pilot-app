/**
 * Share codes.
 *
 * A run is fully described by its sport, seed, and the sequence of picks, so a
 * share link can replay someone else's exact draft — same reel, same pools —
 * rather than just showing their final score. That is the loop that spreads
 * this genre: you do not just beat a number, you beat a specific run.
 *
 * Codes are compact and URL-safe with no server round-trip, which keeps the
 * game static-hostable and free to run.
 */

import type { DraftState } from './draft'
import type { SportId } from './types'

const VERSION = 1

export interface ShareCode {
  version: number
  sportId: SportId
  seed: number
  /** slotId:playerId pairs, in draft order. */
  picks: { slotId: string; playerId: string }[]
}

function toBase36(n: number): string {
  return (n >>> 0).toString(36)
}

/**
 * Encode as `v1.sport.seed.slot~player.slot~player...`. Kept human-readable on
 * purpose: it is easier to debug a bad link than an opaque blob, and the codes
 * are short enough that obfuscation would buy nothing.
 */
export function encodeRun(state: DraftState): string {
  const body = state.picks.map((p) => `${p.slotId}~${p.playerId}`).join('.')
  const head = `${VERSION}.${state.sportId}.${toBase36(state.seed)}`
  return body ? `${head}.${body}` : head
}

export function decodeRun(code: string): ShareCode | null {
  const parts = code.split('.')
  if (parts.length < 3) return null

  const [rawVersion, rawSport, rawSeed, ...rest] = parts
  const version = Number(rawVersion)
  if (version !== VERSION) return null

  const sportId = rawSport as SportId
  if (!['baseball', 'basketball', 'football', 'soccer'].includes(sportId)) return null

  const seed = parseInt(rawSeed ?? '', 36)
  if (!Number.isFinite(seed)) return null

  const picks: ShareCode['picks'] = []
  for (const entry of rest) {
    const [slotId, playerId] = entry.split('~')
    if (!slotId || !playerId) return null
    picks.push({ slotId, playerId })
  }

  return { version, sportId, seed, picks }
}

/** A short, sayable seed code for "everyone play this one" daily challenges. */
export function seedCode(seed: number): string {
  return toBase36(seed).toUpperCase().padStart(6, '0').slice(-6)
}

/** Today's shared seed, so every player gets the same daily draft. */
export function dailySeed(sportId: SportId, date = new Date()): number {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  let h = Math.floor(day / 86400000) >>> 0
  for (let i = 0; i < sportId.length; i += 1) {
    h = Math.imul(h ^ sportId.charCodeAt(i), 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Day number since launch, used to label a daily run. */
export function dailyNumber(date = new Date()): number {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const launch = Date.UTC(2026, 0, 1)
  return Math.max(1, Math.floor((day - launch) / 86400000) + 1)
}

/** ISO date for the current daily, used to key stored results. */
export function dailyKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Share text for a daily run.
 *
 * Deliberately does NOT include the picks. Everyone played the same spins, so
 * the interesting question is what someone else did with them — revealing the
 * roster answers that question and kills the reason to open the game. The
 * record and the day are enough to start the argument.
 */
export function dailyShareText(record: string, wins: number, day: number): string {
  const bar = renderBar(wins)
  return `162-0 Daily #${day}\n${record}\n${bar}`
}

/** A small visual of how close the run got, in the spirit of a Wordle grid. */
function renderBar(wins: number): string {
  const filled = Math.max(0, Math.min(10, Math.round((wins / 162) * 10)))
  return '\u25a0'.repeat(filled) + '\u25a1'.repeat(10 - filled)
}
