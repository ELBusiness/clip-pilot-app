/**
 * Baseball's run environment, by decade.
 *
 * Its own module because two things need it and neither should own it: the
 * rating model, which rebases every player's line, and the boss roster, which
 * rebases whole team-seasons. Having the boss list reach back into the ruleset
 * for it made an import cycle that surfaced only at runtime, as "cannot access
 * REF_ERA before initialization".
 */

/**
 * The reference run environment every stat is normalized into — roughly the
 * 2010s, so the numbers on screen read the way a modern fan expects.
 */
export const REF = { avg: 0.25, obp: 0.32, slg: 0.405, era: 4.05, hrRate: 0.03 }

/**
 * Regression toward the mean, applied to every drafted line.
 *
 * A player's numbers with one franchise in one decade are what he did *in that
 * context* — that park, that lineup around him, that pitching staff behind him.
 * Projecting him onto a different team means regressing toward league average,
 * which is what every serious projection system does (Marcel, ZiPS, Steamer all
 * regress, and heavily). Skipping it treats every line as pure repeatable
 * talent and quietly assumes thirteen players all sustain their best context at
 * once.
 *
 * It bites hardest at the extremes, which is exactly where this game needed it:
 * a .400 on-base hitter projects to .386, a 2.20 ERA projects to 2.53.
 */
const REGRESSION = 0.18

export function regress(value: number, mean: number): number {
  return value * (1 - REGRESSION) + mean * REGRESSION
}

export interface LeagueEnv {
  avg: number
  obp: number
  slg: number
  era: number
  /** League home runs per at-bat. Swings by a factor of ten across eras. */
  hrRate: number
}

/**
 * League averages by decade. Baseball's run environment swings enormously —
 * the deadball era, the 1930s, the 1968 pitching peak, the steroid era — and
 * ignoring that is the difference between a fair comparison and a fantasy.
 */
export function leagueEnv(year: number): LeagueEnv {
  if (year <= 1919) return { avg: 0.255, obp: 0.32, slg: 0.335, era: 2.75, hrRate: 0.004 }
  if (year <= 1929) return { avg: 0.285, obp: 0.348, slg: 0.397, era: 4.0, hrRate: 0.012 }
  if (year <= 1939) return { avg: 0.28, obp: 0.345, slg: 0.4, era: 4.3, hrRate: 0.017 }
  if (year <= 1949) return { avg: 0.265, obp: 0.335, slg: 0.37, era: 3.65, hrRate: 0.016 }
  if (year <= 1959) return { avg: 0.263, obp: 0.335, slg: 0.395, era: 3.95, hrRate: 0.024 }
  if (year <= 1969) return { avg: 0.25, obp: 0.32, slg: 0.375, era: 3.55, hrRate: 0.023 }
  if (year <= 1979) return { avg: 0.257, obp: 0.325, slg: 0.375, era: 3.7, hrRate: 0.02 }
  if (year <= 1989) return { avg: 0.26, obp: 0.325, slg: 0.385, era: 3.95, hrRate: 0.022 }
  if (year <= 1999) return { avg: 0.266, obp: 0.335, slg: 0.415, era: 4.3, hrRate: 0.027 }
  if (year <= 2009) return { avg: 0.266, obp: 0.335, slg: 0.425, era: 4.45, hrRate: 0.029 }
  if (year <= 2019) return { avg: 0.254, obp: 0.32, slg: 0.405, era: 4.05, hrRate: 0.03 }
  return { avg: 0.247, obp: 0.315, slg: 0.4, era: 4.15, hrRate: 0.033 }
}
