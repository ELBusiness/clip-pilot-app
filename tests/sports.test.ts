import { test } from 'node:test'
import assert from 'node:assert/strict'

import { baseball } from '../sports'
import { baseRuns, normalizedBatting, normalizedEra, playerRating } from '../sports/baseball'
import { eraLabelFor } from '../sports/baseball/players'

/** The game ships as one sport; keep the loops so a second pack is a one-line change. */
const SPORTS = [baseball]
import { createDraft, spin, pick, candidatesFor, slotsForPlayer, eligibleCombos, openSlots, reroll } from '../engine/draft'
import { dailyKey, dailyNumber, dailySeed, dailyShareText } from '../engine/share'
import { runSeason } from '../engine/run'
import { parsePlayers } from '../sports/parse'

test('the game is registered consistently', () => {
  assert.equal(SPORTS.length, 1)
  for (const ruleset of SPORTS) {
    assert.equal(ruleset.id, 'baseball')
    assert.equal(ruleset.slug, '162-0')
    assert.ok(ruleset.slots.length > 0)
    assert.ok(ruleset.players.length > 0)
    assert.ok(ruleset.seasonGames > 0)
    assert.ok(ruleset.benchmark.wins > 0 && ruleset.benchmark.wins <= ruleset.seasonGames)
  }
})

test('player data references only known franchises, eras, and slots', () => {
  for (const ruleset of SPORTS) {
    const franchises = new Set(ruleset.franchises.map((f) => f.id))
    const eras = new Set(ruleset.eras.map((e) => e.id))
    const accepted = new Set(ruleset.slots.flatMap((s) => s.accepts))

    for (const player of ruleset.players) {
      assert.ok(franchises.has(player.franchiseId), `${ruleset.slug}: ${player.name} has unknown franchise ${player.franchiseId}`)
      assert.ok(eras.has(player.eraId), `${ruleset.slug}: ${player.name} has unknown era ${player.eraId}`)
      assert.ok(player.positions.length > 0, `${ruleset.slug}: ${player.name} has no positions`)
      for (const pos of player.positions) {
        assert.ok(accepted.has(pos), `${ruleset.slug}: ${player.name} has position ${pos} that no slot accepts`)
      }
      assert.ok(player.year > 1870 && player.year < 2030, `${ruleset.slug}: ${player.name} has implausible year ${player.year}`)
      assert.ok(Object.keys(player.stats).length > 0, `${ruleset.slug}: ${player.name} has no stats`)
      for (const [key, value] of Object.entries(player.stats)) {
        assert.ok(Number.isFinite(value), `${ruleset.slug}: ${player.name} has non-finite ${key}`)
      }
    }
  }
})

test('player ids are unique within each sport', () => {
  for (const ruleset of SPORTS) {
    const ids = ruleset.players.map((p) => p.id)
    assert.equal(new Set(ids).size, ids.length, `${ruleset.slug} has duplicate player ids`)
  }
})

test('every slot has enough eligible players to stay draftable', () => {
  for (const ruleset of SPORTS) {
    for (const slot of ruleset.slots) {
      const eligible = ruleset.players.filter((p) =>
        p.positions.some((pos) => slot.accepts.includes(pos)),
      )
      // The slot must survive a full draft even if rivals take the obvious names.
      assert.ok(
        eligible.length >= 6,
        `${ruleset.slug}: slot ${slot.id} has only ${eligible.length} eligible players`,
      )
    }
  }
})

test('a spin never lands on a franchise and era with nothing to pick', () => {
  // The genre's worst failure: a dead spin reads as a broken game.
  for (const ruleset of SPORTS) {
    for (let seed = 1; seed <= 40; seed += 1) {
      let state = spin(ruleset, createDraft(ruleset, seed))
      let guard = 0
      while (state.status === 'picking' && guard++ < 40) {
        const candidates = candidatesFor(ruleset, state, state.spin!)
        assert.ok(
          candidates.length > 0,
          `${ruleset.slug} seed ${seed}: dead spin at pick ${state.picks.length + 1}`,
        )
        const player = candidates[seed % candidates.length]!
        const slot = slotsForPlayer(ruleset, state, player)[0]!
        state = pick(ruleset, state, player.id, slot.id)
      }
      assert.equal(
        state.picks.length,
        ruleset.slots.length,
        `${ruleset.slug} seed ${seed}: draft did not fill every slot`,
      )
    }
  }
})

