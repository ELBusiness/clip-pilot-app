/**
 * American football — the 17-0 game.
 *
 * Football resists the "add up the stat line" approach harder than any other
 * sport here, because the positions do not share a currency: a quarterback's
 * passer rating and a cornerback's interception total are not addable, and a
 * left tackle produces no counting stats at all.
 *
 * So each player is scored against a baseline for his own position, and those
 * position scores are combined with weights that reflect real positional
 * value. Quarterback carries roughly 40% of offensive outcome on its own,
 * which is why a roster with a legendary QB and nothing else still wins games,
 * and why an elite running back moves the needle far less than his highlight
 * reel suggests. Getting that hierarchy right is the difference between a
 * simulation and a slot machine with extra steps.
 *
 * Linemen are graded on All-Pro selections and career starts, the only
 * durable public record of offensive line play. Recent and ongoing careers
 * carry rounded figures.
 */

import type { CompareKey, Era, Franchise, LeagueContext, Player, RatedPlayer, RosterSlot, Ruleset, TeamRating } from '@/engine/types'
import { parsePlayers } from '../parse'

const SEASON_GAMES = 17
const LEAGUE_PPG = 22

export const ERAS: Era[] = [
  { id: 'e70s', label: '1960s-80s', startYear: 1960, endYear: 1989 },
  { id: 'e90s', label: '1990s', startYear: 1990, endYear: 1999 },
  { id: 'e00s', label: '2000s', startYear: 2000, endYear: 2009 },
  { id: 'e10s', label: '2010s-20s', startYear: 2010, endYear: 2025 },
]

export const FRANCHISES: Franchise[] = [
  { id: 'DAL', name: 'Dallas Cowboys', short: 'Cowboys', colors: ['#003594', '#869397'] },
  { id: 'SFO', name: 'San Francisco 49ers', short: '49ers', colors: ['#aa0000', '#b3995d'] },
  { id: 'PIT', name: 'Pittsburgh Steelers', short: 'Steelers', colors: ['#ffb612', '#101820'] },
  { id: 'GNB', name: 'Green Bay Packers', short: 'Packers', colors: ['#203731', '#ffb612'] },
  { id: 'NWE', name: 'New England Patriots', short: 'Patriots', colors: ['#002244', '#c60c30'] },
  { id: 'DEN', name: 'Denver Broncos', short: 'Broncos', colors: ['#fb4f14', '#002244'] },
  { id: 'MIA', name: 'Miami Dolphins', short: 'Dolphins', colors: ['#008e97', '#fc4c02'] },
  { id: 'NYG', name: 'New York Giants', short: 'Giants', colors: ['#0b2265', '#a71930'] },
  { id: 'CHI', name: 'Chicago Bears', short: 'Bears', colors: ['#0b162a', '#c83803'] },
  { id: 'BAL', name: 'Baltimore Ravens', short: 'Ravens', colors: ['#241773', '#9e7c0c'] },
  { id: 'IND', name: 'Indianapolis Colts', short: 'Colts', colors: ['#002c5f', '#a2aaad'] },
  { id: 'MIN', name: 'Minnesota Vikings', short: 'Vikings', colors: ['#4f2683', '#ffc62f'] },
  { id: 'LVR', name: 'Las Vegas Raiders', short: 'Raiders', colors: ['#000000', '#a5acaf'] },
  { id: 'KAN', name: 'Kansas City Chiefs', short: 'Chiefs', colors: ['#e31837', '#ffb81c'] },
  { id: 'SEA', name: 'Seattle Seahawks', short: 'Seahawks', colors: ['#002244', '#69be28'] },
  { id: 'PHI', name: 'Philadelphia Eagles', short: 'Eagles', colors: ['#004c54', '#a5acaf'] },
  { id: 'NOR', name: 'New Orleans Saints', short: 'Saints', colors: ['#d3bc8d', '#101820'] },
  { id: 'ATL', name: 'Atlanta Falcons', short: 'Falcons', colors: ['#a71930', '#000000'] },
  { id: 'BUF', name: 'Buffalo Bills', short: 'Bills', colors: ['#00338d', '#c60c30'] },
  { id: 'CIN', name: 'Cincinnati Bengals', short: 'Bengals', colors: ['#fb4f14', '#000000'] },
  { id: 'CLE', name: 'Cleveland Browns', short: 'Browns', colors: ['#311d00', '#ff3c00'] },
  { id: 'DET', name: 'Detroit Lions', short: 'Lions', colors: ['#0076b6', '#b0b7bc'] },
  { id: 'HOU', name: 'Houston Texans', short: 'Texans', colors: ['#03202f', '#a71930'] },
  { id: 'TEN', name: 'Tennessee Titans', short: 'Titans', colors: ['#0c2340', '#4b92db'] },
  { id: 'LAC', name: 'Los Angeles Chargers', short: 'Chargers', colors: ['#0080c6', '#ffc20e'] },
  { id: 'LAR', name: 'Los Angeles Rams', short: 'Rams', colors: ['#003594', '#ffa300'] },
  { id: 'NYJ', name: 'New York Jets', short: 'Jets', colors: ['#125740', '#000000'] },
  { id: 'TAM', name: 'Tampa Bay Buccaneers', short: 'Buccaneers', colors: ['#d50a0a', '#34302b'] },
  { id: 'CAR', name: 'Carolina Panthers', short: 'Panthers', colors: ['#0085ca', '#101820'] },
  { id: 'ARI', name: 'Arizona Cardinals', short: 'Cardinals', colors: ['#97233f', '#000000'] },
  { id: 'WAS', name: 'Washington Commanders', short: 'Commanders', colors: ['#5a1414', '#ffb612'] },
]

