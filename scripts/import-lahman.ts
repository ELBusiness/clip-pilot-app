/**
 * Lahman / Chadwick Baseball Databank importer.
 *
 * Turns the real database into the game's roster pack. This is what gives a
 * spin actual depth: a hand-curated pack can hold a few hundred famous names,
 * which means most franchise/era combinations offer one or two players and the
 * draft stops being a choice. The database has a hundred thousand player
 * seasons, so every combination can be stocked with the players who really were
 * on that team in that decade — stars where a franchise had them, journeymen
 * where it did not.
 *
 * Usage:
 *   1. Download the databank and unzip the `core` CSVs into data/lahman/:
 *        https://sabr.org/lahman-database/
 *      Needs People.csv, Batting.csv, Pitching.csv, Fielding.csv, Teams.csv.
 *   2. npm run import:lahman
 *
 * Writes sports/baseball/players.generated.ts.
 *
 * LICENSING: the databank is CC BY-SA 3.0. Data derived from it inherits
 * ShareAlike and must credit Sean Lahman and the Chadwick Baseball Bureau. The
 * generated file carries that notice; see DATA-LICENSE.md before redistributing.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), 'data', 'lahman')
const OUT = join(process.cwd(), 'sports', 'baseball', 'players.generated.ts')

/**
 * Playing-time floors for a whole franchise/era stint, not a single season.
 *
 * Cards are aggregated across every year a player spent with one franchise in
 * one era, so "Ernie Banks, 1960s Cubs" is his actual production over that
 * stretch. Taking single seasons instead selects for career years — every card
 * becomes an outlier, and a roster of thirteen outliers wins 145 games.
 */
const MIN_PA = 1200
const MIN_IP = 350
const MIN_RELIEF_IP = 150

/**
 * Players kept per franchise/era/position, ranked by playing time rather than
 * by quality.
 *
 * This is the single most important line in the importer. Keeping the three
 * *best* players per slot builds a best-of compilation, so every spin offers
 * stars and the draft has no downside — a player picking sensibly ended up
 * beating the all-time win record about two-thirds of the time. Keeping the
 * three who actually played there most gives you the franchise's real
 * regulars: the 1970s Reds hand you Johnny Bench, and a bad club in a bad
 * decade hands you the journeyman who really did catch 400 games for them.
 *
 * The tension in this genre comes from spinning a team that has nothing you
 * need. That only exists if the data admits teams that had nothing.
 */
const PER_BUCKET = 3

type Row = Record<string, string>

function readCsv(name: string): Row[] {
  const path = join(DATA_DIR, name)
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}\nDownload the databank from https://sabr.org/lahman-database/ and unzip the core CSVs into data/lahman/.`,
    )
  }
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean)
  const header = parseCsvLine(lines[0] ?? '')
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    const row: Row = {}
    header.forEach((key, i) => {
      row[key] = cells[i] ?? ''
    })
    return row
  })
}

/** Minimal RFC 4180 parsing — the databank quotes names containing commas. */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(field)
      field = ''
    } else field += ch
  }
  out.push(field)
  return out
}

const num = (v: string | undefined): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Era buckets, matching ERAS in players.ts. */
function eraFor(year: number): string | null {
  if (year < 1901) return null
  if (year <= 1939) return 'e20s'
  if (year <= 1959) return 'e40s'
  if (year <= 1979) return 'e60s'
  if (year <= 1999) return 'e80s'
  if (year <= 2009) return 'e00s'
  return 'e10s'
}

/**
 * Lahman franchise IDs are already the modern franchise, following relocations
 * (the original Senators resolve to MIN, the Philadelphia A's to OAK). Only
 * three differ from the ids this game uses.
 */
const FRANCHISE_RENAME: Record<string, string> = { ANA: 'LAA', FLA: 'MIA', TBD: 'TBR' }