test('eligible combos shrink as the roster fills and never include drafted players', () => {
  const ruleset = SPORTS[0]!
  let state = spin(ruleset, createDraft(ruleset, 777))
  const firstCount = eligibleCombos(ruleset, state).length
  assert.ok(firstCount > 0)

  let guard = 0
  while (state.status === 'picking' && guard++ < 40) {
    const candidates = candidatesFor(ruleset, state, state.spin!)
    const drafted = new Set(state.picks.map((p) => p.playerId))
    for (const c of candidates) {
      assert.ok(!drafted.has(c.id), `${c.name} was offered twice`)
    }
    const player = candidates[0]!
    state = pick(ruleset, state, player.id, slotsForPlayer(ruleset, state, player)[0]!.id)
  }

  assert.equal(openSlots(ruleset, state).length, 0)
  assert.equal(eligibleCombos(ruleset, state).length, 0, 'a full roster should offer no combos')
})

test('ratings and seasons stay in plausible ranges for real drafts', () => {
  for (const ruleset of SPORTS) {
    for (let seed = 1; seed <= 25; seed += 1) {
      let state = spin(ruleset, createDraft(ruleset, seed))
      let guard = 0
      while (state.status === 'picking' && guard++ < 40) {
        const candidates = candidatesFor(ruleset, state, state.spin!)
        const player = candidates[Math.floor(candidates.length / 2)]!
        state = pick(ruleset, state, player.id, slotsForPlayer(ruleset, state, player)[0]!.id)
      }

      const result = runSeason(ruleset, state)
      assert.ok(result, `${ruleset.slug} seed ${seed}: no result`)

      const { rating, season } = result
      assert.ok(rating.offense > 0 && Number.isFinite(rating.offense), `${ruleset.slug}: bad offense ${rating.offense}`)
      assert.ok(rating.defense > 0 && Number.isFinite(rating.defense), `${ruleset.slug}: bad defense ${rating.defense}`)
      // Nothing should be scoring ten times league average.
      assert.ok(
        rating.offense < ruleset.context.averageScore * 4,
        `${ruleset.slug}: runaway offense ${rating.offense}`,
      )
      assert.equal(season.wins + season.losses + season.draws, ruleset.seasonGames)
      assert.ok(season.wins >= 0 && season.wins <= ruleset.seasonGames)
      assert.ok(Number.isFinite(season.expectedWins))

      for (const factor of rating.factors) {
        assert.ok(factor.z >= -1 && factor.z <= 1, `${ruleset.slug}: factor ${factor.label} z out of range: ${factor.z}`)
        assert.ok(factor.value.length > 0)
      }
    }
  }
})

test('an all-time roster clearly outperforms a replacement-level one', () => {
  // Sanity check that the rating functions are actually reading the stats:
  // sorting the pool by quality and taking the best should beat taking the worst.
  for (const ruleset of SPORTS) {
    const fill = (preferBest: boolean) => {
      const used = new Set<string>()
      const roster = ruleset.slots.map((slot) => {
        const options = ruleset.players
          .filter((p) => !used.has(p.id) && p.positions.some((x) => slot.accepts.includes(x)))
        const scored = options
          .map((player) => ({ player, score: ruleset.rate([{ player, slot }]).offense - ruleset.rate([{ player, slot }]).defense }))
          .sort((a, b) => (preferBest ? b.score - a.score : a.score - b.score))
        const chosen = scored[0]!.player
        used.add(chosen.id)
        return { player: chosen, slot }
      })
      return ruleset.rate(roster)
    }

    const best = fill(true)
    const worst = fill(false)
    const bestDiff = best.offense - best.defense
    const worstDiff = worst.offense - worst.defense
    assert.ok(bestDiff > worstDiff, `${ruleset.slug}: best roster (${bestDiff}) did not beat worst (${worstDiff})`)
  }
})

