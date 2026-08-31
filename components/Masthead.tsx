'use client'

/**
 * The header.
 *
 * A mark, the game's name, and where you are in the draft. It sits on the page
 * with nothing under it — the rule that used to separate it from the board was
 * one more line doing work that whitespace already does.
 */
export default function Masthead({
  mode,
  dayNumber,
  pick,
  total,
  onMenu,
}: {
  mode: 'free' | 'daily'
  dayNumber: number
  pick: number
  total: number
  onMenu: () => void
}) {
  return (
    <header className="masthead">
      <PlateMark />
      <span className="wordmark">
        162<em>–0</em>
      </span>

      <span className="masthead-meta">
        <span className="stencil">{mode === 'daily' ? `Daily #${dayNumber}` : 'Pick'}</span>
        <b className="num">
          {pick} / {total}
        </b>
      </span>

      <button className="icon-btn" onClick={onMenu} aria-label="Settings and how to play">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
    </header>
  )
}

/**
 * The mark: a home plate with an infield diamond inside it, drawn rather than
 * imaged so it stays crisp at any density and costs nothing to ship. Exported
 * because the opening screen shows the same mark, and two copies of a logo is
 * how a logo ends up with two slightly different shapes.
 */
export function PlateMark({ size = 34 }: { size?: number }) {
  return (
    <svg className="mark" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {/* Home plate, the one shape in baseball nothing else shares. */}
      <path
        d="M6 4 h28 v20 l-14 12 -14 -12 z"
        fill="none"
        stroke="var(--bulb)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M20 11 l7 7 -7 7 -7 -7 z"
        fill="var(--bulb)"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  )
}