export const SLOTS: RosterSlot[] = [
  { id: 'QB', label: 'Quarterback', group: 'Offense', accepts: ['QB'] },
  { id: 'RB', label: 'Running Back', group: 'Offense', accepts: ['RB'] },
  { id: 'WR1', label: 'Wide Receiver', group: 'Offense', accepts: ['WR'] },
  { id: 'WR2', label: 'Wide Receiver', group: 'Offense', accepts: ['WR', 'TE'] },
  { id: 'TE', label: 'Tight End', group: 'Offense', accepts: ['TE'] },
  { id: 'OL', label: 'Offensive Line', group: 'Offense', accepts: ['OL'] },
  { id: 'EDGE', label: 'Edge Rusher', group: 'Defense', accepts: ['EDGE', 'DT'] },
  { id: 'LB', label: 'Linebacker', group: 'Defense', accepts: ['LB'] },
  { id: 'CB', label: 'Cornerback', group: 'Defense', accepts: ['CB'] },
  { id: 'S', label: 'Safety', group: 'Defense', accepts: ['S', 'CB'] },
]

// QB: name | franchise | era | pos | peak | passer rating | pass yards | pass TD | INT
const QBS = `
Tom Brady|NWE|e00s|QB|2007|97.2|89214|649|212
Peyton Manning|IND|e00s|QB|2004|96.5|71940|539|251
Joe Montana|SFO|e70s|QB|1989|92.3|40551|273|139
Dan Marino|MIA|e70s|QB|1984|86.4|61361|420|252
John Elway|DEN|e70s|QB|1987|79.9|51475|300|226
Johnny Unitas|IND|e70s|QB|1959|78.2|40239|290|253
Terry Bradshaw|PIT|e70s|QB|1978|70.9|27989|212|210
Roger Staubach|DAL|e70s|QB|1971|83.4|22700|153|109
Fran Tarkenton|MIN|e70s|QB|1975|80.4|47003|342|266
Brett Favre|GNB|e90s|QB|1995|86.0|71838|508|336
Steve Young|SFO|e90s|QB|1994|96.8|33124|232|107
Troy Aikman|DAL|e90s|QB|1993|81.6|32942|165|141
Kurt Warner|ARI|e90s|QB|1999|93.7|32344|208|128
Drew Brees|NOR|e00s|QB|2011|98.7|80358|571|243
Aaron Rodgers|GNB|e00s|QB|2011|103.6|62952|503|116
Ben Roethlisberger|PIT|e00s|QB|2007|93.5|64088|418|211
Patrick Mahomes|KAN|e10s|QB|2018|103.5|32000|250|70
Josh Allen|BUF|e10s|QB|2022|96.0|25000|190|75
Lamar Jackson|BAL|e10s|QB|2019|102.0|18000|125|45
Russell Wilson|SEA|e10s|QB|2015|100.0|43000|320|100
`