test('the table parser rejects malformed data rather than importing it silently', () => {
  const spec = { stats: ['a', 'b'] }
  assert.throws(() => parsePlayers('Name|TEAM|era|POS|1990|1', spec), /expected 2/)
  assert.throws(() => parsePlayers('Name|TEAM|era|POS|1990|x|2', spec), /non-numeric/)
  assert.throws(() => parsePlayers('Name|TEAM|era|POS', spec), /Malformed/)
  assert.throws(
    () => parsePlayers('Dup|T|e|P|1990|1|2\nDup|T|e|P|1991|1|2', spec),
    /Duplicate/,
  )
  // Comments and blank lines are skipped, not parsed.
  assert.equal(parsePlayers('# comment\n\nOk Name|T|e|P|1990|1|2', spec).length, 1)
})

test('era adjustment rebases a stat line into the modern run environment', () => {
  // Walter Johnson's 2.17 came in a league that averaged about 2.75. Treating
  // it as a modern 2.17 is what made deadball arms look superhuman.
  const deadball = { ...baseball.players[0]!, year: 1913, stats: { era: 2.17 } }
  const modern = { ...baseball.players[0]!, year: 2014, stats: { era: 2.17 } }

  const adjustedDeadball = normalizedEra(deadball)
  const adjustedModern = normalizedEra(modern)

  assert.ok(adjustedDeadball > 3.0, `expected deadball 2.17 to deflate, got ${adjustedDeadball}`)
  assert.ok(adjustedDeadball > adjustedModern, 'deadball should stay worse than the same modern line')
  // A 2010s line needs no era correction, so only projection regression moves
  // it — toward the 4.05 reference, never past it.
  assert.ok(
    adjustedModern > 2.17 && adjustedModern < 2.9,
    `a 2010s 2.17 should regress modestly, got ${adjustedModern}`,
  )

  // Hitters move the other way: 1960s offense was suppressed, so the same
  // slash line was worth more than it looks.
  const sixties = normalizedBatting({ ...baseball.players[0]!, year: 1968, stats: { avg: 0.3, obp: 0.37, slg: 0.5 } })
  const modernBat = normalizedBatting({ ...baseball.players[0]!, year: 2015, stats: { avg: 0.3, obp: 0.37, slg: 0.5 } })
  assert.ok(sixties.slg > modernBat.slg, 'a 1968 .500 SLG should adjust upward')
})

test('BaseRuns is calibrated to real baseball and cannot exceed its baserunners', () => {
  // A league-average team should come out near the real 740 runs.
  const average = baseRuns(0.25, 0.32, 0.405, 0.03, 5500)
  assert.ok(average > 690 && average < 790, `league average returned ${average}`)

  // Monotonic in quality.
  assert.ok(baseRuns(0.3, 0.38, 0.5, 0.045, 5500) > average)
  assert.ok(baseRuns(0.21, 0.27, 0.32, 0.015, 5500) < average)

  // The physical ceiling: runs can never exceed times-on-base. This is the
  // property a linear estimator lacks and the reason a stacked lineup used to
  // project past anything real.
  for (const [avg, obp, slg, hrRate] of [
    [0.4, 0.55, 0.9, 0.09],
    [0.36, 0.5, 0.8, 0.07],
    [0.34, 0.47, 0.69, 0.055],
  ] as const) {
    const runs = baseRuns(avg, obp, slg, hrRate, 5500)
    const onBase = obp * 5500
    assert.ok(runs < onBase, `runs ${runs} exceeded baserunners ${onBase}`)
    assert.ok(Number.isFinite(runs) && runs > 0)
  }
})

