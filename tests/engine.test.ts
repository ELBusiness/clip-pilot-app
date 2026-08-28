import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createRng, deriveSeed, hashSeed } from '../engine/rng'
import { pythagoreanWinPct, pythagenpatExponent, simulateSeason } from '../engine/season'
import { decodeRun, encodeRun, seedCode, dailySeed } from '../engine/share'
import { createDraft, spin, pick, candidatesFor, slotsForPlayer, eligibleCombos, openSlots, reroll } from '../engine/draft'
import { runSeason } from '../engine/run'
import { SPORTS } from '../sports'

test('rng is deterministic for a given seed', () => {
  const a = createRng(12345)
  const b = createRng(12345)
  const seqA = Array.from({ length: 20 }, () => a.next())
  const seqB = Array.from({ length: 20 }, () => b.next())
  assert.deepEqual(seqA, seqB)
  assert.notDeepEqual(seqA, Array.from({ length: 20 }, () => createRng(54321).next()))
})

test('rng stays in range and derived seeds diverge', () => {
  const rng = createRng(7)
  for (let i = 0; i < 500; i++) {
    const v = rng.next()
    assert.ok(v >= 0 && v < 1, `next() out of range: ${v}`)
    assert.ok(rng.int(10) >= 0 && rng.int(10) < 10)
    assert.ok(rng.poisson(4) >= 0)
  }
  assert.notEqual(deriveSeed(1, 'spin:1'), deriveSeed(1, 'spin:2'))
  assert.equal(deriveSeed(1, 'spin:1'), deriveSeed(1, 'spin:1'))
  assert.equal(hashSeed('abc'), hashSeed('abc'))
})

test('poisson mean is close to lambda', () => {
  const rng = createRng(99)
  for (const lambda of [0.8, 4.5, 11]) {
    let total = 0
    const n = 20000
    for (let i = 0; i < n; i++) total += rng.poisson(lambda)
    const mean = total / n
    assert.ok(Math.abs(mean - lambda) < lambda * 0.06, `lambda ${lambda} -> mean ${mean}`)
  }
})

test('pythagenpat reproduces the known 1.83 exponent in a normal run environment', () => {
  // Baseball-Reference uses a fixed 1.83; pythagenpat should land near it when
  // the scoring environment is a normal MLB one (~9 runs per game, both sides).
  const exp = pythagenpatExponent(760, 700, 162)
  assert.ok(Math.abs(exp - 1.83) < 0.09, `expected ~1.83, got ${exp}`)
})

test('pythagorean win pct matches known results', () => {
  // Equal scoring is a .500 team.
  assert.ok(Math.abs(pythagoreanWinPct(700, 700, 162) - 0.5) < 1e-9)
  // A +65 run differential is worth roughly six or seven wins over .500.
  const wins = pythagoreanWinPct(762, 697, 162) * 162
  assert.ok(wins > 85 && wins < 90, `expected 85-90 wins, got ${wins}`)
  // Monotonic in run differential.
  assert.ok(pythagoreanWinPct(900, 600, 162) > pythagoreanWinPct(800, 600, 162))
})

test('season simulation totals are internally consistent', () => {
  const rating = { offense: 5.2, defense: 4.1, factors: [] }
  const context = { averageScore: 4.5, spread: 0.45, model: 'poisson' as const }
  const season = simulateSeason(rating, context, 162, createRng(4), false)

  assert.equal(season.games.length, 162)
  assert.equal(season.wins + season.losses + season.draws, 162)
  assert.equal(season.draws, 0, 'baseball must never end level')
  assert.equal(season.scored, season.games.reduce((s, g) => s + g.scored, 0))
  assert.equal(season.allowed, season.games.reduce((s, g) => s + g.allowed, 0))
  assert.ok(season.longestStreak <= season.wins)
})

test('a stronger roster wins more than a weaker one', () => {
  const context = { averageScore: 4.5, spread: 0.45, model: 'poisson' as const }
  const strong = simulateSeason({ offense: 8, defense: 3, factors: [] }, context, 162, createRng(1), false)
  const weak = simulateSeason({ offense: 3.4, defense: 5.5, factors: [] }, context, 162, createRng(1), false)
  assert.ok(strong.wins > weak.wins + 40, `${strong.wins} vs ${weak.wins}`)
})

test('draws only happen in sports that allow them', () => {
  const context = { averageScore: 1.4, spread: 0.35, model: 'poisson' as const }
  const rating = { offense: 1.4, defense: 1.4, factors: [] }
  const withDraws = simulateSeason(rating, context, 38, createRng(3), true)
  const withoutDraws = simulateSeason(rating, context, 38, createRng(3), false)
  assert.ok(withDraws.draws > 0, 'low-scoring even sides should draw sometimes')
  assert.equal(withoutDraws.draws, 0)
})

