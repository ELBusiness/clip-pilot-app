/**
 * Roster pack parser.
 *
 * Player data is authored as pipe-delimited tables rather than object literals.
 * A few hundred stat lines are far easier to audit, diff, and correct in
 * columns than in nested braces, and the same tables are what the Lahman
 * importer emits — so generated data and hand-authored data stay one format.
 */

import type { Player } from '@/engine/types'

export interface TableSpec {
  /** Stat column names, in table order, following the fixed leading columns. */
  stats: string[]
}

/**
 * Rows are: name | franchiseId | eraId | positions | peakYear | ...stats
 * Positions are slash-separated. Blank lines and `#` comments are skipped.
 */
export function parsePlayers(table: string, spec: TableSpec): Player[] {
  const players: Player[] = []
  const seen = new Set<string>()

  for (const raw of table.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    const cells = line.split('|').map((c) => c.trim())
    const [name, franchiseId, eraId, positions, peakYear, ...stats] = cells

    if (!name || !franchiseId || !eraId || !positions || !peakYear) {
      throw new Error(`Malformed player row: ${line}`)
    }
    if (stats.length !== spec.stats.length) {
      throw new Error(
        `Row "${name}" has ${stats.length} stats, expected ${spec.stats.length}: ${line}`,
      )
    }

    const id = slugify(name)
    if (seen.has(id)) {
      throw new Error(`Duplicate player id "${id}" (${name})`)
    }
    seen.add(id)

    const parsed: Record<string, number> = {}
    spec.stats.forEach((key, i) => {
      const value = Number(stats[i])
      if (!Number.isFinite(value)) {
        throw new Error(`Row "${name}" has non-numeric ${key}: "${stats[i]}"`)
      }
      parsed[key] = value
    })

    players.push({
      id,
      name,
      franchiseId,
      eraId,
      positions: positions.split('/').map((p) => p.trim()).filter(Boolean),
      year: Number(peakYear),
      stats: parsed,
    })
  }

  return players
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Format a rate stat the way baseball writes it: .344, not 0.344. */
export function pct3(value: number): string {
  return value.toFixed(3).replace(/^0\./, '.')
}