test('the difficulty curve leaves the real record worth chasing', () => {
  // Beating 116 wins should be an achievement, not the default outcome. This
  // guards the tuning: if a change makes a middling draft blow past the best
  // season in history again, this fails.
  let total = 0
  let beatRecord = 0
  const runs = 120

  for (let seed = 1; seed <= runs; seed += 1) {
    let state = spin(baseball, createDraft(baseball, seed))
    let guard = 0
    while (state.status === 'picking' && guard++ < 30) {
      const candidates = candidatesFor(baseball, state, state.spin!)
      if (!candidates.length) break
      const player = candidates[Math.floor(candidates.length / 2)]!
      state = pick(baseball, state, player.id, slotsForPlayer(baseball, state, player)[0]!.id)
    }
    const result = runSeason(baseball, state)
    if (!result) continue
    total += result.season.wins
    if (result.season.wins > baseball.benchmark.wins) beatRecord += 1
  }

  const mean = total / runs
  // A middling draft should be a good team, not an all-time one.
  assert.ok(mean > 80 && mean < 105, `a middling draft should land in the 80s-90s, got ${mean.toFixed(1)}`)
  assert.ok(beatRecord / runs < 0.15, `a middling draft beat the all-time record ${beatRecord}/${runs} times`)
})

test('player ratings rank the way a fan would expect', () => {
  const byName = (name: string) =>
    baseball.players.filter((p) => p.name === name).map((p) => playerRating(p))

  const ruth = byName('Babe Ruth')[0]
  const bergen = byName('Bill Bergen')[0]
  assert.ok(ruth, 'Babe Ruth should be in the pool')
  assert.ok(bergen, 'Bill Bergen should be in the pool')

  // Ruth is the best hitter ever; Bergen is the standard example of the worst.
  assert.ok(ruth.score > 90, `Ruth rated ${ruth.score}`)
  assert.ok(bergen.score < 30, `Bergen rated ${bergen.score}`)

  // 50 is a league-average regular, so the pool should centre near it.
  const scores = baseball.players.map((p) => playerRating(p).score).sort((a, b) => a - b)
  const median = scores[Math.floor(scores.length / 2)]!
  assert.ok(median > 45 && median < 60, `pool median rating was ${median}`)
  assert.equal(scores[0]! >= 1 && scores[scores.length - 1]! <= 99, true)

  // The rating must agree with the simulation, or it is lying to the player:
  // a higher-rated bat has to actually produce more runs.
  const bats = baseball.players
    .filter((p) => p.stats['era'] === undefined)
    .map((p) => ({ p, r: playerRating(p) }))
  const best = bats.sort((a, b) => b.r.score - a.r.score)[0]!
  const worst = bats[bats.length - 1]!
  const lineup = (player: typeof best.p) =>
    baseball.slots
      .filter((s) => s.group === 'Lineup')
      .map((slot) => ({ player, slot }))
  assert.ok(
    baseball.rate(lineup(best.p)).offense > baseball.rate(lineup(worst.p)).offense,
    'the top-rated bat should outscore the bottom-rated one',
  )
})

test('every player carries a plain-English label', () => {
  for (const player of baseball.players) {
    const { label, score } = playerRating(player)
    assert.ok(label.length > 0, `${player.name} has no label`)
    assert.ok(Number.isInteger(score), `${player.name} has a non-integer rating`)
  }
})