test('share codes round-trip', () => {
  const ruleset = SPORTS[0]!
  let state = spin(ruleset, createDraft(ruleset, 8675309))
  const cands = candidatesFor(ruleset, state, state.spin!)
  state = pick(ruleset, state, cands[0]!.id, slotsForPlayer(ruleset, state, cands[0]!)[0]!.id)

  const decoded = decodeRun(encodeRun(state))
  assert.ok(decoded)
  assert.equal(decoded.sportId, ruleset.id)
  assert.equal(decoded.seed, state.seed)
  assert.equal(decoded.picks.length, state.picks.length)
  assert.equal(decoded.picks[0]!.playerId, state.picks[0]!.playerId)
})

test('malformed share codes are rejected rather than throwing', () => {
  assert.equal(decodeRun(''), null)
  assert.equal(decodeRun('nonsense'), null)
  assert.equal(decodeRun('9.baseball.abc'), null, 'unknown version')
  assert.equal(decodeRun('1.quidditch.abc'), null, 'unknown sport')
  assert.equal(decodeRun('1.baseball.zz.brokenpair'), null)
  assert.equal(seedCode(0).length, 6)
  assert.notEqual(dailySeed('baseball'), dailySeed('soccer'))
})

test('the same seed replays to the same draft and the same season', () => {
  for (const ruleset of SPORTS) {
    const play = () => {
      let state = spin(ruleset, createDraft(ruleset, 4242))
      let guard = 0
      while (state.status === 'picking' && guard++ < 40) {
        const cands = candidatesFor(ruleset, state, state.spin!)
        const player = cands[0]!
        state = pick(ruleset, state, player.id, slotsForPlayer(ruleset, state, player)[0]!.id)
      }
      return state
    }
    const a = play()
    const b = play()
    assert.deepEqual(a.picks, b.picks, `${ruleset.slug} draft is not deterministic`)

    const seasonA = runSeason(ruleset, a)!
    const seasonB = runSeason(ruleset, b)!
    assert.equal(seasonA.season.record, seasonB.season.record, `${ruleset.slug} season is not deterministic`)
  }
})

test('re-simulating cannot be used to reroll a bad result', () => {
  const ruleset = SPORTS[1]!
  let state = spin(ruleset, createDraft(ruleset, 555))
  let guard = 0
  while (state.status === 'picking' && guard++ < 40) {
    const cands = candidatesFor(ruleset, state, state.spin!)
    const player = cands[0]!
    state = pick(ruleset, state, player.id, slotsForPlayer(ruleset, state, player)[0]!.id)
  }
  const first = runSeason(ruleset, state)!
  const second = runSeason(ruleset, state)!
  assert.equal(first.season.record, second.season.record)
  assert.equal(first.season.scored, second.season.scored)
})

test('illegal picks are refused', () => {
  const ruleset = SPORTS[0]!
  const state = spin(ruleset, createDraft(ruleset, 31337))
  const legal = candidatesFor(ruleset, state, state.spin!)
  const legalIds = new Set(legal.map((p) => p.id))

  // A player from a different franchise/era must not be draftable.
  const outsider = ruleset.players.find((p) => !legalIds.has(p.id))!
  const slot = ruleset.slots.find((s) => outsider.positions.some((x) => s.accepts.includes(x)))!
  assert.equal(pick(ruleset, state, outsider.id, slot.id), state, 'outsider was accepted')

  // A real candidate cannot be dropped into a slot that does not accept them.
  const player = legal[0]!
  const wrongSlot = ruleset.slots.find((s) => !player.positions.some((x) => s.accepts.includes(x)))
  if (wrongSlot) {
    assert.equal(pick(ruleset, state, player.id, wrongSlot.id), state, 'wrong slot was accepted')
  }
  assert.equal(pick(ruleset, state, 'no-such-player', slot.id), state)
})

test('rerolls are limited and change the draw', () => {
  const ruleset = SPORTS[0]!
  const state = spin(ruleset, createDraft(ruleset, 2024))
  assert.equal(state.rerolls, 1)

  const rerolled = reroll(ruleset, state)
  assert.equal(rerolled.rerolls, 0)
  assert.notDeepEqual(rerolled.spin, state.spin, 'a reroll should draw a different combo')

  // Out of rerolls: further attempts are no-ops rather than free spins.
  assert.equal(reroll(ruleset, rerolled), rerolled)
})
