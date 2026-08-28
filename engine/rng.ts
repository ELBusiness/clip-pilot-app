/**
 * Deterministic RNG.
 *
 * Every run of the game is reproducible from its seed: the same seed produces
 * the same spins, the same draft pools, and the same season. That is what makes
 * a share link meaningful — "here is my exact run, beat it" — instead of a
 * screenshot nobody can verify.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number
  /** Uniform element of `items`. Throws on an empty array. */
  pick<T>(items: readonly T[]): T
  /** Standard normal via Box-Muller. */
  normal(): number
  /** Poisson sample with mean `lambda`. */
  poisson(lambda: number): number
}

/**
 * mulberry32 — small, fast, and good enough for game simulation. Chosen over
 * Math.random specifically because it takes a seed.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const rng: Rng = {
    next,
    int(maxExclusive) {
      if (maxExclusive <= 0) return 0
      return Math.floor(next() * maxExclusive)
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error('Rng.pick called with an empty array')
      }
      return items[Math.floor(next() * items.length)] as (typeof items)[number]
    },
    normal() {
      // Guard against log(0), which Box-Muller cannot handle.
      let u = next()
      while (u === 0) u = next()
      const v = next()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    },
    poisson(lambda) {
      if (lambda <= 0) return 0
      // Knuth's method is exact and fast for the small means these sports
      // produce (roughly 1-5 goals, 4-6 runs). Above ~30 it gets slow, so
      // fall back to a normal approximation for basketball-scale means.
      if (lambda > 30) {
        return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * rng.normal()))
      }
      const limit = Math.exp(-lambda)
      let k = 0
      let p = 1
      do {
        k += 1
        p *= next()
      } while (p > limit)
      return k - 1
    },
  }

  return rng
}

/**
 * Derive a stable sub-seed for one stage of a run, so that (for example)
 * re-simulating a season does not consume the draft's random stream and shift
 * every later spin.
 */
export function deriveSeed(seed: number, label: string): number {
  let h = seed >>> 0
  for (let i = 0; i < label.length; i += 1) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Turn an arbitrary string into a seed, for user-entered seed codes. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 0x01000193) >>> 0
  }
  return h >>> 0
}
