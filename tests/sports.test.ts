import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SPORTS, SPORTS_BY_ID, bySlug } from '../sports'
import { createDraft, spin, pick, candidatesFor, slotsForPlayer, eligibleCombos, openSlots } from '../engine/draft'
import { runSeason } from '../engine/run'
import { parsePlayers } from '../sports/parse'

test('every sport is registered consistently', () => {
  assert.equal(SPORTS.length, 4)
  for (const ruleset of SPORTS) {
    assert.equal(SPORTS_BY_ID[ruleset.id], ruleset)
    assert.equal(bySlug(ruleset.slug), ruleset)
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
