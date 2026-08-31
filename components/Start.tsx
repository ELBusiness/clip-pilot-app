'use client'

import { PlateMark } from '@/components/Masthead'
import type { BestRun } from '@/lib/best'

/**
 * The opening screen.
 *
 * The game used to drop you straight into a draft, which is fine for the
 * second visit and useless for the first: nothing said what 162-0 meant, that
 * the spin decides which club you draft from, or that there is a daily. A
 * shared link still skips this and goes straight to the draft it names —
 * someone arriving from a friend's record already knows why they are here.
 */
export default function Start({
  dayNumber,
  dailyRecord,
  best,
  onPlay,
  onDaily,
  onMenu,
}: {
  dayNumber: number
  /** Today's daily result if it has already been played, else null. */
  dailyRecord: string | null
  best: BestRun | null
  onPlay: () => void
  onDaily: () => void
  onMenu: () => void
}) {
  return (
    <main className="shell start">
      <div className="start-head">
        <PlateMark size={38} />
        <button className="icon-btn" onClick={onMenu} aria-label="Settings">
          <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <h1 className="start-title">
        162<em>–0</em>
      </h1>
      <p className="start-sub">
        Draft a team that never loses a game. Spin for a franchise and a decade,
        take one player from whatever it lands on, and fill all thirteen spots.
      </p>

      <div className="start-actions">
        <button className="btn" onClick={onPlay}>
          Play
        </button>
        <button className="btn ghost" onClick={onDaily} disabled={dailyRecord !== null}>
          {dailyRecord ? `Daily #${dayNumber} · ${dailyRecord}` : `Daily #${dayNumber}`}
        </button>
      </div>

      {best && (
        <p className="start-best">
          Your best season: <b className="num">{best.record}</b>
          {best.seasons > 1 ? ` · ${best.seasons} drafted` : ''}
        </p>
      )}

      <div className="start-how">
        <Step n="1" head="Spin">
          A franchise and a decade. You draft only from the players that club
          actually had, in those years.
        </Step>
        <Step n="2" head="Pick">
          One player per spin, into a position that is still open. Thirteen
          spins fill a roster.
        </Step>
        <Step n="3" head="Play it out">
          All 162 games are simulated from what you built. The best real season
          on record is 116 wins.
        </Step>
      </div>

      <div className="spacer" />

      <p className="start-credit">
        Built on the{' '}
        <a href="https://sabr.org/lahman-database/" target="_blank" rel="noreferrer">
          Lahman Baseball Database
        </a>{' '}
        and the Chadwick Baseball Databank, licensed{' '}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">
          CC BY-SA 3.0
        </a>
        . Not affiliated with Major League Baseball or any club.
      </p>
    </main>
  )
}

function Step({ n, head, children }: { n: string; head: string; children: React.ReactNode }) {
  return (
    <div className="step">
      <span className="step-n num">{n}</span>
      <span className="step-body">
        <b>{head}</b>
        <span>{children}</span>
      </span>
    </div>
  )
}
