'use client'

import type { DraftState } from '@/engine/draft'
import type { Ruleset } from '@/engine/types'
import { playerRating } from '@/sports/baseball'

/**
 * The roster as a baseball field.
 *
 * A list of position codes teaches a newcomer nothing — "SS" and "CF" are
 * jargon until you see where they stand. Putting the nine fielders where they
 * actually play makes the roster readable at a glance and borrows the sport's
 * own diagram instead of inventing an abstraction. The designated hitter and
 * the staff sit off the field, because that is exactly where they are.
 */

/**
 * Percentage coordinates on the field, home plate at the bottom. The ace takes
 * the mound: he is one of the nine on the field, and leaving the middle of the
 * diamond empty reads as a missing feature.
 */
const SPOTS: Record<string, { x: number; y: number }> = {
  LF: { x: 17, y: 24 },
  CF: { x: 50, y: 11 },
  RF: { x: 83, y: 24 },
  SS: { x: 34, y: 46 },
  '2B': { x: 66, y: 46 },
  '3B': { x: 17, y: 62 },
  '1B': { x: 83, y: 62 },
  SP1: { x: 50, y: 62 },
  C: { x: 50, y: 88 },
}

export default function Field({
  ruleset,
  state,
  nextSlotId,
  onSlotTap,
}: {
  ruleset: Ruleset
  state: DraftState
  nextSlotId?: string
  onSlotTap?: (slotId: string) => void
}) {
  const fielders = ruleset.slots.filter((slot) => SPOTS[slot.id])
  const offField = ruleset.slots.filter((slot) => !SPOTS[slot.id])

  const render = (slotId: string) => {
    const slot = ruleset.slots.find((s) => s.id === slotId)!
    const pick = state.picks.find((p) => p.slotId === slotId)
    const player = pick && ruleset.players.find((p) => p.id === pick.playerId)
    const rating = player ? playerRating(player) : null
    return { slot, player, rating }
  }

  return (
    <div className="field-wrap">
      <div className="field">
        <FieldLines />
        {fielders.map((slot) => {
          const { player, rating } = render(slot.id)
          const spot = SPOTS[slot.id]!
          return (
            <button
              key={slot.id}
              type="button"
              className={`spot${player ? ' filled' : ''}${slot.id === nextSlotId ? ' next' : ''}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              onClick={() => onSlotTap?.(slot.id)}
              title={player ? `${slot.label}: ${player.name}` : slot.label}
            >
              <span className="spot-pos">{slot.id}</span>
              {player ? (
                <span className="spot-name">{lastName(player.name)}</span>
              ) : (
                <span className="spot-dash">—</span>
              )}
              {rating && <span className="spot-rating num">{rating.score}</span>}
            </button>
          )
        })}
      </div>

      <div className="bench">
        {offField.map((slot) => {
          const { player, rating } = render(slot.id)
          return (
            <button
              key={slot.id}
              type="button"
              className={`bench-slot${player ? ' filled' : ''}${slot.id === nextSlotId ? ' next' : ''}`}
              onClick={() => onSlotTap?.(slot.id)}
              title={player ? `${slot.label}: ${player.name}` : slot.label}
            >
              <span className="bench-pos">{slot.id}</span>
              <span className="bench-name">{player ? lastName(player.name) : '\u2014'}</span>
              <span className={`bench-rating num${rating ? '' : ' empty'}`}>
                {rating ? rating.score : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Surnames only: a field marker has room for one word. */
function lastName(name: string): string {
  const parts = name.split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : name
}

/** Chalk lines, drawn rather than imaged so they scale to any phone. */
function FieldLines() {
  return (
    <svg className="field-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {/* Outfield wall */}
      <path d="M 50 96 L 2 42 A 66 66 0 0 1 98 42 Z" className="fl-grass" />
      {/* Infield dirt */}
      <path d="M 50 92 L 22 63 A 40 40 0 0 1 78 63 Z" className="fl-dirt" />
      {/* Basepaths */}
      <path d="M 50 90 L 26 62 L 50 36 L 74 62 Z" className="fl-line" />
      {/* Foul lines */}
      <path d="M 50 90 L 6 46 M 50 90 L 94 46" className="fl-line" />
      {/* Mound */}
      <circle cx="50" cy="62" r="4.5" className="fl-dirt" />
    </svg>
  )
}