// Skill: name | franchise | era | pos | peak | yards from scrimmage | TD | efficiency | receptions
const SKILL = `
Jim Brown|CLE|e70s|RB|1963|14811|126|5.2|262
Walter Payton|CHI|e70s|RB|1977|21264|125|4.4|492
Eric Dickerson|LAR|e70s|RB|1984|15396|96|4.4|281
OJ Simpson|BUF|e70s|RB|1973|13378|76|4.7|203
Tony Dorsett|DAL|e70s|RB|1981|16293|91|4.3|398
Marcus Allen|LVR|e70s|RB|1985|17654|145|4.1|587
Barry Sanders|DET|e90s|RB|1997|18190|109|5.0|352
Emmitt Smith|DAL|e90s|RB|1995|21579|175|4.2|515
Marshall Faulk|IND|e90s|RB|2000|19154|136|4.3|767
Curtis Martin|NYJ|e90s|RB|2004|17430|100|4.0|484
LaDainian Tomlinson|LAC|e00s|RB|2006|18456|162|4.3|624
Adrian Peterson|MIN|e00s|RB|2012|17401|126|4.6|305
Derrick Henry|TEN|e10s|RB|2020|12200|110|4.7|150
Christian McCaffrey|SFO|e10s|RB|2023|10500|75|4.7|450
Jerry Rice|SFO|e90s|WR|1995|23540|208|14.8|1549
Randy Moss|MIN|e90s|WR|2007|15561|157|15.6|982
Terrell Owens|SFO|e90s|WR|2001|16178|156|14.8|1078
Cris Carter|MIN|e90s|WR|1995|14023|131|12.6|1101
Tim Brown|LVR|e90s|WR|1997|15123|105|13.7|1094
Marvin Harrison|IND|e90s|WR|2002|14624|128|13.2|1102
Michael Irvin|DAL|e90s|WR|1995|11912|65|15.9|750
Steve Largent|SEA|e70s|WR|1985|13172|101|16.0|819
Don Hutson|GNB|e70s|WR|1942|8103|105|16.4|488
Larry Fitzgerald|ARI|e00s|WR|2008|17575|122|12.2|1432
Calvin Johnson|DET|e00s|WR|2012|11683|83|15.9|731
Tyreek Hill|MIA|e10s|WR|2020|12800|88|14.5|800
Davante Adams|GNB|e10s|WR|2020|11100|96|12.5|850
Justin Jefferson|MIN|e10s|WR|2022|7100|40|15.5|450
Tony Gonzalez|ATL|e00s|TE|2004|15176|111|11.4|1325
Antonio Gates|LAC|e00s|TE|2009|11841|116|12.4|955
Shannon Sharpe|DEN|e90s|TE|1996|10060|62|12.3|815
Rob Gronkowski|NWE|e10s|TE|2011|9286|92|15.0|621
Travis Kelce|KAN|e10s|TE|2020|12100|78|12.5|950
Mike Ditka|CHI|e70s|TE|1963|5812|43|13.6|427
`

// OL: name | franchise | era | pos | peak | All-Pro selections | Pro Bowls | career starts
const LINE = `
Anthony Munoz|CIN|e70s|OL|1988|9|11|164
John Hannah|NWE|e70s|OL|1978|7|9|183
Mike Webster|PIT|e70s|OL|1980|5|9|220
Forrest Gregg|GNB|e70s|OL|1965|7|9|187
Larry Allen|DAL|e90s|OL|1996|6|11|197
Jonathan Ogden|BAL|e90s|OL|2000|4|11|176
Bruce Matthews|TEN|e90s|OL|1995|7|14|292
Orlando Pace|LAR|e90s|OL|2001|3|7|161
Walter Jones|SEA|e00s|OL|2005|4|9|180
Joe Thomas|CLE|e00s|OL|2011|6|10|167
Alan Faneca|PIT|e00s|OL|2005|6|9|201
Trent Williams|SFO|e10s|OL|2021|3|11|170
Zack Martin|DAL|e10s|OL|2016|7|9|150
Quenton Nelson|IND|e10s|OL|2019|3|6|90
`

