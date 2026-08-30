'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { baseball } from '@/sports'
import { playerRating } from '@/sports/baseball'
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
import { dailyKey, dailyNumber, dailySeed, dailyShareText, encodeRun, seedCode } from '@/engine/share'
import type { Combo, Player, Ruleset } from '@/engine/types'
import SeasonReport from './SeasonReport'

/** How long the reel cycles before it settles, in ms. */
const SPIN_MS = 850
const SPIN_TICK = 70

/** Where a finished daily run is remembered, so it cannot be replayed. */
const DAILY_STORE = 'perfect-season:daily'

type Mode = 'free' | 'daily'

interface StoredDaily {
  date: string
  record: string
  wins: number
}

/** localStorage can throw outright in private windows; never let that break the game. */
function readDaily(): StoredDaily | null {
  try {
    const raw = window.localStorage.getItem(DAILY_STORE)
    return raw ? (JSON.parse(raw) as StoredDaily) : null
  } catch {
    return null
  }
}

function writeDaily(value: StoredDaily): void {
  try {
    window.localStorage.setItem(DAILY_STORE, JSON.stringify(value))
  } catch {
    // A viewer who blocks site data just gets to replay the daily. Not fatal.
  }
}

export default function Game() {
  const ruleset = baseball

  const [state, setState] = useState<DraftState | null>(null)
  const [display, setDisplay] = useState<Combo | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [pending, setPending] = useState<Player | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('free')
  const [dailyDone, setDailyDone] = useState<StoredDaily | null>(null)
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
    (seed: number, nextMode: Mode = 'free') => {
      setResult(null)
      setPending(null)
      setMode(nextMode)
      // No re-spins in the daily: everyone faces the same draw, so dodging a
      // thin franchise would make comparing records meaningless.
      const draft = createDraft(ruleset, seed, nextMode === 'daily' ? { rerolls: 0 } : {})
      const next = spin(ruleset, draft)
      setState(next)
      animateTo(next)
    },
    [ruleset, animateTo],
  )

  // A seed in the URL replays someone else's exact draft; ?daily opens today's.
  useEffect(() => {
    setDailyDone(readDaily())
    const url = new URL(window.location.href)
    if (url.searchParams.has('daily')) {
      start(dailySeed('baseball'), 'daily')
      return clearTimers
    }
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
      const finished = runSeason(ruleset, next)
      setResult(finished)
      if (mode === 'daily' && finished) {
        const record = { date: dailyKey(), record: finished.season.record, wins: finished.season.wins }
        writeDaily(record)
        setDailyDone(record)
      }
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
    url.search = ''

    // The daily card shows the record and nothing else. Everyone played the
    // same spins, so revealing the roster answers the only interesting
    // question and removes the reason to open the game.
    let text: string
    if (mode === 'daily') {
      url.searchParams.set('daily', '1')
      text = result
        ? dailyShareText(result.season.record, result.season.wins, dailyNumber())
        : `162-0 Daily #${dailyNumber()}`
    } else {
      url.searchParams.set('seed', seedCode(state.seed).toLowerCase())
      text = result
        ? `${result.season.record} in ${ruleset.slug} ${ruleset.sport}. Beat my seed:`
        : `Try my ${ruleset.slug} seed:`
    }
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
  /**
   * Label the reel with the years this franchise actually fielded players in
   * this era, not the era's full span. The Mariners did not exist until 1977,
   * so "Seattle Mariners, 1960s-70s" reads like a bug even though the bucket
   * is correct.
   */
  const eraLabel = useMemo(() => {
    const era = ruleset.eras.find((e) => e.id === combo?.eraId)
    if (!combo || !era) return era?.label ?? ''
    const years = ruleset.players
      .filter((p) => p.franchiseId === combo.franchiseId && p.eraId === combo.eraId)
      .map((p) => p.year)
    if (years.length === 0) return era.label
    const first = Math.min(...years)
    const last = Math.max(...years)
    // Only narrow the label when the franchise really was absent for much of
    // the era; otherwise the decade name reads better.
    const span = era.endYear - era.startYear
    if (first - era.startYear < span * 0.25 && era.endYear - last < span * 0.25) {
      return era.label
    }
    return first === last ? `${first}` : `${first}-${last}`
  }, [ruleset, combo])

  const candidates = useMemo(() => {
    if (!state?.spin || spinning) return []
    // Best player first. Baseball stat lines are unreadable to a newcomer —
    // nobody new can tell whether ".276/.346/.362" beats "3.41 ERA" — so the
    // list is ordered by the same runs-above-average the simulation scores, and
    // each card carries that number. Sorting by position instead would hide the
    // one thing a new player actually needs to know.
    return candidatesFor(ruleset, state, state.spin)
      .map((player) => ({ player, rating: playerRating(player) }))
      .sort((a, b) => b.rating.score - a.rating.score || a.player.name.localeCompare(b.player.name))
  }, [ruleset, state, spinning])

  if (!state) return <main className="shell" />

  if (result) {
    return (
      <SeasonReport
        ruleset={ruleset}
        result={result}
        mode={mode}
        dayNumber={dailyNumber()}
        seedLabel={seedCode(state.seed)}
        shareCode={encodeRun(state)}
        onShare={share}
        onReplay={() => start((Math.random() * 0xffffffff) >>> 0, 'free')}
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
        <span className="round-pill">
          {mode === 'daily' ? `Daily #${dailyNumber()}` : '162-0 · MLB'}
        </span>
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
          <div className="reel-era">{eraLabel}</div>
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
            {spinning
              ? 'Spinning…'
              : `${candidates.length} available · best first`}
          </p>
          <div className="candidates">
            {candidates.map(({ player, rating }) => (
              <button key={player.id} className="cand" onClick={() => choose(player)}>
                <span className="cand-pos">{player.positions.join('/')}</span>
                <span className="cand-body">
                  <span className="cand-name">{player.name}</span>
                  <span className="cand-stat num">{ruleset.statLine(player)}</span>
                  <span className="cand-label">{rating.label}</span>
                </span>
                <span className={`cand-rating num ${ratingTier(rating.score)}`}>
                  {rating.score}
                </span>
              </button>
            ))}
          </div>
          <div className="btn-row">
            {mode === 'daily' ? (
              <button
                className="btn ghost"
                onClick={() => start(dailySeed('baseball'), 'daily')}
                disabled={spinning}
              >
                Restart today's draft
              </button>
            ) : (
              <button
                className="btn ghost"
                onClick={onReroll}
                disabled={state.rerolls <= 0 || spinning}
              >
                {state.rerolls > 0 ? `Re-spin (${state.rerolls} left)` : 'No re-spins left'}
              </button>
            )}
            {mode === 'free' && (
              <button
                className="btn ghost"
                onClick={() => start(dailySeed('baseball'), 'daily')}
                disabled={spinning}
              >
                {dailyDone?.date === dailyKey() ? `Daily · ${dailyDone.record}` : 'Play the Daily'}
              </button>
            )}
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

/** Rating bands, so the number is readable at a glance and not just a number. */
function ratingTier(score: number): string {
  if (score >= 80) return 'elite'
  if (score >= 65) return 'good'
  if (score >= 45) return 'ok'
  return 'poor'
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