test('the daily challenge is the same for everyone and changes each day', () => {
  const day1 = new Date('2026-03-04T00:00:00Z')
  const day2 = new Date('2026-03-05T00:00:00Z')

  // Same date, different callers, same draft — that is the whole premise.
  assert.equal(dailySeed('baseball', day1), dailySeed('baseball', day1))
  assert.notEqual(dailySeed('baseball', day1), dailySeed('baseball', day2))

  // Time of day must not matter, or players in different timezones diverge.
  assert.equal(
    dailySeed('baseball', new Date('2026-03-04T23:59:00Z')),
    dailySeed('baseball', day1),
  )

  assert.equal(dailyKey(day1), '2026-03-04')
  assert.ok(dailyNumber(day2) === dailyNumber(day1) + 1)

  // The daily runs with no re-spins.
  const daily = createDraft(baseball, dailySeed('baseball', day1), { rerolls: 0 })
  assert.equal(daily.rerolls, 0)
  const spun = spin(baseball, daily)
  assert.equal(reroll(baseball, spun), spun, 'a daily run must not be able to re-spin')

  // Two players on the same day see identical spins.
  const playThrough = () => {
    let state = spin(baseball, createDraft(baseball, dailySeed('baseball', day1), { rerolls: 0 }))
    const seen: string[] = []
    let guard = 0
    while (state.status === 'picking' && guard++ < 40) {
      seen.push(`${state.spin!.franchiseId}:${state.spin!.eraId}`)
      const candidates = candidatesFor(baseball, state, state.spin!)
      const player = candidates[0]!
      state = pick(baseball, state, player.id, slotsForPlayer(baseball, state, player)[0]!.id)
    }
    return seen
  }
  assert.deepEqual(playThrough(), playThrough())
})

test('the daily share card does not leak the roster', () => {
  const text = dailyShareText('118-44', 118, 63)
  assert.ok(text.includes('118-44'))
  assert.ok(text.includes('#63'))
  // Revealing picks would answer the only interesting question and remove the
  // reason for the next person to open the game.
  for (const player of baseball.players.slice(0, 200)) {
    assert.ok(!text.includes(player.name), `share text leaked ${player.name}`)
  }
})

test('eras are decades, and each one is stocked', () => {
  const ids = baseball.eras.map((e) => e.id)
  // 1900s through 2010s. There is no 2020s because the databank stops at the
  // 60-game 2020 season, which is too small a sample to build cards from.
  assert.deepEqual(ids, [
    'e1900', 'e1910', 'e1920', 'e1930', 'e1940', 'e1950',
    'e1960', 'e1970', 'e1980', 'e1990', 'e2000', 'e2010',
  ])

  for (const era of baseball.eras) {
    // Exactly one decade wide (1900s starts at 1901, when the AL arrived).
    assert.ok(era.endYear - era.startYear <= 9, `${era.id} spans more than a decade`)

    const players = baseball.players.filter((p) => p.eraId === era.id)
    assert.ok(players.length > 0, `${era.id} has no players`)

    for (const player of players) {
      // The eight Negro Leagues players are the one deliberate exception: they
      // all sit in the 1920s, the heart of those leagues, even though their
      // cards carry true seasons from 1919 to 1938. Splitting eight players
      // across three decades would leave a spin offering one or two names, and
      // changing the season printed on the card to match the bucket would mean
      // falsifying a real record to satisfy a tidier rule.
      if (player.franchiseId === 'NLG') continue

      assert.ok(
        player.year >= era.startYear && player.year <= era.endYear,
        `${player.name} is dated ${player.year} but sits in ${era.id}`,
      )
    }
  }
})

test('the reel labels a decade by when the club actually played', () => {
  const nineties = baseball.eras.find((e) => e.id === 'e1990')!
  const seventies = baseball.eras.find((e) => e.id === 'e1970')!

  // A club that was there all decade gets the decade.
  assert.equal(eraLabelFor('NYY', nineties), '1990s')

  // One that arrived partway through gets the years it was there. The Mariners
  // did not exist until 1977, and labelling that "1970s" is what made the reel
  // look broken.
  assert.equal(eraLabelFor('SEA', seventies), '1977-1979')

  // Unknown franchise or era falls back rather than throwing.
  assert.equal(eraLabelFor(undefined, nineties), '1990s')
  assert.equal(eraLabelFor('NYY', undefined), '')
})

test('no franchise and decade pair is too thin to be worth a spin', () => {
  const counts = new Map<string, number>()
  for (const player of baseball.players) {
    const key = `${player.franchiseId}:${player.eraId}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (const [key, n] of counts) {
    assert.ok(n >= 5, `${key} offers only ${n} players`)
  }
})
