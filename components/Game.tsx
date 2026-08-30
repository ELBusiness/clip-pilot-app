'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { baseball } from '@/sports'
import { playerRating, projectPartial } from '@/sports/baseball'
import { franchiseNameFor } from '@/sports/baseball/players'
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
import Field from './Field'
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
  /** 'spin' shows the reels and the field; 'pick' shows the player list. */
  const [phase, setPhase] = useState<'spin' | 'pick'>('spin')
  const [filter, setFilter] = useState<'all' | 'IF' | 'OF' | 'P'>('all')
  const [query, setQuery] = useState('')
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
      setFilter('all')
      setQuery('')
      let elapsed = 0
      const tick = () => {
        elapsed += SPIN_TICK
        if (elapsed >= SPIN_MS) {
          setDisplay(next.spin)
          setSpinning(false)
          // The pick list only appears once the reel has stopped, so the spin
          // gets its own beat instead of being scenery behind a list.
          setPhase('pick')
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
      // Land on the spin screen: pressing SPIN is the moment of the game, and
      // auto-rolling into a list throws it away.
      const next = spin(ruleset, draft)
      setState(next)
      setDisplay(next.spin)
      setPhase('spin')
      setSpinning(false)
    },
    [ruleset],
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
      setDisplay(next.spin)
      setPhase('spin')
    }
  }

  const onReroll = () => {
    if (!state || state.rerolls <= 0) return
    const next = reroll(ruleset, state)
    setPending(null)
    setState(next)
    animateTo(next)
  }

  /** The SPIN button: the reel is already decided, this plays it out. */
  const onSpin = () => {
    if (!state || spinning) return
    animateTo(state)
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
    const groupOf = (player: Player) => {
      if (player.positions.some((p) => p === 'SP' || p === 'RP')) return 'P'
      if (player.positions.some((p) => p === 'OF' || p === 'LF' || p === 'CF' || p === 'RF')) return 'OF'
      return 'IF'
    }
    const needle = query.trim().toLowerCase()

    return candidatesFor(ruleset, state, state.spin)
      .filter((player) => filter === 'all' || groupOf(player) === filter)
      .filter((player) => !needle || player.name.toLowerCase().includes(needle))
      .map((player) => ({ player, rating: playerRating(player) }))
      .sort((a, b) => b.rating.score - a.rating.score || a.player.name.localeCompare(b.player.name))
  }, [ruleset, state, spinning, filter, query])

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

      <div className="reels">
        <div className={`reel-card team${spinning ? ' rolling' : ' landed'}`}>
          <span className="reel-kicker">Team</span>
          <span className="reel-value">
            {franchise ? franchiseNameFor(franchise, combo?.eraId) : '—'}
          </span>
        </div>
        <div className={`reel-card era${spinning ? ' rolling' : ' landed'}`}>
          <span className="reel-kicker">Era</span>
          <span className="reel-value">{eraLabel || '—'}</span>
        </div>
      </div>

      {phase === 'spin' ? (
        <>
          <button className="btn" onClick={onSpin} disabled={spinning}>
            {spinning ? 'Spinning…' : filled === 0 ? 'Spin' : 'Spin for the next pick'}
          </button>

          <div style={{ height: 12 }} />
          <Projection ruleset={ruleset} state={state} />
          <Field ruleset={ruleset} state={state} nextSlotId={nextSlot?.id} />
          <div className="spacer" />
        </>
      ) : pending ? (
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
          <Field ruleset={ruleset} state={state} nextSlotId={nextSlot?.id} />
          <div className="spacer" />
        </>
      ) : (
        <>
          <div className="pick-head">
            <span className="pill team">
              {franchise ? franchiseNameFor(franchise, combo?.eraId) : '—'}
            </span>
            <span className="pill era">{eraLabel}</span>
            {mode === 'free' && (
              <button className="respin" onClick={onReroll} disabled={state.rerolls <= 0}>
                {state.rerolls > 0 ? 'Re-spin' : 'No re-spins'}
              </button>
            )}
          </div>

          <div className="filters">
            <div className="filter-tabs">
              {(['all', 'IF', 'OF', 'P'] as const).map((key) => (
                <button
                  key={key}
                  className={`filter-tab${filter === key ? ' on' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {key === 'all' ? 'All' : key}
                </button>
              ))}
            </div>
            <input
              className="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search players"
            />
          </div>

          <Dock ruleset={ruleset} state={state} nextSlotId={nextSlot?.id} />

          <p className="pick-prompt">
            {candidates.length} available · best first
          </p>

          <div className="candidates">
            {candidates.map(({ player, rating }) => (
              <button key={player.id} className="cand" onClick={() => choose(player)}>
                <span className="cand-pos">{player.positions.join('/')}</span>
                <span className="cand-body">
                  <span className="cand-name">{player.name}</span>
                  <span className="cand-label">{rating.label}</span>
                </span>
                <StatColumns player={player} />
                <span className={`cand-rating num ${ratingTier(rating.score)}`}>
                  {rating.score}
                </span>
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="pick-prompt">No players match that filter.</p>
            )}
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

/**
 * The roster, compressed to a strip. The field is replaced by the player list
 * while picking, so without this a player has to remember thirteen slots from
 * the previous screen.
 */
function Dock({
  ruleset,
  state,
  nextSlotId,
}: {
  ruleset: Ruleset
  state: DraftState
  nextSlotId?: string
}) {
  return (
    <div className="dock">
      {ruleset.slots.map((slot) => {
        const pick = state.picks.find((p) => p.slotId === slot.id)
        const player = pick && ruleset.players.find((p) => p.id === pick.playerId)
        const rating = player ? playerRating(player) : null
        return (
          <div
            key={slot.id}
            className={`dock-slot${player ? ' filled' : ''}${slot.id === nextSlotId ? ' next' : ''}`}
            title={player ? `${slot.label}: ${player.name}` : slot.label}
          >
            <span className="dock-pos">{slot.id}</span>
            <span className="dock-rating num">{rating ? rating.score : '\u2014'}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * The three stats that decide a player, each with its name written under it.
 * A slash line like ".276/.346/.362" is unreadable unless you already know the
 * order; a labelled column at least tells you what you are looking at.
 */
function StatColumns({ player }: { player: Player }) {
  const s = player.stats
  const cols =
    s['era'] !== undefined
      ? [
          { label: 'ERA', value: (s['era'] ?? 0).toFixed(2) },
          { label: 'W', value: String(s['w'] ?? 0) },
          { label: 'K', value: String(s['so'] ?? 0) },
        ]
      : [
          { label: 'AVG', value: fmt3(s['avg'] ?? 0) },
          { label: 'OBP', value: fmt3(s['obp'] ?? 0) },
          { label: 'HR', value: String(s['hr'] ?? 0) },
        ]

  return (
    <span className="statcols">
      {cols.map((col) => (
        <span key={col.label} className="statcol">
          <b className="num">{col.value}</b>
          <small>{col.label}</small>
        </span>
      ))}
    </span>
  )
}

/** Baseball writes rate stats as .276, not 0.276. */
function fmt3(value: number): string {
  return value.toFixed(3).replace(/^0\./, '.')
}

/** Rating bands, so the number is readable at a glance and not just a number. */
function ratingTier(score: number): string {
  if (score >= 80) return 'elite'
  if (score >= 65) return 'good'
  if (score >= 45) return 'ok'
  return 'poor'
}

/**
 * A running projection of the finished team, with the all-time record marked on
 * the bar. Empty slots project as league-average players, so the number answers
 * "if I stopped here, what would this team do?" rather than flattering a roster
 * of one superstar.
 */
function Projection({ ruleset, state }: { ruleset: Ruleset; state: DraftState }) {
  const projected = useMemo(() => {
    const roster = state.picks.flatMap((p) => {
      const player = ruleset.players.find((x) => x.id === p.playerId)
      const slot = ruleset.slots.find((x) => x.id === p.slotId)
      return player && slot ? [{ player, slot }] : []
    })
    return projectPartial(roster)
  }, [ruleset, state.picks])

  const record = ruleset.benchmark.wins
  const scale = (wins: number) => Math.max(0, Math.min(100, ((wins - 50) / 112) * 100))

  return (
    <div className="projection">
      <span className="projection-label">Projected</span>
      <span className="projection-bar">
        <span style={{ width: `${scale(projected.wins)}%` }} />
        <i style={{ left: `${scale(record)}%` }} title={`Record: ${record} wins`} />
      </span>
      <span className="projection-value num">
        {projected.wins}-{ruleset.seasonGames - projected.wins}
      </span>
    </div>
  )
}

function RosterStrip({
  ruleset,
  state,
  nextSlotId,
}: {
  ruleset: Ruleset
  state: DraftState
  nextSlotId?: string
}) {
  return (
    <div className="strip">
      {ruleset.slots.map((slot) => {
        const pick = state.picks.find((p) => p.slotId === slot.id)
        const player = pick && ruleset.players.find((p) => p.id === pick.playerId)
        const rating = player ? playerRating(player) : null

        return (
          <div
            key={slot.id}
            className={`chip ${player ? 'filled' : 'empty'}${slot.id === nextSlotId && !player ? ' next' : ''}`}
            title={player ? `${slot.label}: ${player.name}` : slot.label}
          >
            <div className="chip-pos">{slot.id}</div>
            <div className={`chip-rating num ${rating ? ratingTier(rating.score) : ''}`}>
              {rating ? rating.score : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
