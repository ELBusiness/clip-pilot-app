'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { baseball } from '@/sports'
import {
  PAYROLL_CAP,
  payrollOf,
  playerCost,
  playerRating,
  positionOutlook,
  projectPartial,
  scarcityEdge,
  type Outlook,
} from '@/sports/baseball'
import { eraLabelFor, franchiseNameFor } from '@/sports/baseball/players'
import {
  candidatesFor,
  createDraft,
  eligibleCombos,
  openSlots,
  pick as commitPick,
  reroll,
  rerollOptions,
  type RerollAxis,
  slotsForPlayer,
  spin,
  type DraftState,
} from '@/engine/draft'
import { runSeason, type RunResult } from '@/engine/run'
import { loadBest, recordRun, type BestOutcome, type BestRun } from '@/lib/best'
import { teamStyle } from '@/lib/team-colors'
import { shareOrigin } from '@/lib/site'
import Start from '@/components/Start'
import { dailyKey, dailyNumber, dailySeed, dailyShareText, encodeRun, seedCode } from '@/engine/share'
import type { Combo, Player, Ruleset } from '@/engine/types'
import {
  PALETTES,
  applyPalette,
  currentPalette,
  hapticsEnabled,
  type Palette,
  hapticsSupport,
  type HapticsSupport,
  playLand,
  playPick,
  playReveal,
  playTick,
  resume,
  setHapticsEnabled,
  setSoundEnabled,
  soundEnabled,
  vibrate,
} from '@/lib/sound'
import Field from './Field'
import Masthead from './Masthead'
import SeasonReport from './SeasonReport'

/**
 * Reel timing.
 *
 * A real slot machine decelerates: symbols fly past at first and crawl at the
 * end, and the last two clicks are where all the tension lives. Ticks are
 * therefore spaced by the inverse of an ease-out curve rather than evenly, so
 * they start about 60ms apart and finish around 300ms apart.
 *
 * The two reels stop at different times, team first, so the era landing gets
 * its own beat instead of being swallowed by a simultaneous stop.
 */
const TEAM_TICKS = 18
const ERA_TICKS = 23
const SPIN_MS = 2600

/** Fastest and slowest gap between two clicks, in ms. */
const MIN_GAP = 48
const MAX_GAP = 300

/**
 * Times, in ms from the start, at which each reel symbol passes the window.
 *
 * Gaps come from the inverse of an ease-out curve, then get clamped. Without
 * the clamp the curve puts the final symbol a full second after the one before
 * it, which reads as the animation having frozen rather than as a reel slowing
 * down. Capping the gap keeps the tail as three or four deliberate clicks,
 * which is the part that actually feels like a slot machine.
 */