/** Team colors. Franchises without an entry get a generated slate pair. */
const COLORS: Record<string, [string, string]> = {
  NYY: ['#132448', '#c4ced3'], BOS: ['#bd3039', '#0c2340'], LAD: ['#005a9c', '#ef3e42'],
  SFG: ['#fd5a1e', '#27251f'], STL: ['#c41e3a', '#0c2340'], CHC: ['#0e3386', '#cc3433'],
  ATL: ['#ce1141', '#13274f'], CIN: ['#c6011f', '#000000'], DET: ['#0c2340', '#fa4616'],
  PIT: ['#fdb827', '#27251f'], BAL: ['#df4601', '#000000'], OAK: ['#003831', '#efb21e'],
  HOU: ['#eb6e1f', '#002d62'], SEA: ['#0c2c56', '#005c5c'], PHI: ['#e81828', '#002d72'],
  MIN: ['#002b5c', '#d31145'], CLE: ['#00385d', '#e50022'], TEX: ['#003278', '#c0111f'],
  NYM: ['#002d72', '#ff5910'], TOR: ['#134a8e', '#1d2d5c'], SDP: ['#2f241d', '#ffc425'],
  MIL: ['#12284b', '#ffc52f'], LAA: ['#ba0021', '#003263'], ARI: ['#a71930', '#e3d4ad'],
  WSN: ['#ab0003', '#14225a'], KCR: ['#004687', '#bd9b60'], CHW: ['#27251f', '#c4ced4'],
  COL: ['#33006f', '#c4ced4'], MIA: ['#00a3e0', '#ef3340'], TBR: ['#092c5c', '#8fbce6'],
}

const POSITION_MAP: Record<string, string> = {
  C: 'C', '1B': '1B', '2B': '2B', '3B': '3B', SS: 'SS',
  LF: 'LF', CF: 'CF', RF: 'RF', OF: 'OF', P: 'P',
}

interface Card {
  name: string
  franchise: string
  era: string
  position: string
  year: number
  stats: (number | string)[]
  /** Playing time with the franchise in that era; the bucket ranking key. */
  playingTime: number
}

