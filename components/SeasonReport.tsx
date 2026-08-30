'use client'

import { useEffect, useState } from 'react'
import type { RunResult } from '@/engine/run'
import type { Ruleset } from '@/engine/types'

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
  seedLabel,
  shareCode,
  onShare,
  onReplay,
  toast,
}: {
  ruleset: Ruleset
  result: RunResult
  seedLabel: string
  shareCode: string
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
        <span className="round-pill">162-0 · MLB</span>
        <span className="round-pill">Seed {seedLabel}</span>
      </div>

      <div className={`result-record num${season.perfect ? ' perfect' : ''}`}>
        {wins}
        <span style={{ color: 'var(--text-faint)' }}>
          –{season.losses}
          {ruleset.drawsPossible ? `–${season.draws}` : ''}
        </span>
      </div>
      <p className="verdict">{verdict}</p>

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
                  background: factor.z >= 0 ? 'var(--good)' : 'var(--bad)',
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
                {franchise?.short} · {player.year}
              </div>
            </div>
          )
        })}
      </div>

      <div className="spacer" />

      <button className="btn" onClick={onShare}>
        Share this run
      </button>
      <div className="btn-row">
        <button className="btn ghost" onClick={onReplay}>
          New draft
        </button>
      </div>

      <p className="factor-detail" style={{ marginTop: 12, wordBreak: 'break-all' }}>
        Run code: {shareCode}
      </p>

      {toast && <div className="toast">{toast}</div>}
    </main>
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
