/**
 * Slot-machine audio, synthesized.
 *
 * The game ships as a single self-contained file and its host blocks external
 * media, so there are no sound files to load. Every click and thunk here is
 * generated with the Web Audio API — a few oscillators and an envelope — which
 * costs a few hundred bytes instead of a few hundred kilobytes and never waits
 * on a network.
 *
 * Audio stays silent until the player's first tap, because browsers refuse to
 * start an AudioContext without a gesture and because a page that makes noise
 * unprompted is a page people close.
 */

const SOUND_KEY = 'perfect-season:sound'
const HAPTICS_KEY = 'perfect-season:haptics'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function read(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  } catch {
    // Private windows can throw on access, not merely return null.
    return fallback
  }
}

function write(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // A viewer who blocks site data just loses the preference between visits.
  }
}

export function soundEnabled(): boolean {
  return read(SOUND_KEY, true)
}

export function hapticsEnabled(): boolean {
  return read(HAPTICS_KEY, true)
}

export function setSoundEnabled(on: boolean): void {
  write(SOUND_KEY, on)
  if (!on && ctx) void ctx.suspend()
  if (on) void resume()
}

export function setHapticsEnabled(on: boolean): void {
  write(HAPTICS_KEY, on)
}

/** Must be called from inside a user gesture before anything will sound. */
export async function resume(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') await ctx.resume()
  } catch {
    // Audio is a nicety; a device that refuses it still plays the game.
  }
}

function envelope(
  type: OscillatorType,
  fromHz: number,
  toHz: number,
  peak: number,
  seconds: number,
): void {
  if (!ctx || !master || !soundEnabled()) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(fromHz, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), now + seconds)

    // Ramped rather than cut: a square wave stopped at full amplitude clicks.
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + seconds + 0.02)
  } catch {
    // Ignore: audio failure must never interrupt a draft.
  }
}

/** One reel symbol passing the window. Short, bright, mechanical. */
export function playTick(): void {
  envelope('square', 1400, 520, 0.075, 0.045)
}

/** A reel coming to rest: lower, heavier, with some body under it. */
export function playLand(): void {
  envelope('triangle', 320, 90, 0.22, 0.24)
  envelope('square', 900, 240, 0.05, 0.08)
}

/** Confirmation that a pick was committed. */
export function playPick(): void {
  envelope('triangle', 660, 990, 0.11, 0.09)
}

/** The season result: three rising notes, because it is the payoff. */
export function playReveal(): void {
  if (!ctx || !soundEnabled()) return
  envelope('triangle', 520, 520, 0.12, 0.16)
  window.setTimeout(() => envelope('triangle', 660, 660, 0.12, 0.16), 130)
  window.setTimeout(() => envelope('triangle', 880, 880, 0.14, 0.34), 260)
}

/**
 * Why haptics may not fire, so the interface can say so instead of offering a
 * switch that does nothing.
 *
 * The Vibration API gives no usable feedback: `navigator.vibrate()` returns
 * true on a laptop with no vibration motor, and Chrome reports `vibrate` as an
 * unrecognized permissions-policy feature, so neither the return value nor
 * `featurePolicy.allowsFeature` can be trusted. The only reliable signals are
 * whether the function exists at all and whether the page is embedded.
 */
export type HapticsSupport = 'ok' | 'unsupported' | 'embedded'

export function hapticsSupport(): HapticsSupport {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    // Safari on iOS and iPadOS has never shipped the Vibration API.
    return 'unsupported'
  }
  try {
    // Chrome drops vibration in cross-origin frames without a word in the
    // console, which is the usual reason haptics "stop working" on a page that
    // is embedded rather than opened directly.
    if (window.self !== window.top) return 'embedded'
  } catch {
    // Reading window.top across origins throws, which is itself the answer.
    return 'embedded'
  }
  return 'ok'
}

/**
 * A short buzz. Android honours this at the top level; iOS Safari has no
 * Vibration API at all, and Chrome silently discards it inside a cross-origin
 * frame — hence the support check, and hence sound carrying the feedback rather
 * than haptics standing in for it.
 */
export function vibrate(pattern: number | number[]): void {
  if (!hapticsEnabled() || hapticsSupport() !== 'ok') return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Nothing to do; the game does not depend on it.
  }
}
