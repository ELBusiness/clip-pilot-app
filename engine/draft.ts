/**
 * The draft loop: spin, pick, repeat.
 *
 * The one rule that matters here is that a spin must never be a dead end. The
 * genre's worst failure mode is landing on a franchise/era that has nobody you
 * can legally play, which reads as the game being broken rather than as a hard
 * choice. `eligibleCombos` filters the reel down to pools that can actually
 * fill a slot you still have open, so every spin is playable and the tension
 * comes from the trade-off instead of the dud.
 */

import type { Combo, Pick, Player, RosterSlot, Ruleset } from './types'
import { createRng, deriveSeed } from './rng'

export interface DraftState {
  seed: number
  sportId: Ruleset['id']
  round: number
  picks: Pick[]
  /** The pool the current pick must come from; null before the first spin. */
  spin: Combo | null
  /** Re-spins left. A scarce resource is what makes a bad spin a decision. */
  rerolls: number
  status: 'ready' | 'picking' | 'complete'
}

export const REROLLS_PER_RUN = 1

export function createDraft(
  ruleset: Ruleset,
  seed: number,
  options: { rerolls?: number } = {},
): DraftState {
  return {
    seed,
    sportId: ruleset.id,
    round: 1,
    picks: [],
    spin: null,
    // The daily runs with none: everyone gets the same draw, and being able to
    // dodge a thin franchise would make the shared leaderboard meaningless.
    rerolls: options.rerolls ?? REROLLS_PER_RUN,
    status: 'ready',
  }
}

/** Slots with no pick yet, in board order. */
export function openSlots(ruleset: Ruleset, state: DraftState): RosterSlot[] {
  const filled = new Set(state.picks.map((p) => p.slotId))
  return ruleset.slots.filter((slot) => !filled.has(slot.id))
}

function playerIsEligibleFor(player: Player, slot: RosterSlot): boolean {
  return player.positions.some((position) => slot.accepts.includes(position))
}

/** Every slot this player could still be assigned to. */
export function slotsForPlayer(
  ruleset: Ruleset,
  state: DraftState,
  player: Player,
): RosterSlot[] {
  return openSlots(ruleset, state).filter((slot) => playerIsEligibleFor(player, slot))
}

/**
 * Players from `combo` who are undrafted and can fill a slot that is still
 * open. This is the pick list the UI renders.
 */
export function candidatesFor(
  ruleset: Ruleset,
  state: DraftState,
  combo: Combo,
): Player[] {
  const taken = new Set(state.picks.map((p) => p.playerId))
  const open = openSlots(ruleset, state)
  return ruleset.players.filter(
    (player) =>
      player.franchiseId === combo.franchiseId &&
      player.eraId === combo.eraId &&
      !taken.has(player.id) &&
      open.some((slot) => playerIsEligibleFor(player, slot)),
  )
}

/**
 * Franchise/era pairs that would yield at least one legal pick right now.
 * Spinning only over these is what guarantees no dead spins.
 */
export function eligibleCombos(ruleset: Ruleset, state: DraftState): Combo[] {
  const taken = new Set(state.picks.map((p) => p.playerId))
  const open = openSlots(ruleset, state)
  if (open.length === 0) return []

  const seen = new Set<string>()
  const combos: Combo[] = []

  for (const player of ruleset.players) {
    const key = `${player.franchiseId}:${player.eraId}`
    if (seen.has(key)) continue
    if (taken.has(player.id)) continue
    if (!open.some((slot) => playerIsEligibleFor(player, slot))) continue
    seen.add(key)
    combos.push({ franchiseId: player.franchiseId, eraId: player.eraId })
  }

  return combos
}

/**
 * Advance the reel. Each round draws from its own derived stream so that the
 * sequence of spins depends only on the seed and the round — not on how long
 * the player deliberated or how many candidate lists the UI rendered.
 */
export function spin(ruleset: Ruleset, state: DraftState): DraftState {
  return drawFrom(state, eligibleCombos(ruleset, state), 'all')
}

