'use client'

/**
 * A reel that actually travels.
 *
 * The old one swapped a single line of text on a timer — eighteen React state
 * updates per spin, each re-rendering the whole screen and restarting a CSS
 * animation. Measured on a throttled phone-class CPU, that dropped a frame
 * every other tick through the fast part of the spin, which is what "not
 * smooth" was.
 *
 * This is the shape a slot machine actually has: a fixed window with the
 * symbols stacked behind it, moved by one `transform` on the compositor.
 * Three things keep it there:
 *
 *   - It is a CSS *animation*, not a transition. A transition needs a starting
 *     point the browser has already accepted, which costs a forced reflow per
 *     reel at the exact moment the spin begins.
 *   - The symbols it passes are fixed for the run, so a spin changes one line
 *     of text rather than re-mounting forty of them. Mounting the whole strip
 *     each spin measured about 35ms of the frame that starts it.
 *   - Replaying is a swap between two identical keyframes. Nothing remounts,
 *     nothing is measured, and no effect runs — changing `animation-name` is
 *     enough to start the animation over.
 *
 * The travel is a percentage of the strip rather than pixels, so nothing has
 * to read the DOM and the window can change height without the maths
 * following it around.
 */
export default function Reel({
  passing,
  landing,
  durationMs,
  cycle,
  spinning,
  className,
}: {
  /** The symbols that blur past. Fixed for the run, so they never remount. */
  passing: string[]
  /** What this spin stops on. The only thing that changes between spins. */
  landing: string
  durationMs: number
  /** Increments per spin; flipping between two keyframes replays the travel. */
  cycle: number
  /** False for a reel being held, which stays on its symbol without moving. */
  spinning: boolean
  className?: string
}) {
  const total = passing.length + 1
  // The strip is always mounted and always parked on its landing symbol; the
  // only thing a spin changes is whether the animation is running. Mounting it
  // per spin was about 35ms of the frame that starts one.
  return (
    <span className={`reel-window${className ? ` ${className}` : ''}`}>
      <span
        className={`reel-strip${spinning ? ' spinning' : ''}`}
        style={
          {
            // easeOutCubic, matching the curve the tick sounds are scheduled
            // from, so what you hear is what passes the window.
            '--reel-ms': `${durationMs}ms`,
            '--reel-end': `calc(-100% * ${total - 1} / ${total})`,
            animationName: cycle % 2 === 0 ? 'reel-spin-a' : 'reel-spin-b',
          } as React.CSSProperties
        }
      >
        {passing.map((item, i) => (
          // Keyed by position, not by text: the strip is meant to be reused.
          <span className="reel-item" key={i}>
            {item}
          </span>
        ))}
        <span className="reel-item">{landing}</span>
      </span>
    </span>
  )
}
