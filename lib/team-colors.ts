/**
 * Team colours.
 *
 * A roster of thirteen players drawn from thirteen different franchises is
 * hard to read as a list of names. Painting each one in its club's colours
 * turns the board into something you can take in at a glance — and it is the
 * detail that makes a baseball game feel like baseball rather than a database
 * with a scoreboard font.
 *
 * The colours are the real ones and they were already in the roster pack; what
 * was missing is that a club's own pairing is not always legible. Half the
 * league pairs two dark colours (Seattle's navy and teal, Toronto's two blues),
 * and a badge in one on the other is unreadable. So the pairing is checked, and
 * a club whose own colours fail gets a legible substitute rather than a
 * technically-correct blur.
 */

import type { Franchise } from '@/engine/types'

export interface TeamChip {
  /** Club primary — the ground of the badge. */
  bg: string
  /** Legible ink on that ground: the club's secondary where it reads. */
  fg: string
  /** True when the club's own second colour was legible on its first. */
  authentic: boolean
}

function channel(hex: string, at: number): number {
  return parseInt(hex.slice(at, at + 2), 16) / 255
}

/** Scale every channel toward black or white, which moves lightness and keeps hue. */
function shade(hex: string, factor: number): string {
  const clean = hex.replace('#', '')
  const out = [0, 2, 4].map((at) => {
    const v = channel(clean, at)
    const next = factor < 1 ? v * factor : v + (1 - v) * (factor - 1)
    return Math.round(Math.max(0, Math.min(1, next)) * 255)
      .toString(16)
      .padStart(2, '0')
  })
  return `#${out.join('')}`
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const clean = hex.replace('#', '')
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return (
    0.2126 * lin(channel(clean, 0)) +
    0.7152 * lin(channel(clean, 2)) +
    0.0722 * lin(channel(clean, 4))
  )
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/**
 * Badge text is small and bold, so AA for normal text is the bar rather than
 * the 3:1 large-text allowance — these are two-letter position codes read at a
 * glance, not headings someone will squint at.
 */
const MIN_CONTRAST = 4.5

/** Neutral inks to fall back to, brightest first. */
const CREAM = '#f5f1e6'
const CHARCOAL = '#14110c'

const cache = new Map<string, TeamChip>()

export function teamChip(franchise: Franchise | undefined): TeamChip | null {
  if (!franchise) return null
  const hit = cache.get(franchise.id)
  if (hit) return hit

  const [primary, secondary] = franchise.colors
  const authentic = contrast(secondary, primary) >= MIN_CONTRAST
  // Where the club's own pairing fails, take whichever neutral reads better on
  // the primary. The primary is always kept — that is the colour people know
  // the club by, and it is the one doing the identifying.
  const fg = authentic
    ? secondary
    : contrast(CREAM, primary) >= contrast(CHARCOAL, primary)
      ? CREAM
      : CHARCOAL

  // A few primaries sit at exactly the lightness where neither neutral reads —
  // Phillies red is the clear case, at 4.1 against charcoal and less against
  // cream. Rather than ship a badge nobody can read, the ground is moved a
  // step at a time until the ink clears. Scaling the channels holds the hue, so
  // it is still plainly Phillies red, just far enough along to be legible.
  let bg = primary
  for (let step = 0; step < 12 && contrast(fg, bg) < MIN_CONTRAST; step += 1) {
    bg = shade(bg, fg === CREAM ? 0.92 : 1.08)
  }

  const chip: TeamChip = { bg, fg, authentic }
  cache.set(franchise.id, chip)
  return chip
}

/**
 * The custom properties a coloured element reads. Returned as a style object so
 * the colours ride on the element itself and the stylesheet keeps every rule
 * about shape, size and state.
 */
export function teamStyle(franchise: Franchise | undefined): Record<string, string> {
  const chip = teamChip(franchise)
  if (!chip) return {}
  return { '--team-bg': chip.bg, '--team-fg': chip.fg }
}
