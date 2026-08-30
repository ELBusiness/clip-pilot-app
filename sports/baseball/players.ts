/**
 * Baseball roster pack.
 *
 * The bulk of this is generated from the Lahman / Chadwick Baseball Databank by
 * `npm run import:lahman` — real season lines for the best three players at
 * every franchise, era, and position. That depth is the point: a hand-curated
 * pack can only hold a few hundred famous names, which leaves most spins
 * offering one or two players and no real choice.
 *
 * Added on top are Negro Leagues players. MLB recognized those records in 2020,
 * but the 2021 databank predates their integration, so they are carried here by
 * hand. Their figures follow the published Seamheads/Negro Leagues Database
 * numbers and are less complete than post-1920 AL/NL bookkeeping.
 *
 * All of them sit in the 1920s bucket even where a card names a season either
 * side of it. There are only eight, and splitting eight players across three
 * decades would leave a spin offering one or two names — a thin spin reads as
 * the game being broken rather than as a hard draw.
 *
 * Columns: name | franchise | era | positions | year | AVG | OBP | SLG | HR | SB | DEF | HR/AB
 *
 * Negro Leagues rows carry DEF 0.00 — those leagues' fielding records are not
 * in the databank, so they are treated as league-average gloves rather than
 * having a number invented for them.
 */

import type { Franchise, Era } from '@/engine/types'
import { parsePlayers } from '../parse'
import { ERA_NAMES, ERA_YEARS, GENERATED_FRANCHISES, GENERATED_PLAYERS } from './players.generated'

export const ERAS: Era[] = [
  { id: 'e1900', label: '1900s', startYear: 1901, endYear: 1909 },
  { id: 'e1910', label: '1910s', startYear: 1910, endYear: 1919 },
  { id: 'e1920', label: '1920s', startYear: 1920, endYear: 1929 },
  { id: 'e1930', label: '1930s', startYear: 1930, endYear: 1939 },
  { id: 'e1940', label: '1940s', startYear: 1940, endYear: 1949 },
  { id: 'e1950', label: '1950s', startYear: 1950, endYear: 1959 },
  { id: 'e1960', label: '1960s', startYear: 1960, endYear: 1969 },
  { id: 'e1970', label: '1970s', startYear: 1970, endYear: 1979 },
  { id: 'e1980', label: '1980s', startYear: 1980, endYear: 1989 },
  { id: 'e1990', label: '1990s', startYear: 1990, endYear: 1999 },
  { id: 'e2000', label: '2000s', startYear: 2000, endYear: 2009 },
  { id: 'e2010', label: '2010s', startYear: 2010, endYear: 2019 },
  // No 2020s. The open databank this pack is built from stops at 2020, and
  // that lone season is the 60-game pandemic year — roughly 220 plate
  // appearances for a regular, which is noise rather than a career. Drop a
  // newer databank into data/lahman and re-run the importer and the decade
  // fills itself; the era id is derived from the year, so only this line and
  // the matching test need to come back.
]

/**
 * What a club was called at the time. The databank resolves every season to the
 * modern franchise, so without this the reel offers Andre Dawson under
 * "Washington Nationals, 1970-1978" — and a game whose whole appeal is history
 * loses the Brooklyn Dodgers, the Philadelphia Athletics and the St. Louis
 * Browns entirely.
 *
 * One name is chosen per franchise and era, from the median season of the
 * players actually offered there. A club that renamed mid-era (the Expos became
 * the Nationals in 2005) therefore shows one label for the whole bucket, so a
 * few players sit under the neighbouring name. Splitting those into separate
 * franchises would fix it and is the obvious next step if it grates.
 */
export function franchiseNameFor(
  franchise: Franchise | undefined,
  eraId: string | undefined,
): string {
  if (!franchise) return ''
  return (eraId && ERA_NAMES[`${franchise.id}:${eraId}`]) || franchise.name
}

/** Short label for a roster card, e.g. "Expos" rather than "Nationals". */
export function franchiseShortFor(
  franchise: Franchise | undefined,
  eraId: string | undefined,
): string {
  if (!franchise) return ''
  const full = franchiseNameFor(franchise, eraId)
  return full === franchise.name ? franchise.short : (full.split(' ').slice(-1)[0] ?? full)
}

/**
 * How to label a decade for one franchise.
 *
 * A club that played the whole decade gets the decade: "1910s". One that
 * arrived or folded partway through gets the years it was actually there:
 * "1977-1979" for the Mariners' first seasons. This reads off the real
 * schedule rather than the seasons of the players on offer — those cluster
 * mid-decade, which made every label look like a partial range.
 */
export function eraLabelFor(
  franchiseId: string | undefined,
  era: Era | undefined,
): string {
  if (!era) return ''
  if (!franchiseId) return era.label

  const span = ERA_YEARS[`${franchiseId}:${era.id}`]
  if (!span) return era.label

  const [first, last] = span
  const missing = first - era.startYear + (era.endYear - last)
  // Two absent seasons is a rounding error; three means the club really was
  // not there for much of the decade.
  if (missing < 3) return era.label
  return first === last ? `${first}` : `${first}-${last}`
}

export const FRANCHISES: Franchise[] = [
  ...GENERATED_FRANCHISES,
  { id: 'NLG', name: 'Negro Leagues', short: 'Negro Lgs', colors: ['#1b1b1b', '#c9a227'] },
]

const NEGRO_LEAGUES = `
Josh Gibson|NLG|e1920|C|1937|.372|.458|.718|165|22|0.00|0.0300
Oscar Charleston|NLG|e1920|CF|1925|.363|.449|.614|143|206|0.00|0.0260
Buck Leonard|NLG|e1920|1B|1938|.345|.437|.590|127|30|0.00|0.0231
Turkey Stearnes|NLG|e1920|CF|1928|.348|.410|.616|186|128|0.00|0.0338
Cool Papa Bell|NLG|e1920|CF|1929|.325|.395|.446|55|285|0.00|0.0100
Mule Suttles|NLG|e1920|1B|1926|.329|.393|.615|179|61|0.00|0.0325
Pop Lloyd|NLG|e1920|SS|1919|.343|.412|.451|33|175|0.00|0.0060
Judy Johnson|NLG|e1920|3B|1929|.301|.362|.408|24|66|0.00|0.0044
`

export const PLAYERS = [
  ...GENERATED_PLAYERS,
  ...parsePlayers(NEGRO_LEAGUES, { stats: ['avg', 'obp', 'slg', 'hr', 'sb', 'def', 'hrRate'] }),
]
