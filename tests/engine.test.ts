import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createRng, deriveSeed, hashSeed } from '../engine/rng'
import { pythagoreanWinPct, pythagenpatExponent, simulateSeason } from '../engine/season'
import { decodeRun, encodeRun, seedCode, dailySeed } from '../engine/share'
import { createDraft, spin, pick, candidatesFor, slotsForPlayer, eligibleCombos, openSlots, reroll, rerollOptions } from '../engine/draft'
import { runSeason, SERIES_WINS } from '../engine/run'
import { simulateSeries } from '../engine/series'
import { BOSSES, BOSS_SEASONS } from '../sports/baseball/bosses'
import { baseball } from '../sports'

const SPORTS = [baseball]

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
  const ruleset = SPORTS[0]!
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

test('a targeted re-spin turns one reel and holds the other', () => {
  const ruleset = baseball

  // Scan seeds so the assertion runs on draws where both axes actually have
  // somewhere else to go, rather than passing by accident on a thin one.
  let checkedTeam = 0
  let checkedEra = 0

  for (let seed = 1; seed <= 60; seed += 1) {
    const state = spin(ruleset, createDraft(ruleset, seed))
    assert.ok(state.spin)

    if (rerollOptions(ruleset, state, 'team').length > 0) {
      const next = reroll(ruleset, state, 'team')
      assert.equal(next.spin!.eraId, state.spin!.eraId, `seed ${seed}: the decade should be held`)
      assert.notEqual(next.spin!.franchiseId, state.spin!.franchiseId, `seed ${seed}: the club should change`)
      assert.equal(next.rerolls, state.rerolls - 1)
      checkedTeam += 1
    }

    if (rerollOptions(ruleset, state, 'era').length > 0) {
      const next = reroll(ruleset, state, 'era')
      assert.equal(next.spin!.franchiseId, state.spin!.franchiseId, `seed ${seed}: the club should be held`)
      assert.notEqual(next.spin!.eraId, state.spin!.eraId, `seed ${seed}: the decade should change`)
      assert.equal(next.rerolls, state.rerolls - 1)
      checkedEra += 1
    }
  }

  assert.ok(checkedTeam > 30, `only ${checkedTeam} seeds could re-spin the club`)
  assert.ok(checkedEra > 30, `only ${checkedEra} seeds could re-spin the decade`)
})

test('a re-spin with nowhere to land costs nothing', () => {
  const ruleset = baseball
  const state = spin(ruleset, createDraft(ruleset, 7))

  // Force the case by pretending the axis is empty: a franchise/era pair that
  // is the only one of its kind cannot be re-spun on that axis, and the run
  // must keep the re-spin rather than spend it on a no-op.
  const lonely = { ...state, spin: { franchiseId: 'NLG', eraId: 'e1920' } }
  assert.equal(rerollOptions(ruleset, lonely, 'era').length, 0, 'the Negro Leagues sit in one decade')

  const after = reroll(ruleset, lonely, 'era')
  assert.equal(after, lonely, 'the state should come back untouched')
  assert.equal(after.rerolls, lonely.rerolls, 'the budget should be intact')
})

test('the re-spin budget is one per run however it is aimed', () => {
  const ruleset = baseball
  const state = spin(ruleset, createDraft(ruleset, 11))
  assert.equal(state.rerolls, 1)

  // Splitting the control gives you a choice of where to aim, not more shots.
  const afterTeam = reroll(ruleset, state, 'team')
  assert.equal(afterTeam.rerolls, 0)
  assert.equal(reroll(ruleset, afterTeam, 'era'), afterTeam, 'the second axis must not be free')
})

test('a targeted re-spin replays identically from the same seed', () => {
  const ruleset = baseball
  for (const axis of ['team', 'era', 'both'] as const) {
    const a = reroll(ruleset, spin(ruleset, createDraft(ruleset, 4242)), axis)
    const b = reroll(ruleset, spin(ruleset, createDraft(ruleset, 4242)), axis)
    assert.deepEqual(a.spin, b.spin, `${axis} should be reproducible`)
  }

  // And the two axes are genuinely different streams, not the same draw
  // relabelled — otherwise aiming the re-spin would be cosmetic.
  const base = spin(ruleset, createDraft(ruleset, 4242))
  assert.notDeepEqual(
    reroll(ruleset, base, 'team').spin,
    reroll(ruleset, base, 'era').spin,
  )
})

test('a shared link points somewhere a friend can actually open', async () => {
  const { shareOrigin, SITE_URL } = await import('../lib/site')

  // `top` is a getter so the cross-origin case can throw the way a real browser
  // does when a framed page reaches for its parent.
  const withWindow = (self: object, top: () => object, href: string): string => {
    const w = { location: { href }, self } as Record<string, unknown>
    Object.defineProperty(w, 'top', { get: top })
    ;(globalThis as { window?: unknown }).window = w
    try {
      return shareOrigin().toString()
    } finally {
      delete (globalThis as { window?: unknown }).window
    }
  }

  // A normal page shares the page you are on, query string stripped so the
  // link carries the run being shared and not the one you arrived from.
  const self = {}
  assert.equal(
    withWindow(self, () => self, 'https://example.test/game/?seed=abc#x'),
    'https://example.test/game/',
  )

  // Embedded: window.location is a frame URL private to that session, so
  // sharing it hands someone a link that cannot open. The canonical site is
  // the honest answer instead.
  assert.equal(withWindow({}, () => ({}), 'https://sandbox.test/_frame/9f8a/'), `${SITE_URL}/`)

  // A cross-origin parent throws on access, which is itself the answer.
  assert.equal(
    withWindow({}, () => { throw new Error('cross-origin') }, 'https://sandbox.test/_frame/9f8a/'),
    `${SITE_URL}/`,
  )
})

