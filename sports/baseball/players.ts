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
 * Columns: name | franchise | era | positions | year | AVG | OBP | SLG | HR | SB | DEF | HR/AB
 *
 * Negro Leagues rows carry DEF 0.00 — those leagues' fielding records are not
 * in the databank, so they are treated as league-average gloves rather than
 * having a number invented for them.
 */

import type { Franchise, Era } from '@/engine/types'
import { parsePlayers } from '../parse'
import { GENERATED_FRANCHISES, GENERATED_PLAYERS } from './players.generated'

export const ERAS: Era[] = [
  { id: 'e20s', label: '1901-1939', startYear: 1901, endYear: 1939 },
  { id: 'e40s', label: '1940s-50s', startYear: 1940, endYear: 1959 },
  { id: 'e60s', label: '1960s-70s', startYear: 1960, endYear: 1979 },
  { id: 'e80s', label: '1980s-90s', startYear: 1980, endYear: 1999 },
  { id: 'e00s', label: '2000s', startYear: 2000, endYear: 2009 },
  { id: 'e10s', label: '2010s-20s', startYear: 2010, endYear: 2025 },
]

export const FRANCHISES: Franchise[] = [
  ...GENERATED_FRANCHISES,
  { id: 'NLG', name: 'Negro Leagues', short: 'Negro Lgs', colors: ['#1b1b1b', '#c9a227'] },
]

const NEGRO_LEAGUES = `
Josh Gibson|NLG|e20s|C|1937|.372|.458|.718|165|22|0.00|0.0300
Oscar Charleston|NLG|e20s|CF|1925|.363|.449|.614|143|206|0.00|0.0260
Buck Leonard|NLG|e20s|1B|1938|.345|.437|.590|127|30|0.00|0.0231
Turkey Stearnes|NLG|e20s|CF|1928|.348|.410|.616|186|128|0.00|0.0338
Cool Papa Bell|NLG|e20s|CF|1929|.325|.395|.446|55|285|0.00|0.0100
Mule Suttles|NLG|e20s|1B|1926|.329|.393|.615|179|61|0.00|0.0325
Pop Lloyd|NLG|e20s|SS|1919|.343|.412|.451|33|175|0.00|0.0060
Judy Johnson|NLG|e20s|3B|1929|.301|.362|.408|24|66|0.00|0.0044
`

export const PLAYERS = [
  ...GENERATED_PLAYERS,
  ...parsePlayers(NEGRO_LEAGUES, { stats: ['avg', 'obp', 'slg', 'hr', 'sb', 'def', 'hrRate'] }),
]