// Defense: name | franchise | era | pos | peak | sacks | INT | tackles | All-Pro
const DEFENSE = `
Lawrence Taylor|NYG|e70s|LB|1986|132.5|9|1088|8
Deacon Jones|LAR|e70s|EDGE|1967|173.5|2|0|5
Dick Butkus|CHI|e70s|LB|1969|0|22|1020|5
Mel Blount|PIT|e70s|CB|1975|0|57|736|2
Ronnie Lott|SFO|e70s|S|1986|8.5|63|1146|6
Reggie White|PHI|e90s|EDGE|1987|198|3|1111|8
Bruce Smith|BUF|e90s|EDGE|1990|200|0|1224|8
Michael Strahan|NYG|e90s|EDGE|2001|141.5|0|854|4
Ray Lewis|BAL|e90s|LB|2000|41.5|31|2059|7
Derrick Brooks|TAM|e90s|LB|2002|13.5|25|1715|5
Junior Seau|LAC|e90s|LB|1994|56.5|18|1849|6
Deion Sanders|DAL|e90s|CB|1994|0|53|512|6
Rod Woodson|PIT|e90s|CB|1993|13.5|71|1158|6
Brian Dawkins|PHI|e90s|S|2004|26|37|1131|4
Darrelle Revis|NYJ|e00s|CB|2009|0|29|496|4
Champ Bailey|DEN|e00s|CB|2006|3|52|908|3
Charles Woodson|GNB|e00s|CB|2009|20|65|1029|3
Ed Reed|BAL|e00s|S|2004|6|64|643|5
Troy Polamalu|PIT|e00s|S|2010|12|32|783|4
Julius Peppers|CAR|e00s|EDGE|2004|159.5|11|715|3
Patrick Willis|SFO|e00s|LB|2009|20.5|8|950|5
JJ Watt|HOU|e10s|EDGE|2014|114.5|0|586|5
Aaron Donald|LAR|e10s|DT|2018|111|0|570|8
Von Miller|DEN|e10s|EDGE|2016|129.5|1|550|3
TJ Watt|PIT|e10s|EDGE|2021|108|7|450|4
Luke Kuechly|CAR|e10s|LB|2015|12.5|18|1092|5
Bobby Wagner|SEA|e10s|LB|2019|30|12|1700|6
Minkah Fitzpatrick|PIT|e10s|S|2022|2|25|550|3
Derwin James|LAC|e10s|S|2022|12|8|500|2
Jalen Ramsey|LAR|e10s|CB|2021|2|21|560|3
Richard Sherman|SEA|e10s|CB|2013|2|37|500|3
`

export const PLAYERS: Player[] = [
  ...parsePlayers(QBS, { stats: ['rating', 'passYds', 'passTd', 'int'] }),
  ...parsePlayers(SKILL, { stats: ['scrimYds', 'td', 'eff', 'rec'] }),
  ...parsePlayers(LINE, { stats: ['allPro', 'proBowl', 'starts'] }),
  ...parsePlayers(DEFENSE, { stats: ['sacks', 'defInt', 'tackles', 'defAllPro'] }),
]

const context: LeagueContext = {
  averageScore: LEAGUE_PPG,
  spread: 3.2,
  model: 'normal',
  // NFL team scoring swings roughly 10 points week to week.
  sigma: 10,
}

/**
 * Positional value weights. Quarterback dominates offensive outcome; running
 * back, despite the counting stats, moves it least.
 */
const OFFENSE_WEIGHTS: Record<string, number> = {
  QB: 0.42,
  RB: 0.10,
  WR1: 0.13,
  WR2: 0.13,
  TE: 0.09,
  OL: 0.13,
}

const DEFENSE_WEIGHTS: Record<string, number> = {
  EDGE: 0.32,
  LB: 0.24,
  CB: 0.24,
  S: 0.20,
}

/** Score one player against the baseline for his own position group. */
function playerScore(entry: RatedPlayer): number {
  const s = entry.player.stats
  const pos = entry.player.positions[0] ?? ''

  if (pos === 'QB') {
    const rating = ((s['rating'] ?? 80) - 85) / 18
    const volume = ((s['passYds'] ?? 0) / 1000 - 45) / 25
    const care = (2.2 - (s['passTd'] ?? 1) / Math.max(1, s['int'] ?? 1)) * -0.35
    return clamp(rating * 0.6 + volume * 0.25 + care * 0.15)
  }

  if (pos === 'RB' || pos === 'WR' || pos === 'TE') {
    const yards = ((s['scrimYds'] ?? 0) - 12000) / 6000
    const scores = ((s['td'] ?? 0) - 90) / 60
    return clamp(yards * 0.55 + scores * 0.45)
  }

  if (pos === 'OL') {
    const honors = ((s['allPro'] ?? 0) - 4) / 3.5
    const longevity = ((s['starts'] ?? 0) - 170) / 70
    return clamp(honors * 0.75 + longevity * 0.25)
  }

  // Defensive positions: pass rush, ball production, and volume, weighted by
  // what each position is actually asked to do.
  const sacks = ((s['sacks'] ?? 0) - 60) / 80
  const picks = ((s['defInt'] ?? 0) - 25) / 25
  const tackles = ((s['tackles'] ?? 0) - 900) / 700
  const honors = ((s['defAllPro'] ?? 0) - 4) / 3

  if (pos === 'EDGE' || pos === 'DT') return clamp(sacks * 0.6 + honors * 0.3 + tackles * 0.1)
  if (pos === 'CB') return clamp(picks * 0.6 + honors * 0.3 + tackles * 0.1)
  if (pos === 'S') return clamp(picks * 0.45 + tackles * 0.25 + honors * 0.3)
  return clamp(tackles * 0.4 + picks * 0.25 + sacks * 0.15 + honors * 0.2)
}

