/**
 * Lahman / Chadwick Baseball Databank importer.
 *
 * The seed pack in `sports/baseball/players.ts` is hand-curated career lines:
 * enough to make the game playable and balanced, but not sourced season data.
 * This script replaces it with the real thing — the Lahman database, which is
 * free, maintained by SABR, licensed CC BY-SA 3.0, and covers 1871 to the
 * present.
 *
 * Usage:
 *   1. Download and unzip the database:
 *        https://sabr.org/lahman-database/
 *      Put People.csv, Batting.csv, Pitching.csv, Fielding.csv, and
 *      Teams.csv in data/lahman/.
 *   2. npm run import:lahman
 *
 * Output is `sports/baseball/players.generated.ts`, in the same pipe-delimited
 * table format the seed pack uses, so nothing downstream has to change. Import
 * it from the ruleset in place of the seed pack once generated.
 *
 * ATTRIBUTION: the Lahman database is CC BY-SA 3.0. Shipping data derived from
 * it means crediting Sean Lahman and licensing the derived data ShareAlike.
 * That obligation is on the generated file, which is why it is gitignored by
 * default rather than committed without a decision.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), 'data', 'lahman')
const OUT = join(process.cwd(), 'sports', 'baseball', 'players.generated.ts')

/** Minimum playing time for a season to count as a draftable card. */
const MIN_PA = 400
const MIN_IP = 120
/** Players kept per franchise/era/position, best first. */
const PER_BUCKET = 4

interface Row {
  [column: string]: string
}

function readCsv(name: string): Row[] {
  const path = join(DATA_DIR, name)
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}\nDownload the database from https://sabr.org/lahman-database/ and unzip the CSVs into data/lahman/.`,
    )
  }
  const text = readFileSync(path, 'utf8')
  const lines = text.split(/\r?\n/).filter(Boolean)
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

/** Minimal RFC 4180 parsing — Lahman quotes names containing commas. */
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
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      out.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  out.push(field)
  return out
}

const num = (value: string | undefined): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Map a season to the era buckets the sport pack defines. */
function eraFor(year: number): string | null {
  if (year >= 1901 && year <= 1939) return 'e20s'
  if (year <= 1959) return 'e40s'
  if (year <= 1979) return 'e60s'
  if (year <= 1999) return 'e80s'
  if (year <= 2009) return 'e00s'
  if (year <= 2030) return 'e10s'
  return null
}

/**
 * Lahman franchise IDs mostly match the pack's, but relocated clubs carry
 * their historical code. Map those onto the modern franchise the pack knows.
 */
const FRANCHISE_ALIASES: Record<string, string> = {
  BRO: 'LAD', LAN: 'LAD', NYA: 'NYY', BOS: 'BOS', BOA: 'BOS',
  SFN: 'SFG', NY1: 'SFG', SLN: 'STL', CHN: 'CHC', CHA: 'CHW',
  ATL: 'ATL', ML1: 'ATL', BSN: 'ATL', CIN: 'CIN', DET: 'DET',
  PIT: 'PIT', BAL: 'BAL', PHA: 'OAK', KC1: 'OAK', OAK: 'OAK',
  HOU: 'HOU', SEA: 'SEA', PHI: 'PHI', MIN: 'MIN', WS1: 'WSH',
  CLE: 'CLE', TEX: 'TEX', NYN: 'NYM', TOR: 'TOR', SDN: 'SDP',
  MIL: 'MIL', ANA: 'LAA', CAL: 'LAA', LAA: 'LAA', ARI: 'ARI',
  WAS: 'WSN', MON: 'MON', KCA: 'KCR', COL: 'COL',
}

const POSITION_MAP: Record<string, string> = {
  C: 'C', '1B': '1B', '2B': '2B', '3B': '3B', SS: 'SS',
  LF: 'LF', CF: 'CF', RF: 'RF', OF: 'OF', P: 'SP',
}

