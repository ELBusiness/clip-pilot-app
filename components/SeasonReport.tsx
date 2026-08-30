'use client'

import { useEffect, useState } from 'react'
import type { RunResult } from '@/engine/run'
import type { Ruleset } from '@/engine/types'
import { franchiseShortFor } from '@/sports/baseball/players'
import { setAtLabel, type BestOutcome } from '@/lib/best'

/**
 * The result screen carries the whole share loop, so it has to answer three
 * questions fast: what happened, why it happened, and whether that was any
 * good. The record answers the first, the factor bars the second, and the
 * comparison against the real record the third — grading a run against the
 * 2001 Mariners means more than grading it against an unreachable 162-0.
 */
export default function SeasonReport({
  ruleset,
  result,
  mode,
  dayNumber,
  seedLabel,
  shareCode,
  outcome,
  onShare,
  onReplay,
  toast,
}: {
  ruleset: Ruleset
  result: RunResult
  mode: 'free' | 'daily'
  dayNumber: number
  seedLabel: string
  shareCode: string
  /** Where this run landed against your own record. Null in the daily. */
  outcome: BestOutcome | null
  onShare: () => void
  onReplay: () => void
  toast: string | null
}) {
  const { season, rating, roster } = result
  const beatsRecord = season.wins > ruleset.benchmark.wins
  const shortfall = ruleset.seasonGames - season.wins

  const wins = useCountUp(season.wins)

  const verdict = season.perfect
    ? `Perfect. ${ruleset.seasonGames} games, not one loss. ${ruleset.benchmark.note}`
    : beatsRecord
      ? `That beats the ${ruleset.benchmark.holder} — the best real season on record at ${ruleset.benchmark.wins} wins.`
      : `${shortfall} ${shortfall === 1 ? 'game' : 'games'} short of perfect. The record is ${ruleset.benchmark.wins}, by the ${ruleset.benchmark.holder}.`

  return (
    <main className="shell">
      <div className="topbar">
        <span className="stencil">
          {mode === 'daily' ? `Daily #${dayNumber}` : 'Final'}
        </span>
        <span className="stencil">
          {mode === 'daily' ? 'Same draft for everyone' : `Seed ${seedLabel}`}
        </span>
      </div>

      <div className={`result-record num${season.perfect ? ' perfect' : ''}`}>
        {wins}
        <span style={{ color: 'var(--chalk-faint)' }}>
          –{season.losses}
          {ruleset.drawsPossible ? `–${season.draws}` : ''}
        </span>
      </div>
      <p className="verdict">{verdict}</p>

      {outcome && <PersonalBest outcome={outcome} wins={season.wins} />}

      <div className="stat-strip">
        <div className="stat-cell">
          <b className="num">{season.scored.toLocaleString()}</b>
          <small>Scored</small>
        </div>
        <div className="stat-cell">
          <b className="num">{season.allowed.toLocaleString()}</b>
          <small>Allowed</small>
        </div>
        <div className="stat-cell">
          <b className="num">{season.longestStreak}</b>
          <small>Best run</small>
        </div>
      </div>

      <h2 className="section-head">Why — projected before the season</h2>
      <div className="factors">
        {rating.factors.map((factor) => (
          <div key={factor.label} className="factor">
            <span className="factor-label">{factor.label}</span>
            <span className="factor-value num">{factor.value}</span>
            <span className="factor-detail">{factor.detail}</span>
            <span className="bar">
              <span
                style={{
                  left: factor.z >= 0 ? '50%' : `${50 + factor.z * 50}%`,
                  width: `${Math.abs(factor.z) * 50}%`,
                  background: factor.z >= 0 ? 'var(--safe)' : 'var(--out)',
                }}
              />
            </span>
          </div>
        ))}
      </div>

      <h2 className="section-head">
        Luck ·{' '}
        {season.luck >= 0
          ? `${season.luck.toFixed(1)} wins above expected`
          : `${Math.abs(season.luck).toFixed(1)} below expected`}
      </h2>
      <p className="factor-detail" style={{ marginBottom: 14 }}>
        Scoring {season.scored.toLocaleString()} and allowing {season.allowed.toLocaleString()} is
        worth about {season.expectedWins.toFixed(1)} wins. You got {season.wins}.
      </p>

      <h2 className="section-head">Every game</h2>
      <div className="season-strip">
        {season.games.map((game, i) => (
          <i
            key={i}
            className={game.outcome === 'W' ? '' : game.outcome === 'L' ? 'l' : 'd'}
            title={`Game ${i + 1}: ${game.scored}-${game.allowed}`}
          />
        ))}
      </div>

      <h2 className="section-head">Your roster</h2>
      <div className="board roomy">
        {roster.map(({ player, slot }) => {
          const franchise = ruleset.franchises.find((f) => f.id === player.franchiseId)
          return (
            <div key={slot.id} className="board-slot">
              <div className="board-pos">{slot.id}</div>
              <div className="board-name">{player.name}</div>
              <div className="board-team">
                {franchiseShortFor(franchise, player.eraId)} · {player.year}
              </div>
            </div>
          )
        })}
      </div>

      <div className="spacer" />

      <button className="btn" onClick={onShare}>
        {mode === 'daily' ? `Share Daily #${dayNumber}` : 'Share this run'}
      </button>
      <div className="btn-row">
        <button className="btn ghost" onClick={onReplay}>
          New draft
        </button>
      </div>

      {mode === 'daily' && (
        <p className="factor-detail" style={{ marginTop: 10 }}>
          Everyone gets the same spins today. The share card shows your record and
          nothing else — let them build their own answer.
        </p>
      )}

      {mode === 'free' && (
        <p className="factor-detail" style={{ marginTop: 12, wordBreak: 'break-all' }}>
          Run code: {shareCode}
        </p>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

/**
 * Where this season landed against your own. A single-run game gives you no
 * reason to open it twice; a number of your own does — and the honest version
 * of that is showing the miss as well as the beat, with the gap named, so the
 * next draft has a target instead of a vague sense of "better".
 */
function PersonalBest({ outcome, wins }: { outcome: BestOutcome; wins: number }) {
  const { previous, isBest, seasons } = outcome

  if (!previous) {
    return (
      <div className="pb first">
        <b>First season on the board</b>
        <span>{wins} wins is the mark to beat. Draft again and take a run at it.</span>
      </div>
    )
  }

  if (isBest) {
    const gain = wins - previous.wins
    return (
      <div className="pb beat">
        <b>New personal best</b>
        <span>
          {gain} {gain === 1 ? 'win' : 'wins'} better than your {previous.record}, set{' '}
          {setAtLabel(previous.setAt)}. Season {seasons}.
        </span>
      </div>
    )
  }

  const gap = previous.wins - wins
  return (
    <div className="pb miss">
      <b>Your best stands at {previous.record}</b>
      <span>
        {gap === 0
          ? `Level with it, but no better. Season ${seasons}.`
          : `${gap} ${gap === 1 ? 'win' : 'wins'} short of it. Season ${seasons}.`}
      </span>
    </div>
  )
}

/** Count the win total up on reveal — the number is the payoff, so land on it. */
function useCountUp(target: number, ms = 700): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || target === 0) {
      setValue(target)
      return
    }
    let raf = 0
    const started = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / ms)
      // Ease out so it decelerates onto the final number.
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])

  return value
}
