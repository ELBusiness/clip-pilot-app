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

export function createDraft(ruleset: Ruleset, seed: number): DraftState {
  return {
    seed,
    sportId: ruleset.id,
    round: 1,
    picks: [],
    spin: null,
    rerolls: REROLLS_PER_RUN,
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
  const combos = eligibleCombos(ruleset, state)
  if (combos.length === 0) {
    return { ...state, spin: null, status: 'complete' }
  }

  const rng = createRng(deriveSeed(state.seed, `spin:${state.round}:${state.rerolls}`))
  const combo = rng.pick(combos)

  return { ...state, spin: combo, status: 'picking' }
}

/**
 * Burn a re-spin. Consuming a reroll changes the derived stream, so the new
 * combo is genuinely different rather than a repeat of the same draw.
 */
export function reroll(ruleset: Ruleset, state: DraftState): DraftState {
  if (state.rerolls <= 0 || state.status !== 'picking') return state
  return spin(ruleset, { ...state, rerolls: state.rerolls - 1 })
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