function rate(roster: RatedPlayer[]): TeamRating {
  let offZ = 0
  let defZ = 0

  for (const entry of roster) {
    const score = playerScore(entry)
    const offWeight = OFFENSE_WEIGHTS[entry.slot.id]
    const defWeight = DEFENSE_WEIGHTS[entry.slot.id]
    if (offWeight) offZ += score * offWeight
    if (defWeight) defZ += score * defWeight
  }

  const offense = LEAGUE_PPG * (1 + 0.55 * offZ)
  const defense = LEAGUE_PPG * (1 - 0.5 * defZ)

  const qb = roster.find((r) => r.slot.id === 'QB')

  return {
    offense: Math.max(6, offense),
    defense: Math.max(6, defense),
    factors: [
      {
        label: 'Quarterback',
        value: qb ? (qb.player.stats['rating'] ?? 0).toFixed(1) : '—',
        z: qb ? playerScore(qb) : 0,
        detail: 'Career passer rating — the single biggest lever on offense',
      },
      {
        label: 'Supporting cast',
        value: `${(offZ * 100).toFixed(0)}`,
        z: clamp(offZ * 1.6),
        detail: 'Skill positions and line, weighted by positional value',
      },
      {
        label: 'Points per game',
        value: offense.toFixed(1),
        z: clamp((offense - LEAGUE_PPG) / 12),
        detail: 'Projected scoring',
      },
      {
        label: 'Defense',
        value: `${(defZ * 100).toFixed(0)}`,
        z: clamp(defZ * 1.6),
        detail: 'Pass rush, coverage, and run defense',
      },
      {
        label: 'Points allowed',
        value: defense.toFixed(1),
        z: clamp((LEAGUE_PPG - defense) / 12),
        detail: 'Projected scoring allowed',
      },
    ],
  }
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

const compareKeys: CompareKey[] = [
  { key: 'rating', label: 'RTG', higherIsBetter: true, format: (v) => v.toFixed(1) },
  { key: 'passYds', label: 'YDS', higherIsBetter: true },
  { key: 'passTd', label: 'TD', higherIsBetter: true },
  { key: 'scrimYds', label: 'YDS', higherIsBetter: true },
  { key: 'td', label: 'TD', higherIsBetter: true },
  { key: 'rec', label: 'REC', higherIsBetter: true },
  { key: 'allPro', label: 'AP', higherIsBetter: true },
  { key: 'starts', label: 'GS', higherIsBetter: true },
  { key: 'sacks', label: 'SK', higherIsBetter: true, format: (v) => v.toFixed(1) },
  { key: 'defInt', label: 'INT', higherIsBetter: true },
  { key: 'tackles', label: 'TKL', higherIsBetter: true },
]

function statLine(player: Player): string {
  const s = player.stats
  if (s['rating'] !== undefined) {
    return `${(s['rating'] ?? 0).toFixed(1)} RTG · ${(s['passYds'] ?? 0).toLocaleString()} YDS · ${s['passTd']} TD`
  }
  if (s['scrimYds'] !== undefined) {
    return `${(s['scrimYds'] ?? 0).toLocaleString()} YDS · ${s['td']} TD · ${s['rec']} REC`
  }
  if (s['allPro'] !== undefined) {
    return `${s['allPro']}x All-Pro · ${s['proBowl']}x Pro Bowl · ${s['starts']} starts`
  }
  return `${(s['sacks'] ?? 0).toFixed(1)} SK · ${s['defInt']} INT · ${s['tackles']} TKL`
}

export const football: Ruleset = {
  id: 'football',
  slug: '17-0',
  sport: 'Football',
  league: 'NFL',
  tagline: 'Ten legends. One perfect regular season.',
  seasonGames: SEASON_GAMES,
  drawsPossible: false,
  benchmark: { wins: 16, holder: '2007 Patriots', note: 'Only the 2007 Patriots have finished a regular season unbeaten, at 16-0.' },
  slots: SLOTS,
  eras: ERAS,
  franchises: FRANCHISES,
  players: PLAYERS,
  context,
  rate,
  statLine,
  compareKeys,
}