function main(): void {
  console.log('Reading databank from', DATA_DIR)
  const teams = readCsv('Teams.csv')
  const people = readCsv('People.csv')
  const batting = readCsv('Batting.csv')
  const pitching = readCsv('Pitching.csv')
  const fielding = readCsv('Fielding.csv')

  // teamID/year -> modern franchise id.
  const franchiseOf = new Map<string, string>()
  const seasonCount = new Map<string, number>()
  const franchiseName = new Map<string, string>()

  // What the club was actually *called* in a given season. Lahman resolves
  // every season to the modern franchise, so without this the reel offers Andre
  // Dawson and Steve Rogers under "Washington Nationals, 1970-1978" when they
  // were Montreal Expos — and the Philadelphia Athletics, Brooklyn Dodgers, and
  // St. Louis Browns all vanish from a game whose whole appeal is history.
  const nameByYear = new Map<string, string>()

  for (const row of teams) {
    const raw = row['franchID'] ?? ''
    if (!raw) continue
    const id = FRANCHISE_RENAME[raw] ?? raw
    const year = num(row['yearID'])
    franchiseOf.set(`${row['teamID']}:${year}`, id)
    seasonCount.set(id, (seasonCount.get(id) ?? 0) + 1)
    franchiseName.set(id, row['name'] ?? id)

    nameByYear.set(`${id}:${year}`, row['name'] ?? id)
  }

  // Keep the franchises a fan recognizes: the 30 with the longest histories.
  const keep = new Set(
    [...seasonCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([id]) => id),
  )

  const nameById = new Map<string, string>()
  for (const row of people) {
    nameById.set(
      row['playerID'] ?? '',
      `${row['nameFirst'] ?? ''} ${row['nameLast'] ?? ''}`.trim(),
    )
  }

  // Primary position per player-season: wherever they played most games.
  const posByKey = new Map<string, { pos: string; games: number }>()
  for (const row of fielding) {
    const pos = POSITION_MAP[row['POS'] ?? '']
    if (!pos) continue
    const key = `${row['playerID']}:${row['yearID']}`
    const games = num(row['G'])
    const held = posByKey.get(key)
    if (!held || games > held.games) posByKey.set(key, { pos, games })
  }

  // --- Defence ------------------------------------------------------------
  // Range factor: chances handled per game. It is the oldest fielding metric
  // there is and it is crude — it rewards playing behind a staff that allows
  // contact — but it is the one defensive number available across all 120
  // years of this database, and it separates a real shortstop from a bat
  // parked at shortstop, which is the distinction the game needs.
  interface FieldAgg { g: number; po: number; a: number; e: number }
  const fieldAgg = new Map<string, FieldAgg>()
  for (const row of fielding) {
    const pos = POSITION_MAP[row['POS'] ?? '']
    if (!pos || pos === 'P') continue
    const year = num(row['yearID'])
    const era = eraFor(year)
    const franchise = franchiseOf.get(`${row['teamID']}:${year}`)
    if (!era || !franchise) continue
    const key = `${row['playerID']}:${franchise}:${era}:${pos}`
    const agg = fieldAgg.get(key) ?? { g: 0, po: 0, a: 0, e: 0 }
    agg.g += num(row['G'])
    agg.po += num(row['PO'])
    agg.a += num(row['A'])
    agg.e += num(row['E'])
    fieldAgg.set(key, agg)
  }

  // Baselines per position and era, so a 1910s catcher is judged against
  // 1910s catchers rather than against modern ones.
  const rfSamples = new Map<string, number[]>()
  for (const [key, agg] of fieldAgg) {
    if (agg.g < 50) continue
    const parts = key.split(':')
    const bucketKey = `${parts[3]}:${parts[2]}`
    const list = rfSamples.get(bucketKey) ?? []
    list.push((agg.po + agg.a) / agg.g)
    rfSamples.set(bucketKey, list)
  }
  const rfBaseline = new Map<string, { mean: number; sd: number }>()
  for (const [key, values] of rfSamples) {
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
    rfBaseline.set(key, { mean, sd: Math.max(0.05, Math.sqrt(variance)) })
  }

  /** Defensive rating in standard deviations, clamped to a sane range. */
  function defenceRating(playerId: string, franchise: string, era: string, pos: string): number {
    const agg = fieldAgg.get(`${playerId}:${franchise}:${era}:${pos}`)
    const base = rfBaseline.get(`${pos}:${era}`)
    if (!agg || !base || agg.g < 20) return 0
    const rf = (agg.po + agg.a) / agg.g
    const range = (rf - base.mean) / base.sd
    // Errors matter less than range but a stone glove should still show.
    const chances = agg.po + agg.a + agg.e
    const fieldingPct = chances > 0 ? (agg.po + agg.a) / chances : 0.97
    const hands = (fieldingPct - 0.965) / 0.02
    return Math.max(-2, Math.min(2, range * 0.75 + hands * 0.25))
  }

  // Aggregate every season a player spent with one franchise in one era.
  interface BatAgg {
    playerId: string; name: string; franchise: string; era: string
    ab: number; h: number; bb: number; hbp: number; sf: number; sh: number
    doubles: number; triples: number; hr: number; sb: number
    positions: Map<string, number>
    yearSum: number; yearWeight: number
  }
  const batAgg = new Map<string, BatAgg>()

  for (const row of batting) {
    const year = num(row['yearID'])
    const era = eraFor(year)
    const franchise = franchiseOf.get(`${row['teamID']}:${year}`)
    if (!era || !franchise || !keep.has(franchise)) continue

    const name = nameById.get(row['playerID'] ?? '')
    if (!name) continue

    const pos = posByKey.get(`${row['playerID']}:${year}`)?.pos
    if (!pos || pos === 'P') continue

    const key = `${row['playerID']}:${franchise}:${era}`
    let agg = batAgg.get(key)
    if (!agg) {
      agg = {
        playerId: row['playerID'] ?? '', name, franchise, era,
        ab: 0, h: 0, bb: 0, hbp: 0, sf: 0, sh: 0,
        doubles: 0, triples: 0, hr: 0, sb: 0,
        positions: new Map(), yearSum: 0, yearWeight: 0,
      }
      batAgg.set(key, agg)
    }

    const games = num(row['G'])
    agg.ab += num(row['AB'])
    agg.h += num(row['H'])
    agg.bb += num(row['BB'])
    agg.hbp += num(row['HBP'])
    agg.sf += num(row['SF'])
    agg.sh += num(row['SH'])
    agg.doubles += num(row['2B'])
    agg.triples += num(row['3B'])
    agg.hr += num(row['HR'])
    agg.sb += num(row['SB'])
    agg.positions.set(pos, (agg.positions.get(pos) ?? 0) + games)
    agg.yearSum += year * Math.max(1, games)
    agg.yearWeight += Math.max(1, games)
  }

  const batters: Card[] = []
  for (const agg of batAgg.values()) {
    const pa = agg.ab + agg.bb + agg.hbp + agg.sf + agg.sh
    if (pa < MIN_PA || agg.ab === 0) continue

    const singles = agg.h - agg.doubles - agg.triples - agg.hr
    const tb = singles + 2 * agg.doubles + 3 * agg.triples + 4 * agg.hr

    const avg = agg.h / agg.ab
    const obp = (agg.h + agg.bb + agg.hbp) / pa
    const slg = tb / agg.ab

    // Most-played position across the stint, and its midpoint season.
    const pos = [...agg.positions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    if (!pos) continue
    const year = Math.round(agg.yearSum / agg.yearWeight)

    const def = defenceRating(agg.playerId, agg.franchise, agg.era, pos)

    batters.push({
      name: agg.name,
      franchise: agg.franchise,
      era: agg.era,
      position: pos,
      year,
      stats: [
        avg.toFixed(3), obp.toFixed(3), slg.toFixed(3),
        agg.hr, agg.sb, def.toFixed(2),
        // Real home-run rate. Estimating it from isolated power treats doubles
        // and triples as homers, which overstated the 1927 Yankees by 120.
        (agg.hr / agg.ab).toFixed(4),
      ],
      playingTime: pa,
    })
  }

  interface PitAgg {
    name: string; franchise: string; era: string
    outs: number; er: number; h: number; bb: number; so: number; w: number
    games: number; starts: number
    yearSum: number; yearWeight: number
  }
  const pitAgg = new Map<string, PitAgg>()

  for (const row of pitching) {
    const year = num(row['yearID'])
    const era = eraFor(year)
    const franchise = franchiseOf.get(`${row['teamID']}:${year}`)
    if (!era || !franchise || !keep.has(franchise)) continue

    const name = nameById.get(row['playerID'] ?? '')
    if (!name) continue

    const key = `${row['playerID']}:${franchise}:${era}`
    let agg = pitAgg.get(key)
    if (!agg) {
      agg = {
        name, franchise, era,
        outs: 0, er: 0, h: 0, bb: 0, so: 0, w: 0,
        games: 0, starts: 0, yearSum: 0, yearWeight: 0,
      }
      pitAgg.set(key, agg)
    }

    const games = num(row['G'])
    agg.outs += num(row['IPouts'])
    agg.er += num(row['ER'])
    agg.h += num(row['H'])
    agg.bb += num(row['BB'])
    agg.so += num(row['SO'])
    agg.w += num(row['W'])
    agg.games += games
    agg.starts += num(row['GS'])
    agg.yearSum += year * Math.max(1, games)
    agg.yearWeight += Math.max(1, games)
  }

  const pitchers: Card[] = []
  for (const agg of pitAgg.values()) {
    const ip = agg.outs / 3
    const isReliever = agg.starts < agg.games / 2
    if (ip < (isReliever ? MIN_RELIEF_IP : MIN_IP)) continue

    const eraValue = (agg.er * 9) / ip
    if (eraValue <= 0) continue

    pitchers.push({
      name: agg.name,
      franchise: agg.franchise,
      era: agg.era,
      position: isReliever ? 'RP' : 'SP',
      year: Math.round(agg.yearSum / agg.yearWeight),
      stats: [eraValue.toFixed(2), agg.w, agg.so, ((agg.h + agg.bb) / ip).toFixed(2)],
      playingTime: ip,
    })
  }

  // One shared name set across both tables. Baseball has genuine homonyms —
  // Woody Williams the 1940s second baseman and Woody Williams the pitcher are
  // different people — but the game keys players by name, so letting both in
  // would mean the same card could be drafted twice.
  const usedNames = new Set<string>()
  const keptBatters = bucket(batters, usedNames)
  const keptPitchers = bucket(pitchers, usedNames)

  // Re-center defence on the drafted population, per position.
  //
  // The raw z-score compares a player to everyone who ever played the position,
  // but the pool the game draws from is the best three bats per franchise, era,
  // and position — a group that fields better than the general population. Left
  // raw, every roster collected a free defensive bonus and defence stopped
  // being a trade-off. Centering on the draftable pool makes it zero-sum: a
  // good glove helps, a bad one hurts, and an average one is worth nothing.
  const defByPosition = new Map<string, number[]>()
  for (const card of keptBatters) {
    const list = defByPosition.get(card.position) ?? []
    list.push(Number(card.stats[5]))
    defByPosition.set(card.position, list)
  }
  const defMean = new Map<string, number>()
  for (const [pos, values] of defByPosition) {
    defMean.set(pos, values.reduce((s, v) => s + v, 0) / values.length)
  }
  for (const card of keptBatters) {
    const centered = Number(card.stats[5]) - (defMean.get(card.position) ?? 0)
    card.stats[5] = centered.toFixed(2)
  }

  const usedFranchises = new Set(
    [...keptBatters, ...keptPitchers].map((c) => c.franchise),
  )

  // Name each franchise/era from the median season of the players actually
  // offered there, not from an era-wide vote. The Expos became the Nationals in
  // 2005, mid-era, so a vote across 2000-2009 mislabels half the decade.
  const yearsByBucket = new Map<string, number[]>()
  for (const card of [...keptBatters, ...keptPitchers]) {
    const key = `${card.franchise}:${card.era}`
    const list = yearsByBucket.get(key) ?? []
    list.push(card.year)
    yearsByBucket.set(key, list)
  }

  const eraNames = new Map<string, string>()
  for (const [key, years] of yearsByBucket) {
    const id = key.split(':')[0] ?? ''
    years.sort((a, b) => a - b)
    const median = years[Math.floor(years.length / 2)]
    if (median === undefined) continue
    // Walk outward if that exact season is missing (strike years, relocations).
    for (let offset = 0; offset <= 6; offset += 1) {
      const hit =
        nameByYear.get(`${id}:${median - offset}`) ?? nameByYear.get(`${id}:${median + offset}`)
      if (hit) {
        eraNames.set(key, hit)
        break
      }
    }
  }
  const franchiseLines = [...usedFranchises]
    .sort()
    .map((id) => {
      const [c1, c2] = COLORS[id] ?? ['#3b4252', '#8d95a5']
      const full = franchiseName.get(id) ?? id
      const short = full.split(' ').slice(-1)[0] ?? id
      return `  { id: '${id}', name: ${JSON.stringify(full)}, short: ${JSON.stringify(short)}, colors: ['${c1}', '${c2}'] },`
    })
    .join('\n')

  // Only emit a historical name where it differs from the modern one; the rest
  // is noise in the generated file.
  const eraNameLines = [...eraNames.entries()]
    .filter(([key, name]) => {
      const id = key.split(':')[0] ?? ''
      return usedFranchises.has(id) && name !== franchiseName.get(id)
    })
    .sort()
    .map(([key, name]) => `  ${JSON.stringify(key)}: ${JSON.stringify(name)},`)
    .join('\n')

  const file = `/**
 * GENERATED FILE — do not edit by hand. Run \`npm run import:lahman\`.
 *
 * Source: the Lahman Baseball Database / Chadwick Baseball Databank.
 *   https://sabr.org/lahman-database/
 * Licensed CC BY-SA 3.0. Copyright (C) 1996-2021 Sean Lahman; most data
 * provided by the Chadwick Baseball Bureau. Derived data inherits ShareAlike —
 * see DATA-LICENSE.md.
 *
 * Generated ${new Date().toISOString().slice(0, 10)}.
 * ${keptBatters.length} batter seasons, ${keptPitchers.length} pitcher seasons,
 * ${usedFranchises.size} franchises, best ${PER_BUCKET} per franchise/era/position.
 */

import type { Franchise } from '@/engine/types'
import { parsePlayers } from '../parse'

export const GENERATED_FRANCHISES: Franchise[] = [
${franchiseLines}
]

/**
 * What a club was called during a given era, keyed \`franchise:era\`. Only
 * entries that differ from the modern name are listed.
 */
export const ERA_NAMES: Record<string, string> = {
${eraNameLines}
}

const BATTERS = \`
${keptBatters.map(toRow).join('\n')}
\`

const PITCHERS = \`
${keptPitchers.map(toRow).join('\n')}
\`

export const GENERATED_PLAYERS = [
  ...parsePlayers(BATTERS, { stats: ['avg', 'obp', 'slg', 'hr', 'sb', 'def', 'hrRate'] }),
  ...parsePlayers(PITCHERS, { stats: ['era', 'w', 'so', 'whip'] }),
]
`

  writeFileSync(OUT, file, 'utf8')
  console.log(`Wrote ${OUT}`)
  console.log(
    `  ${keptBatters.length} batters, ${keptPitchers.length} pitchers, ${usedFranchises.size} franchises`,
  )
}

/**
 * Keep the N players who logged the most time at each franchise/era/position,
 * one card per player so the same name cannot be drafted twice. Ranking by
 * playing time rather than production is what makes a spin risky: a franchise
 * that was bad in a decade contributes the players it actually ran out there.
 */
function bucket(cards: Card[], usedNames: Set<string>): Card[] {
  const groups = new Map<string, Card[]>()
  for (const card of cards) {
    const key = `${card.franchise}:${card.era}:${card.position}`
    const list = groups.get(key) ?? []
    list.push(card)
    groups.set(key, list)
  }

  const out: Card[] = []
  for (const list of groups.values()) {
    list.sort((a, b) => b.playingTime - a.playingTime)
    let kept = 0
    for (const card of list) {
      if (usedNames.has(card.name)) continue
      usedNames.add(card.name)
      out.push(card)
      if (++kept >= PER_BUCKET) break
    }
  }
  return out
}

function toRow(card: Card): string {
  return [card.name, card.franchise, card.era, card.position, card.year, ...card.stats].join('|')
}

main()