test('every boss record matches what that team actually did', () => {
  // These are hand-entered from the historical record, so the guard is that
  // each one is internally consistent: a team's runs should predict its wins.
  // A digit typed wrong in a run total shows up here as a Pythagorean
  // expectation that no longer lands near the record it is paired with.
  for (const season of BOSS_SEASONS) {
    const games = season.wins + season.losses
    assert.ok(games >= 140 && games <= 165, `${season.id}: ${games} games is not a season`)

    const expected = pythagoreanWinPct(season.runsScored, season.runsAllowed, games) * games
    assert.ok(
      Math.abs(expected - season.wins) < 8,
      `${season.id}: ${season.runsScored}/${season.runsAllowed} predicts ${expected.toFixed(0)} wins, record says ${season.wins}`,
    )
    // All of them were genuinely great; a merely good team is not a boss.
    assert.ok(season.wins / games > 0.66, `${season.id} did not win enough to be a boss`)
  }
})

test('a boss from a low-scoring era is not made to look feeble', () => {
  const deadball = BOSSES.find((b) => b.id === 'chn1906')!
  const modern = BOSSES.find((b) => b.id === 'bos2018')!

  // The 1906 Cubs scored 4.7 a game in a league where that was a lot. Left
  // unscaled they would look punchless beside a 2018 team; scaled, their run
  // prevention is the best on the board, which is what they actually were.
  assert.ok(deadball.offense > 5, `1906 offense reads as ${deadball.offense.toFixed(2)} a game`)
  assert.ok(
    deadball.defense < modern.defense,
    'the 1906 Cubs should still prevent runs better than the 2018 Red Sox',
  )
  // And the scaling preserves who was better: their run ratio is unchanged.
  const ratio = (o: { offense: number; defense: number }) => o.offense / o.defense
  assert.ok(ratio(deadball) > ratio(modern))
})

test('a series is best-of-seven and stops when it is decided', () => {
  const context = baseball.context
  const good = { offense: 5.4, defense: 3.9 }
  const boss = BOSSES[0]!

  for (let seed = 1; seed <= 60; seed += 1) {
    const s = simulateSeries(good, boss, context, createRng(seed))
    assert.ok(s.games.length >= 4 && s.games.length <= 7, `${s.games.length} games is not a best-of-seven`)
    assert.equal(Math.max(s.wins, s.losses), 4, 'a series ends at four wins')
    assert.equal(s.wins + s.losses, s.games.length)
    assert.equal(s.won, s.wins > s.losses)
    // The line is written winner first, the way a series result is written.
    assert.equal(s.line, s.won ? `${s.wins}-${s.losses}` : `${s.losses}-${s.wins}`)
  }
})

test('a series replays identically and rewards the better team', () => {
  const context = baseball.context
  const boss = BOSSES.find((b) => b.id === 'sea2001')!

  const a = simulateSeries({ offense: 5.2, defense: 4.0 }, boss, context, createRng(99))
  const b = simulateSeries({ offense: 5.2, defense: 4.0 }, boss, context, createRng(99))
  assert.deepEqual(a.games, b.games, 'the same seed should replay the same series')

  // Short series are mostly noise on purpose, but not pure noise: a far better
  // team has to win clearly more often than it loses.
  let strong = 0
  let weak = 0
  for (let seed = 1; seed <= 300; seed += 1) {
    if (simulateSeries({ offense: 6.6, defense: 3.2 }, boss, context, createRng(seed)).won) strong += 1
    if (simulateSeries({ offense: 4.2, defense: 4.8 }, boss, context, createRng(seed)).won) weak += 1
  }
  assert.ok(strong > 210, `a far better team won only ${strong}/300`)
  assert.ok(weak < 90, `a worse team won ${weak}/300`)
  assert.ok(strong > weak * 2)
})

test('the series is earned, and earning it does not disturb the season', () => {
  const ruleset = baseball
  let below: number | null = null
  let above: number | null = null

  for (let seed = 1; seed <= 40; seed += 1) {
    let state = createDraft(ruleset, seed)
    while (state.status !== 'complete') {
      state = spin(ruleset, state)
      if (!state.spin) break
      const best = candidatesFor(ruleset, state, state.spin)[0]
      if (!best) break
      const slot = slotsForPlayer(ruleset, state, best)[0]
      if (!slot) break
      state = pick(ruleset, state, best.id, slot.id)
    }
    const run = runSeason(ruleset, state)
    if (!run) continue

    // The cut is the only thing that decides whether there is a series.
    assert.equal(
      run.series !== null,
      run.season.wins >= SERIES_WINS,
      `${run.season.wins} wins against a ${SERIES_WINS}-win cut`,
    )
    assert.equal(run.seriesLine, SERIES_WINS)
    if (run.series) above ??= seed
    else below ??= seed

    // The series draws on a stream of its own, so re-running a seed gives the
    // same season whether or not one was staged.
    const again = runSeason(ruleset, state)!
    assert.equal(again.season.record, run.season.record)
    assert.deepEqual(again.series?.games, run.series?.games)
  }

  assert.ok(above !== null, 'no draft in 40 seeds earned a series')
  assert.ok(below !== null, 'no draft in 40 seeds missed the cut — it is not a cut')
})
