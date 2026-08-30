/**
 * Personal best.
 *
 * A single-run game has no reason to be opened twice. A record of your own
 * fixes that: the draft stops being a slot machine you pull once and becomes a
 * number you are trying to beat, and the target is one you set yourself rather
 * than the unreachable 116.
 *
 * Only free-play runs count. The daily is one draft for everybody and already
 * has its own memory; letting it set the personal best would mean a good daily
 * raises a bar you cannot then attack, because the daily is spent.
 *
 * Stored locally and nowhere else — there is no account, and this is the whole
 * of the game's memory.
 */

const KEY = 'perfect-season:best'

export interface BestRun {
  wins: number
  losses: number
  /** Record string as shown, e.g. '108-54'. */
  record: string
  scored: number
  allowed: number
  /** ISO date the run was finished, for the 'set on' line. */
  setAt: string
  /** How many free-play seasons have been finished, this one included. */
  seasons: number
}

/** localStorage throws outright in some private windows; never break the game. */
function read(): BestRun | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as BestRun
    return typeof value?.wins === 'number' ? value : null
  } catch {
    return null
  }
}

export function loadBest(): BestRun | null {
  if (typeof window === 'undefined') return null
  return read()
}

export interface BestOutcome {
  /** The record standing before this run, or null on a first season. */
  previous: BestRun | null
  /** True when this run is the new best. */
  isBest: boolean
  /** Season number of the run just finished. */
  seasons: number
}

/**
 * Record a finished free-play run and report where it landed. Returns the bar
 * that was standing *before* it, so the result screen can say what was beaten.
 */
export function recordRun(run: Omit<BestRun, 'setAt' | 'seasons'>): BestOutcome {
  if (typeof window === 'undefined') {
    return { previous: null, isBest: true, seasons: 1 }
  }
  const previous = read()
  const seasons = (previous?.seasons ?? 0) + 1
  const isBest = !previous || run.wins > previous.wins

  const next: BestRun = isBest
    ? { ...run, setAt: new Date().toISOString().slice(0, 10), seasons }
    : { ...previous, seasons }

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // A viewer who blocks site data simply has no memory between runs.
  }

  return { previous, isBest, seasons }
}

/** Written out as '12 August' rather than a slash date, which reads as noise. */
export function setAtLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}
