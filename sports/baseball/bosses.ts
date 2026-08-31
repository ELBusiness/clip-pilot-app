/**
 * The teams worth beating.
 *
 * Grading a season against "116 wins" is grading it against a number. Grading
 * it against the 1927 Yankees is the argument every baseball fan has already
 * had, and it gives the win total a second consequence: you reach October or
 * you do not.
 *
 * Every record here is the real one, derived from the same databank the roster
 * pack comes from — team runs scored are the sum of their batters' runs, runs
 * allowed and decisions the sum of their pitchers'. Modern seasons reproduce
 * the historical record exactly; two deadball entries come out a single run or
 * win different, a known quirk of early-era bookkeeping, so those two carry the
 * canonical figures instead.
 */

import type { Opponent } from '@/engine/series'
import { REF, leagueEnv } from './era'

interface BossSeason {
  id: string
  year: number
  name: string
  note: string
  wins: number
  losses: number
  runsScored: number
  runsAllowed: number
}

const SEASONS: BossSeason[] = [
  { id: 'nya1927', year: 1927, name: 'Yankees', note: 'Murderers’ Row. Ruth hit 60.', wins: 110, losses: 44, runsScored: 975, runsAllowed: 599 },
  { id: 'chn1906', year: 1906, name: 'Cubs', note: 'The best winning percentage ever played.', wins: 116, losses: 36, runsScored: 705, runsAllowed: 381 },
  { id: 'sea2001', year: 2001, name: 'Mariners', note: 'Tied the wins record, in a 162-game season.', wins: 116, losses: 46, runsScored: 927, runsAllowed: 627 },
  { id: 'nya1939', year: 1939, name: 'Yankees', note: 'DiMaggio’s best, and the deepest of the dynasty.', wins: 106, losses: 45, runsScored: 967, runsAllowed: 556 },
  { id: 'nya1998', year: 1998, name: 'Yankees', note: 'No stars at the top, no holes anywhere.', wins: 114, losses: 48, runsScored: 965, runsAllowed: 656 },
  { id: 'cin1975', year: 1975, name: 'Reds', note: 'The Big Red Machine, at full power.', wins: 108, losses: 54, runsScored: 840, runsAllowed: 586 },
  { id: 'bal1970', year: 1970, name: 'Orioles', note: 'Three twenty-game winners and Brooks Robinson.', wins: 108, losses: 54, runsScored: 792, runsAllowed: 574 },
  { id: 'nyn1986', year: 1986, name: 'Mets', note: 'Gooden, Carter, Strawberry, and no manners.', wins: 108, losses: 54, runsScored: 783, runsAllowed: 578 },
  { id: 'pha1929', year: 1929, name: 'Athletics', note: 'Foxx, Simmons, Grove — the team that ended Ruth’s.', wins: 104, losses: 46, runsScored: 901, runsAllowed: 616 },
  { id: 'pit1909', year: 1909, name: 'Pirates', note: 'Honus Wagner’s peak, and 110 wins.', wins: 110, losses: 42, runsScored: 701, runsAllowed: 448 },
  { id: 'bos2018', year: 2018, name: 'Red Sox', note: 'Betts, Martinez, and 108 wins.', wins: 108, losses: 54, runsScored: 876, runsAllowed: 647 },
  { id: 'nya1961', year: 1961, name: 'Yankees', note: 'Maris hit 61, Mantle hit 54.', wins: 109, losses: 53, runsScored: 827, runsAllowed: 612 },
]

/**
 * Their run rates, moved into the game's own scoring environment.
 *
 * A 1906 team scored 4.7 runs a game in a league that averaged far fewer than
 * a modern one; comparing that to a drafted roster scored in the reference
 * environment would make every deadball club look feeble. Both rates are
 * scaled by the same factor, which preserves the run differential that decides
 * how good they actually were.
 */
function toOpponent(season: BossSeason): Opponent {
  const games = season.wins + season.losses
  const scale = REF.era / leagueEnv(season.year).era
  return {
    id: season.id,
    name: `${season.year} ${season.name}`,
    record: `${season.wins}-${season.losses}`,
    note: season.note,
    offense: (season.runsScored / games) * scale,
    defense: (season.runsAllowed / games) * scale,
  }
}

export const BOSSES: Opponent[] = SEASONS.map(toOpponent)

/** The raw seasons, for tests that check the shipped records against history. */
export const BOSS_SEASONS = SEASONS
