'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { baseball } from '@/sports'
import {
  candidatesFor,
  createDraft,
  eligibleCombos,
  openSlots,
  pick as commitPick,
  reroll,
  slotsForPlayer,
  spin,
  type DraftState,
} from '@/engine/draft'
import { runSeason, type RunResult } from '@/engine/run'
import { encodeRun, seedCode } from '@/engine/share'
import type { Combo, Player, Ruleset } from '@/engine/types'
import SeasonReport from './SeasonReport'

/** How long the reel cycles before it settles, in ms. */
const SPIN_MS = 850
const SPIN_TICK = 70

export default function Game() {
  const ruleset = baseball

  const [state, setState] = useState<DraftState | null>(null)
  const [display, setDisplay] = useState<Combo | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [pending, setPending] = useState<Player | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  /**
   * Run the reel animation, then reveal the combo the engine already decided.
   * The outcome is fixed before the animation starts — the cycling is feedback,
   * not the draw — so a seed always replays identically no matter how the
   * animation is interrupted.
   */
  const animateTo = useCallback(
    (next: DraftState) => {
      clearTimers()
      const pool = eligibleCombos(ruleset, { ...next, spin: null })
      if (pool.length === 0 || !next.spin) {
        setDisplay(next.spin)
        return
      }

      setSpinning(true)
      let elapsed = 0
      const tick = () => {
        elapsed += SPIN_TICK
        if (elapsed >= SPIN_MS) {
          setDisplay(next.spin)
          setSpinning(false)
          return
        }
        setDisplay(pool[Math.floor(Math.random() * pool.length)] ?? next.spin)
        timers.current.push(setTimeout(tick, SPIN_TICK))
      }
      timers.current.push(setTimeout(tick, SPIN_TICK))
    },
    [ruleset],
  )

  const start = useCallback(
    (seed: number) => {
      setResult(null)
      setPending(null)
      const next = spin(ruleset, createDraft(ruleset, seed))
      setState(next)
      animateTo(next)
    },
    [ruleset, animateTo],
  )

  // A seed in the URL replays someone else's exact draft.
  useEffect(() => {
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('seed')
    const parsed = fromUrl ? parseInt(fromUrl, 36) : NaN
    start(Number.isFinite(parsed) ? parsed : (Math.random() * 0xffffffff) >>> 0)
    return clearTimers
  }, [start])

  const choose = (player: Player, slotId?: string) => {
    if (!state) return
    const slots = slotsForPlayer(ruleset, state, player)
    // Only ask which position when the choice actually matters.
    if (!slotId && slots.length > 1) {
      setPending(player)
      return
    }
    const target = slotId ?? slots[0]?.id
    if (!target) return

    const next = commitPick(ruleset, state, player.id, target)
    setPending(null)
    setState(next)

    if (next.status === 'complete') {
      setResult(runSeason(ruleset, next))
    } else {
      animateTo(next)
    }
  }

  const onReroll = () => {
    if (!state || state.rerolls <= 0) return
    const next = reroll(ruleset, state)
    setPending(null)
    setState(next)
    animateTo(next)
  }

  const share = async () => {
    if (!state) return
    const url = new URL(window.location.href)
    url.searchParams.set('seed', seedCode(state.seed).toLowerCase())
    const text = result
      ? `${result.season.record} in ${ruleset.slug} ${ruleset.sport}. Beat my seed:`
      : `Try my ${ruleset.slug} seed:`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Perfect Season', text, url: url.toString() })
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setToast('Link copied')
      setTimeout(() => setToast(null), 1800)
    } catch {
      // A cancelled share sheet is a normal outcome, not an error worth showing.
    }
  }

  const combo = display
  const franchise = useMemo(
    () => ruleset.franchises.find((f) => f.id === combo?.franchiseId),
    [ruleset, combo],
  )
  const era = useMemo(
    () => ruleset.eras.find((e) => e.id === combo?.eraId),
    [ruleset, combo],
  )

  const candidates = useMemo(() => {
    if (!state?.spin || spinning) return []
    // Order the pick list the way the roster board reads — catchers first,
    // then the infield, outfield, and arms. With twenty-odd players on a deep
    // franchise, alphabetical order makes you hunt for the position you need.
    const slotRank = new Map(ruleset.slots.map((slot, i) => [slot.id, i]))
    const rankOf = (player: Player) => {
      const slots = slotsForPlayer(ruleset, state, player)
      return slots.reduce((best, slot) => Math.min(best, slotRank.get(slot.id) ?? 99), 99)
    }
    return candidatesFor(ruleset, state, state.spin).sort(
      (a, b) => rankOf(a) - rankOf(b) || a.name.localeCompare(b.name),
    )
  }, [ruleset, state, spinning])

  if (!state) return <main className="shell" />

  if (result) {
    return (
      <SeasonReport
        ruleset={ruleset}
        result={result}
        seedLabel={seedCode(state.seed)}
        shareCode={encodeRun(state)}
        onShare={share}
        onReplay={() => start((Math.random() * 0xffffffff) >>> 0)}
        toast={toast}
      />
    )
  }

  const filled = state.picks.length
  const total = ruleset.slots.length
  const nextSlot = openSlots(ruleset, state)[0]

  return (
    <main className="shell">
      <div className="topbar">
        <span className="round-pill">162-0 · MLB</span>
        <span className="round-pill">
          Pick {Math.min(filled + 1, total)} of {total}
        </span>
      </div>

      <div
        className={`reel${spinning ? ' spinning' : ''}`}
        style={{ ['--c1' as string]: franchise?.colors[0] ?? '#333' }}
      >
        <div className="reel-inner">
          <div className="reel-label">Draft from</div>
          <div className="reel-team">{franchise?.name ?? '—'}</div>
          <div className="reel-era">{era?.label ?? ''}</div>
        </div>
      </div>

      <RosterBoard ruleset={ruleset} state={state} nextSlotId={nextSlot?.id} />

      {pending ? (
        <>
          <p className="pick-prompt">Where does {pending.name} play?</p>
          <div className="slot-row">
            {slotsForPlayer(ruleset, state, pending).map((slot) => (
              <button key={slot.id} className="slot-chip" onClick={() => choose(pending, slot.id)}>
                {slot.label}
              </button>
            ))}
            <button className="slot-chip" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="pick-prompt">
            {spinning ? 'Spinning…' : `${candidates.length} available`}
          </p>
          <div className="candidates">
            {candidates.map((player) => (
              <button key={player.id} className="cand" onClick={() => choose(player)}>
                <span className="cand-pos">{player.positions.join('/')}</span>
                <span className="cand-body">
                  <span className="cand-name">{player.name}</span>
                  <span className="cand-stat num">{ruleset.statLine(player)}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn ghost" onClick={onReroll} disabled={state.rerolls <= 0 || spinning}>
              {state.rerolls > 0 ? `Re-spin (${state.rerolls} left)` : 'No re-spins left'}
            </button>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

function RosterBoard({
  ruleset,
  state,
  nextSlotId,
}: {
  ruleset: Ruleset
  state: DraftState
  nextSlotId?: string
}) {
  return (
    <div className="board">
      {ruleset.slots.map((slot) => {
        const pick = state.picks.find((p) => p.slotId === slot.id)
        const player = pick && ruleset.players.find((p) => p.id === pick.playerId)
        const franchise = pick && ruleset.franchises.find((f) => f.id === pick.franchiseId)
        const cls = player ? '' : slot.id === nextSlotId ? ' empty next' : ' empty'
        return (
          <div key={slot.id} className={`board-slot${cls}`}>
            <div className="board-pos">{slot.id}</div>
            {player ? (
              <>
                <div className="board-name">{player.name}</div>
                <div className="board-team">{franchise?.short}</div>
              </>
            ) : (
              <div className="board-name" style={{ color: 'var(--text-faint)' }}>
                {slot.label}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