function tickSchedule(ticks: number, extraTail = 0): number[] {
  const eased: number[] = []
  for (let i = 1; i <= ticks; i += 1) {
    // Inverse of easeOutCubic: solving 1-(1-u)^3 = i/n for u.
    eased.push(SPIN_MS * (1 - Math.cbrt(1 - i / ticks)))
  }

  const times: number[] = []
  let at = 0
  let previous = 0
  for (const target of eased) {
    const gap = Math.min(MAX_GAP, Math.max(MIN_GAP, target - previous))
    at += gap
    times.push(at)
    previous = target
  }

  // Extra clicks at the slowest pace, so the second reel visibly outlasts the
  // first. Landing both at once wastes the stagger; landing the era a beat
  // later gives it its own moment.
  for (let i = 0; i < extraTail; i += 1) {
    at += MAX_GAP
    times.push(at)
  }
  return times
}

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
  /** Which franchise and era each reel currently shows while turning. */
  const [teamDisplay, setTeamDisplay] = useState<string | null>(null)
  const [eraDisplay, setEraDisplay] = useState<string | null>(null)
  const [teamSettled, setTeamSettled] = useState(true)
  const [eraSettled, setEraSettled] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sound, setSound] = useState(true)
  const [haptics, setHaptics] = useState(true)
  const [hapticSupport, setHapticSupport] = useState<HapticsSupport>('ok')
  const [palette, setPalette] = useState<Palette>('night')
  const [dailyDone, setDailyDone] = useState<StoredDaily | null>(null)
  /** The bar to beat, read once on mount and refreshed after every free run. */
  const [best, setBest] = useState<BestRun | null>(null)
  const [outcome, setOutcome] = useState<BestOutcome | null>(null)
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
    (next: DraftState, axis: RerollAxis = 'both') => {
      clearTimers()
      const pool = eligibleCombos(ruleset, { ...next, spin: null })
      if (pool.length === 0 || !next.spin) {
        setDisplay(next.spin)
        return
      }

      const teams = [...new Set(pool.map((c) => c.franchiseId))]
      const eras = [...new Set(pool.map((c) => c.eraId))]

      // A targeted re-spin turns one reel and holds the other, which is the
      // whole point of aiming it — watching the half you kept cycle back to
      // itself would say the opposite of what happened.
      const turnTeam = axis !== 'era'
      const turnEra = axis !== 'team'

      setSpinning(true)
      setTeamSettled(!turnTeam)
      setEraSettled(!turnEra)
      setFilter('all')
      setQuery('')
      void resume()

      // The outcome is already decided; this only plays it out, so a seed
      // replays identically however the animation is interrupted.
      const teamTimes = turnTeam ? tickSchedule(TEAM_TICKS) : []
      const eraTimes = turnEra ? tickSchedule(ERA_TICKS, 2) : []
      // Whichever reel stops last hands over to the pick list.
      const lastTeam = teamTimes[teamTimes.length - 1] ?? -1
      const lastEra = eraTimes[eraTimes.length - 1] ?? -1
      const handoff = lastEra >= lastTeam ? 'era' : 'team'

      const settle = () => {
        setDisplay(next.spin)
        setSpinning(false)
        // The pick list appears only once the reels have stopped, so the spin
        // keeps its own beat instead of being scenery behind a list.
        setPhase('pick')
      }

      if (!turnTeam) setTeamDisplay(next.spin.franchiseId)
      if (!turnEra) setEraDisplay(next.spin.eraId)

      teamTimes.forEach((at, i) => {
        const last = i === teamTimes.length - 1
        timers.current.push(
          setTimeout(() => {
            setTeamDisplay(last ? next.spin!.franchiseId : (teams[i % teams.length] ?? next.spin!.franchiseId))
            if (last) {
              setTeamSettled(true)
              playLand()
              vibrate(18)
              if (handoff === 'team') settle()
            } else {
              playTick()
            }
          }, at),
        )
      })

      eraTimes.forEach((at, i) => {
        const last = i === eraTimes.length - 1
        timers.current.push(
          setTimeout(() => {
            setEraDisplay(last ? next.spin!.eraId : (eras[i % eras.length] ?? next.spin!.eraId))
            if (last) {
              setEraSettled(true)
              playLand()
              vibrate([22, 40, 22])
              if (handoff === 'era') settle()
            } else {
              playTick()
            }
          }, at),
        )
      })
    },
    [ruleset],
  )

  const start = useCallback(
    (seed: number, nextMode: Mode = 'free') => {
      setResult(null)
      setOutcome(null)
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
      setTeamDisplay(next.spin?.franchiseId ?? null)
      setEraDisplay(next.spin?.eraId ?? null)
      setTeamSettled(true)
      setEraSettled(true)
      setPhase('spin')
      setSpinning(false)
    },
    [ruleset],
  )

  // A seed in the URL replays someone else's exact draft; ?daily opens today's.
  useEffect(() => {
    setDailyDone(readDaily())
    setBest(loadBest())
    setSound(soundEnabled())
    setHaptics(hapticsEnabled())
    setHapticSupport(hapticsSupport())
    const stored = currentPalette()
    setPalette(stored)
    applyPalette(stored)
    const url = new URL(window.location.href)
    if (url.searchParams.has('daily')) {
      start(dailySeed('baseball'), 'daily')
      return clearTimers
    }
    const fromUrl = url.searchParams.get('seed')
    const parsed = fromUrl ? parseInt(fromUrl, 36) : NaN
    if (Number.isFinite(parsed)) {
      start(parsed)
      return clearTimers
    }
    // No draft named in the URL: open on the start screen rather than dropping
    // a first-time player into the middle of a spin with nothing explained.
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
    playPick()
    vibrate(10)

    if (next.status === 'complete') {
      const finished = runSeason(ruleset, next)
      setResult(finished)
      playReveal()
      vibrate([30, 60, 30, 60, 60])
      if (finished && mode === 'daily') {
        const record = { date: dailyKey(), record: finished.season.record, wins: finished.season.wins }
        writeDaily(record)
        setDailyDone(record)
      }
      // Only free play sets the personal best: the daily is one draft per day,
      // so a good one would raise a bar nobody could then attack.
      if (finished && mode === 'free') {
        const { season } = finished
        setOutcome(
          recordRun({
            wins: season.wins,
            losses: season.losses,
            record: season.record,
            scored: season.scored,
            allowed: season.allowed,
          }),
        )
        setBest(loadBest())
      }
    } else {
      setDisplay(next.spin)
      setTeamDisplay(next.spin?.franchiseId ?? null)
      setEraDisplay(next.spin?.eraId ?? null)
      setPhase('spin')
    }
  }

  const onReroll = (axis: RerollAxis) => {
    if (!state || state.rerolls <= 0) return
    const next = reroll(ruleset, state, axis)
    // reroll returns the state untouched when the axis has nowhere else to go,
    // which also means the budget was not spent.
    if (next === state) return
    setPending(null)
    setState(next)
    animateTo(next, axis)
  }

  /** The SPIN button: the reel is already decided, this plays it out. */
  const onSpin = () => {
    if (!state || spinning) return
    animateTo(state)
  }

  const share = async () => {
    if (!state) return
    // Not window.location: inside an embedded viewer that is a frame URL only
    // this session can open. See shareOrigin().
    const url = shareOrigin()

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
  /** What the team reel is showing right now — mid-spin or settled. */
  const shownTeamId = teamDisplay ?? combo?.franchiseId
  const shownEraId = eraDisplay ?? combo?.eraId

  const franchise = useMemo(
    () => ruleset.franchises.find((f) => f.id === shownTeamId),
    [ruleset, shownTeamId],
  )
  /**
   * Label the reel with the years this franchise actually fielded players in
   * this era, not the era's full span. The Mariners did not exist until 1977,
   * so "Seattle Mariners, 1960s-70s" reads like a bug even though the bucket
   * is correct.
   */
  const eraLabel = useMemo(
    () => eraLabelFor(shownTeamId, ruleset.eras.find((e) => e.id === shownEraId)),
    [ruleset, shownTeamId, shownEraId],
  )

  /**
   * What is still available at each position. Recomputed only when a pick is
   * made, since it scans the whole pool.
   */
  const outlook = useMemo(() => {
    if (!state) return new Map<string, Outlook>()
    return positionOutlook(ruleset.slots, ruleset.players, new Set(state.picks.map((p) => p.playerId)))
  }, [ruleset, state?.picks])

  /**
   * Whether each reel has anywhere else to land. A re-spin that can only
   * return the combo you already have is disabled rather than sold.
   */
  const canRespin = useMemo(() => {
    if (!state || state.rerolls <= 0) return { team: false, era: false }
    return {
      team: rerollOptions(ruleset, state, 'team').length > 0,
      era: rerollOptions(ruleset, state, 'era').length > 0,
    }
  }, [ruleset, state])

  /** Slots the selected player could fill. Empty when nobody is selected. */
  const pendingSlots = useMemo(
    () => (pending && state ? slotsForPlayer(ruleset, state, pending) : []),
    [ruleset, state, pending],
  )

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
      .map((player) => {
        const rating = playerRating(player)
        // Best case across the slots he could actually take, and which slot it
        // was: "+29" is trivia, "+29 at SS" is an instruction.
        let edge = 0
        let edgeSlot: string | null = null
        for (const slot of slotsForPlayer(ruleset, state, player)) {
          const at = scarcityEdge(rating.score, outlook.get(slot.id))
          if (at > edge) {
            edge = at
            edgeSlot = slot.id
          }
        }
        return { player, rating, edge, edgeSlot }
      })
      .sort((a, b) => b.rating.score - a.rating.score || a.player.name.localeCompare(b.player.name))
  }, [ruleset, state, spinning, filter, query, outlook])

  /** The settings sheet, reachable from the start screen and from the draft. */
  const renderSettings = () => (
    <SettingsSheet
      sound={sound}
      haptics={haptics}
      hapticSupport={hapticSupport}
      palette={palette}
      onPalette={(next) => {
        setPalette(next)
        applyPalette(next)
        playPick()
      }}
      onSound={(on) => {
        setSound(on)
        setSoundEnabled(on)
        if (on) playPick()
      }}
      onHaptics={(on) => {
        setHaptics(on)
        setHapticsEnabled(on)
        if (on) vibrate(20)
      }}
      onClose={() => setMenuOpen(false)}
    />
  )

  if (!state) {
    return (
      <>
        <Start
          dayNumber={dailyNumber()}
          dailyRecord={dailyDone?.date === dailyKey() ? dailyDone.record : null}
          best={best}
          onPlay={() => start((Math.random() * 0xffffffff) >>> 0, 'free')}
          onDaily={() => start(dailySeed('baseball'), 'daily')}
          onMenu={() => setMenuOpen(true)}
        />
        {menuOpen && renderSettings()}
      </>
    )
  }

  if (result) {
    return (
      <SeasonReport
        ruleset={ruleset}
        result={result}
        mode={mode}
        dayNumber={dailyNumber()}
        seedLabel={seedCode(state.seed)}
        shareCode={encodeRun(state)}
        outcome={outcome}
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
      <Masthead
        mode={mode}
        dayNumber={dailyNumber()}
        pick={Math.min(filled + 1, total)}
        total={total}
        onMenu={() => setMenuOpen(true)}
      />

      {menuOpen && renderSettings()}

      {phase === 'spin' && (
      <div className="reels">
        {/* The club's colours arrive only once the reel stops. Applying them
            while it cycles would strobe saturated colour at roughly 20Hz,
            which is a photosensitivity hazard rather than a flourish — and
            landing on the colour makes it the payoff of the spin. */}
        <div
          className={`reel-card team${teamSettled ? ' landed' : ' rolling'}`}
          style={teamSettled ? teamStyle(franchise) : undefined}
        >
          <span className="reel-kicker">Team</span>
          <span className="reel-value" key={shownTeamId ?? 'none'}>
            {franchise ? franchiseNameFor(franchise, shownEraId) : '—'}
          </span>
        </div>
        <div className={`reel-card era${eraSettled ? ' landed' : ' rolling'}`}>
          <span className="reel-kicker">Era</span>
          <span className="reel-value" key={shownEraId ?? 'none'}>
            {eraLabel || '—'}
          </span>
        </div>
      </div>
      )}

      {phase === 'spin' ? (
        <>
          <button className="btn" onClick={onSpin} disabled={spinning}>
            {spinning ? 'Spinning…' : filled === 0 ? 'Spin' : 'Spin for the next pick'}
          </button>

          <div style={{ height: 12 }} />
          <Projection ruleset={ruleset} state={state} best={best} />
          {/* No slot is highlighted here: you may fill any open position, and
              marking the first one implies a turn order the game does not have. */}
          <Field ruleset={ruleset} state={state} />
          <div className="spacer" />
        </>
      ) : (
        <>
          <div className="pick-head">
            <span className="pill team" style={teamStyle(franchise)}>
              {franchise ? franchiseNameFor(franchise, shownEraId) : '—'}
            </span>
            <span className="pill era">{eraLabel}</span>
            {/* Two re-spins, one per reel, the way 82-0 splits them. Keeping a
                loaded franchise and turning only the decade is the move a
                single whole-combo re-spin never let you make. */}
            {mode === 'free' &&
              (state.rerolls > 0 ? (
                <span className="respins">
                  <button
                    className="respin"
                    onClick={() => onReroll('team')}
                    disabled={!canRespin.team}
                    title={
                      canRespin.team
                        ? 'Keep the decade, spin for another club'
                        : 'No other club in this decade can fill an open spot'
                    }
                  >
                    <Recycle /> Team
                  </button>
                  <button
                    className="respin"
                    onClick={() => onReroll('era')}
                    disabled={!canRespin.era}
                    title={
                      canRespin.era
                        ? 'Keep the club, spin for another decade'
                        : 'No other decade of this club can fill an open spot'
                    }
                  >
                    <Recycle /> Era
                  </button>
                </span>
              ) : (
                <span className="respin spent">No re-spins</span>
              ))}
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

          <Dock
            ruleset={ruleset}
            state={state}
            outlook={outlook}
            eligibleSlotIds={pendingSlots.map((slot) => slot.id)}
            onSlotTap={(slotId) => pending && choose(pending, slotId)}
          />

          <p className={`pick-prompt${pending ? ' placing' : ''}`}>
            {pending
              ? `Tap a position for ${pending.name}`
              : `${candidates.length} available · best first`}
            {pending && (
              <button className="cancel-pick" onClick={() => setPending(null)}>
                Cancel
              </button>
            )}
          </p>

          <div className={`candidates${candidates.some((c) => c.edge >= 12) ? ' two-line' : ''}`}>
            {candidates.map(({ player, rating, edge, edgeSlot }) => (
              <button
                key={player.id}
                className={`cand${pending?.id === player.id ? ' selected' : ''}`}
                onClick={() => choose(player)}
              >
                <span className="cand-pos" style={teamStyle(franchise)}>
                  {player.positions.join('/')}
                </span>
                <span className="cand-body">
                  <span className="cand-name">{player.name}</span>
                  {/* The only second line a card gets. The stats and the rating
                      say what the player is; this says what to do about him. */}
                  {edge >= 12 && edgeSlot && (
                    <span className="cand-label">
                      <em className="edge">
                        +{Math.round(edge)} at {edgeSlot}
                      </em>
                    </span>
                  )}
                </span>
                <StatColumns player={player} />
                <span className="cand-right">
                  <span className={`cand-rating num ${ratingTier(rating.score)}`}>
                    {rating.score}
                  </span>
                  <span className="cand-cost num">${playerCost(player)}M</span>
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
 * Settings and a short how-to.
 *
 * The sound toggle is not optional politeness: a game that makes noise with no
 * way to stop it gets closed. Haptics are separate because Android honours them
 * and iOS Safari ignores them entirely, so a player may want one without the
 * other.
 */
function SettingsSheet({
  sound,
  haptics,
  hapticSupport,
  palette,
  onPalette,
  onSound,
  onHaptics,
  onClose,
}: {
  sound: boolean
  haptics: boolean
  hapticSupport: HapticsSupport
  palette: Palette
  onPalette: (next: Palette) => void
  onSound: (on: boolean) => void
  onHaptics: (on: boolean) => void
  onClose: () => void
}) {
  // Say why the switch is dead rather than leaving it on and inert. "Haptics
  // stopped working" is almost always one of these two, and neither is
  // something the page can fix from inside.
  const hapticNote =
    hapticSupport === 'unsupported'
      ? 'This browser has no vibration support — iPhone and iPad never shipped it.'
      : hapticSupport === 'embedded'
        ? 'Blocked because the game is embedded in another page. Open it in its own tab and it works.'
        : null
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>162-0</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <h3 className="section-head">How to play</h3>
        <ol className="howto">
          <li>Spin for a franchise and an era.</li>
          <li>Draft one player from that team into an open position.</li>
          <li>Fill all thirteen spots, then play the 162-game season.</li>
        </ol>
        <p className="factor-detail" style={{ marginBottom: 16 }}>
          The number on each card is runs above an average player over a season —
          50 is average, 99 is Babe Ruth. Stats are adjusted for the era they
          were put up in, so a 1913 ERA is not treated like a modern one.
        </p>
        <p className="factor-detail" style={{ marginBottom: 16 }}>
          The faded number on an empty position is what is <em>typically</em>{' '}
          still available there. Shortstops run about 42 and first basemen 59, so
          a decent shortstop is worth taking the moment one appears — waiting
          rarely pays. When a player is well clear of his position&rsquo;s going
          rate, his card says so and names the spot.
        </p>
        <p className="factor-detail" style={{ marginBottom: 16 }}>
          DH and closer never carry that flag: any hitter can DH and any arm can
          close, so those are the slots you fill with whoever is left over, not
          ones to spend a good player on.
        </p>
        <p className="factor-detail" style={{ marginBottom: 16 }}>
          You get <em>one</em> re-spin a run, and you choose which reel it turns.
          A loaded club in the wrong decade only needs the decade turned — keep
          the club and spin the era, and the other half stays exactly as it is.
        </p>

        <p className="factor-detail sheet-credit">
          Player data from the Lahman Baseball Database and the Chadwick Baseball
          Databank, licensed CC BY-SA 3.0. Not affiliated with Major League
          Baseball or any club.
        </p>

        <label className="toggle-row">
          <span>Sounds</span>
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => onSound(e.target.checked)}
          />
          <span className="toggle" aria-hidden="true" />
        </label>

        <h3 className="section-head">Colours</h3>
        <div className="palettes">
          {PALETTES.map((option) => (
            <button
              key={option.id}
              className={`palette${palette === option.id ? ' on' : ''}`}
              onClick={() => onPalette(option.id)}
              aria-pressed={palette === option.id}
            >
              <span className="palette-swatch" aria-hidden="true">
                {option.swatch.map((colour) => (
                  <i key={colour} style={{ background: colour }} />
                ))}
              </span>
              <span className="palette-text">
                <b>{option.name}</b>
                <small>{option.note}</small>
              </span>
            </button>
          ))}
        </div>

        <label className={`toggle-row${hapticNote ? ' disabled' : ''}`}>
          <span>
            Haptics
            {hapticNote && <em className="toggle-note">{hapticNote}</em>}
          </span>
          <input
            type="checkbox"
            checked={haptics && !hapticNote}
            disabled={!!hapticNote}
            onChange={(e) => onHaptics(e.target.checked)}
          />
          <span className="toggle" aria-hidden="true" />
        </label>

        {!hapticNote && (
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            onClick={() => vibrate([40, 60, 120])}
          >
            Test haptics
          </button>
        )}
      </div>
    </div>
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
  outlook,
  eligibleSlotIds,
  onSlotTap,
}: {
  ruleset: Ruleset
  state: DraftState
  /** Typical rating still available at each position. */
  outlook: Map<string, Outlook>
  /** Slots the player being placed can take. Empty when nobody is selected. */
  eligibleSlotIds: string[]
  onSlotTap: (slotId: string) => void
}) {
  const placing = eligibleSlotIds.length > 0
  return (
    <div className={`dock${placing ? ' placing' : ''}`}>
      {ruleset.slots.map((slot) => {
        const pick = state.picks.find((p) => p.slotId === slot.id)
        const player = pick && ruleset.players.find((p) => p.id === pick.playerId)
        const rating = player ? playerRating(player) : null
        const eligible = eligibleSlotIds.includes(slot.id)
        const franchise = player && ruleset.franchises.find((f) => f.id === player.franchiseId)
        return (
          <button
            key={slot.id}
            type="button"
            className={`dock-slot${player ? ' filled' : ''}${eligible ? ' open' : ''}`}
            style={player ? teamStyle(franchise) : undefined}
            title={player ? `${slot.label}: ${player.name}` : slot.label}
            disabled={!eligible}
            onClick={() => onSlotTap(slot.id)}
          >
            <span className="dock-pos">{slot.id}</span>
            {/* Filled slots show what you got; open ones show what the position
                is typically worth, so a thin position is visible before you
                spend a pick discovering it. */}
            <span className={`dock-rating num${rating ? '' : ' expected'}`}>
              {rating ? rating.score : expectedAt(outlook.get(slot.id))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The re-spin glyph: a loop with an arrowhead, drawn so it scales with type. */
function Recycle() {
  return (
    <svg viewBox="0 0 16 16" className="respin-glyph" aria-hidden="true">
      <path
        d="M3 8a5 5 0 0 1 8.5-3.5M13 8a5 5 0 0 1-8.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M11.5 1.8v2.9H8.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 14.2v-2.9h2.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A position with nothing left in it shows a dash, not a zero. */
function expectedAt(outlook: Outlook | undefined): string | number {
  return outlook && outlook.count > 0 ? outlook.typical : '\u2014'
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
function Projection({
  ruleset,
  state,
  best,
}: {
  ruleset: Ruleset
  state: DraftState
  best: BestRun | null
}) {
  const projected = useMemo(() => {
    const roster = state.picks.flatMap((p) => {
      const player = ruleset.players.find((x) => x.id === p.playerId)
      const slot = ruleset.slots.find((x) => x.id === p.slotId)
      return player && slot ? [{ player, slot }] : []
    })
    return projectPartial(roster)
  }, [ruleset, state.picks])

  const payroll = useMemo(() => {
    const roster = state.picks.flatMap((p) => {
      const player = ruleset.players.find((x) => x.id === p.playerId)
      const slot = ruleset.slots.find((x) => x.id === p.slotId)
      return player && slot ? [{ player, slot }] : []
    })
    return payrollOf(roster)
  }, [ruleset, state.picks])

  const record = ruleset.benchmark.wins
  const scale = (wins: number) => Math.max(0, Math.min(100, ((wins - 50) / 112) * 100))
  const over = payroll > PAYROLL_CAP
  // The bar fills to the threshold; past it, it just reads as over.
  const payrollPct = Math.min(100, (payroll / PAYROLL_CAP) * 100)

  return (
    <div className="meters">
      <div className="projection">
        <span className="projection-label">Projected</span>
        <span className="projection-bar">
          <span style={{ width: `${scale(projected.wins)}%` }} />
          <i style={{ left: `${scale(record)}%` }} title={`Record: ${record} wins`} />
          {/* Your own bar, drawn next to the all-time one. 116 is scenery; the
              number you actually beat last time is the one you play against. */}
          {best && (
            <i
              className="mine"
              style={{ left: `${scale(best.wins)}%` }}
              title={`Your best: ${best.record}`}
            />
          )}
        </span>
        <span className="projection-value num">
          {projected.wins}-{ruleset.seasonGames - projected.wins}
        </span>
      </div>

      <div className="projection">
        <span className="projection-label">Payroll</span>
        <span className="projection-bar">
          <span className={over ? 'over' : ''} style={{ width: `${payrollPct}%` }} />
        </span>
        <span className={`projection-value num${over ? ' over' : ''}`}>
          ${Math.round(payroll)}M
        </span>
      </div>

      {over && (
        <p className="payroll-note">
          ${Math.round(payroll - PAYROLL_CAP)}M over the ${PAYROLL_CAP}M threshold — your bench
          and the back of the staff pay for it.
        </p>
      )}

      {/* Two ticks on one bar need naming, or they are decoration. Shown only
          once there is a personal best, so a first-time player is not handed a
          legend for a mark that is not on the board yet. */}
      {best && (
        <p className="meter-legend">
          <b>{best.wins}</b> your best
          <i />
          <span>{record} the record</span>
        </p>
      )}
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