function main(): void {
  console.log('Reading Lahman CSVs from', DATA_DIR)
  const people = readCsv('People.csv')
  const batting = readCsv('Batting.csv')
  const pitching = readCsv('Pitching.csv')
  const fielding = readCsv('Fielding.csv')

  const nameById = new Map<string, string>()
  for (const row of people) {
    const id = row['playerID'] ?? ''
    nameById.set(id, `${row['nameFirst'] ?? ''} ${row['nameLast'] ?? ''}`.trim())
  }

  // Primary position per player-season: wherever they played most games.
  const posByKey = new Map<string, { pos: string; games: number }>()
  for (const row of fielding) {
    const key = `${row['playerID']}:${row['yearID']}`
    const pos = POSITION_MAP[row['POS'] ?? '']
    if (!pos) continue
    const games = num(row['G'])
    const held = posByKey.get(key)
    if (!held || games > held.games) posByKey.set(key, { pos, games })
  }

  interface Card {
    name: string
    franchise: string
    era: string
    positions: string
    year: number
    stats: number[]
    quality: number
  }

  const batters: Card[] = []
  for (const row of batting) {
    const year = num(row['yearID'])
    const era = eraFor(year)
    const franchise = FRANCHISE_ALIASES[row['teamID'] ?? '']
    if (!era || !franchise) continue

    const ab = num(row['AB'])
    const bb = num(row['BB'])
    const hbp = num(row['HBP'])
    const sf = num(row['SF'])
    const sh = num(row['SH'])
    const pa = ab + bb + hbp + sf + sh
    if (pa < MIN_PA) continue

    const h = num(row['H'])
    const doubles = num(row['2B'])
    const triples = num(row['3B'])
    const hr = num(row['HR'])
    const singles = h - doubles - triples - hr
    const tb = singles + 2 * doubles + 3 * triples + 4 * hr

    const avg = ab > 0 ? h / ab : 0
    const obp = pa > 0 ? (h + bb + hbp) / pa : 0
    const slg = ab > 0 ? tb / ab : 0

    const pos = posByKey.get(`${row['playerID']}:${year}`)?.pos
    if (!pos || pos === 'SP') continue

    const name = nameById.get(row['playerID'] ?? '')
    if (!name) continue

    batters.push({
      name,
      franchise,
      era,
      positions: pos,
      year,
      stats: [round(avg, 3), round(obp, 3), round(slg, 3), hr, num(row['SB'])],
      // OPS is a good enough sort key for picking the best seasons per bucket.
      quality: obp + slg,
    })
  }

  const pitchers: Card[] = []
  for (const row of pitching) {
    const year = num(row['yearID'])
    const era = eraFor(year)
    const franchise = FRANCHISE_ALIASES[row['teamID'] ?? '']
    if (!era || !franchise) continue

    const outs = num(row['IPouts'])
    const ip = outs / 3
    if (ip < MIN_IP) continue

    const earned = num(row['ER'])
    const eraValue = ip > 0 ? (earned * 9) / ip : 0
    if (eraValue <= 0) continue

    const whip = ip > 0 ? (num(row['H']) + num(row['BB'])) / ip : 0
    const name = nameById.get(row['playerID'] ?? '')
    if (!name) continue

    // Relievers in this data set are the low-innings, high-appearance arms.
    const isReliever = num(row['GS']) < num(row['G']) / 2

    pitchers.push({
      name,
      franchise,
      era,
      positions: isReliever ? 'RP' : 'SP',
      year,
      stats: [round(eraValue, 2), num(row['W']), num(row['SO']), round(whip, 2)],
      quality: -eraValue,
    })
  }

  const batterTable = bucket(batters).map(toRow).join('\n')
  const pitcherTable = bucket(pitchers).map(toRow).join('\n')

  const file = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by \`npm run import:lahman\` from the Lahman Baseball Database.
 * Source: https://sabr.org/lahman-database/
 * Data licensed CC BY-SA 3.0, (c) Sean Lahman. Derived data inherits ShareAlike.
 *
 * Generated ${new Date().toISOString().slice(0, 10)}.
 */

import { parsePlayers } from '../parse'

const BATTERS = \`
${batterTable}
\`

const PITCHERS = \`
${pitcherTable}
\`

export const GENERATED_PLAYERS = [
  ...parsePlayers(BATTERS, { stats: ['avg', 'obp', 'slg', 'hr', 'sb'] }),
  ...parsePlayers(PITCHERS, { stats: ['era', 'w', 'so', 'whip'] }),
]
`

  writeFileSync(OUT, file, 'utf8')
  console.log(
    `Wrote ${OUT}\n  ${batterTable.split('\n').length} batters, ${pitcherTable.split('\n').length} pitchers`,
  )
  console.log('Import GENERATED_PLAYERS from sports/baseball/index.ts to use it.')
}

/** Keep the best N seasons per franchise/era/position so the reel stays curated. */
function bucket<T extends { franchise: string; era: string; positions: string; quality: number; name: string }>(
  cards: T[],
): T[] {
  const groups = new Map<string, T[]>()
  for (const card of cards) {
    const key = `${card.franchise}:${card.era}:${card.positions}`
    const list = groups.get(key) ?? []
    list.push(card)
    groups.set(key, list)
  }

  const out: T[] = []
  const usedNames = new Set<string>()
  for (const list of groups.values()) {
    list.sort((a, b) => b.quality - a.quality)
    let kept = 0
    for (const card of list) {
      // One card per player; the parser rejects duplicate ids.
      if (usedNames.has(card.name)) continue
      usedNames.add(card.name)
      out.push(card)
      if (++kept >= PER_BUCKET) break
    }
  }
  return out
}

function toRow(card: { name: string; franchise: string; era: string; positions: string; year: number; stats: number[] }): string {
  const stats = card.stats.map((n) => (Number.isInteger(n) ? n : n.toFixed(n < 1 ? 3 : 2)))
  return [card.name, card.franchise, card.era, card.positions, card.year, ...stats].join('|')
}

function round(value: number, places: number): number {
  const f = Math.pow(10, places)
  return Math.round(value * f) / f
}

main()