/** Pick a combo out of a pool on a stream that is a function of the draw only. */
function drawFrom(state: DraftState, pool: Combo[], tag: string): DraftState {
  if (pool.length === 0) {
    return { ...state, spin: null, status: 'complete' }
  }
  const rng = createRng(deriveSeed(state.seed, `spin:${state.round}:${state.rerolls}:${tag}`))
  return { ...state, spin: rng.pick(pool), status: 'picking' }
}

/**
 * Which half of the reel a re-spin turns.
 *
 * Re-spinning the whole combo throws away the good half with the bad. Holding
 * one reel and turning the other is the decision the genre actually wants: a
 * loaded franchise in the wrong decade is a fixable problem, and being able to
 * say which half was wrong is more interesting than rolling the dice again.
 */
export type RerollAxis = 'team' | 'era' | 'both'

/**
 * Combos a re-spin on this axis could land on. Excludes the current combo —
 * a re-spin that can only return what you already have is not a re-spin, and
 * the control is disabled rather than spending the budget on nothing.
 */
export function rerollOptions(
  ruleset: Ruleset,
  state: DraftState,
  axis: RerollAxis,
): Combo[] {
  const current = state.spin
  const all = eligibleCombos(ruleset, state)
  if (!current) return all

  switch (axis) {
    case 'team':
      // Same decade, a different club in it.
      return all.filter((c) => c.eraId === current.eraId && c.franchiseId !== current.franchiseId)
    case 'era':
      // Same club, a different decade of it.
      return all.filter((c) => c.franchiseId === current.franchiseId && c.eraId !== current.eraId)
    case 'both':
      return all.filter(
        (c) => c.franchiseId !== current.franchiseId || c.eraId !== current.eraId,
      )
  }
}

/**
 * Burn a re-spin on one axis. Consuming a reroll changes the derived stream,
 * so the new combo is genuinely different rather than a repeat of the draw.
 *
 * The budget is per run, not per axis: a targeted re-spin is the stronger move,
 * so letting you choose where to aim it is the whole change — the number of
 * times you may aim it is deliberately unchanged.
 */
export function reroll(
  ruleset: Ruleset,
  state: DraftState,
  axis: RerollAxis = 'both',
): DraftState {
  if (state.rerolls <= 0 || state.status !== 'picking') return state
  const next = { ...state, rerolls: state.rerolls - 1 }
  const pool = rerollOptions(ruleset, state, axis)
  // Nothing else to land on: keep the combo and, importantly, the re-spin.
  if (pool.length === 0) return state
  return drawFrom(next, pool, axis)
}

/** Commit a pick. Returns the state unchanged if the pick is not legal. */
export function pick(
  ruleset: Ruleset,
  state: DraftState,
  playerId: string,
  slotId: string,
): DraftState {
  if (!state.spin || state.status !== 'picking') return state

  const player = ruleset.players.find((p) => p.id === playerId)
  const slot = ruleset.slots.find((s) => s.id === slotId)
  if (!player || !slot) return state

  const legal = candidatesFor(ruleset, state, state.spin).some((c) => c.id === playerId)
  if (!legal) return state
  if (!slotsForPlayer(ruleset, state, player).some((s) => s.id === slotId)) return state

  const picks: Pick[] = [
    ...state.picks,
    {
      slotId,
      playerId,
      franchiseId: player.franchiseId,
      eraId: player.eraId,
      round: state.round,
    },
  ]

  const complete = picks.length >= ruleset.slots.length
  const advanced: DraftState = {
    ...state,
    picks,
    round: state.round + 1,
    spin: null,
    status: complete ? 'complete' : 'ready',
  }

  return complete ? advanced : spin(ruleset, advanced)
}

/** Resolve picks into the roster the ruleset scores. */
export function buildRoster(ruleset: Ruleset, state: DraftState) {
  return state.picks.flatMap((p) => {
    const player = ruleset.players.find((x) => x.id === p.playerId)
    const slot = ruleset.slots.find((s) => s.id === p.slotId)
    return player && slot ? [{ player, slot }] : []
  })
}
