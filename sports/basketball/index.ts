/**
 * Basketball — the 82-0 game.
 *
 * Summing five players' scoring averages works far better here than the
 * equivalent move does in baseball: a starting five shares the same ~100
 * possessions, so their combined PPG really is most of a team's offense. What
 * it misses is usage saturation — five 30-point scorers cannot all take 30
 * shots, because there is still only one ball.
 *
 * So the lineup's raw totals are compressed against a league-average starting
 * five with a fractional exponent. An average five returns league-average
 * scoring exactly; an all-time five returns a historically great offense
 * rather than a physically impossible one.
 *
 * NOTE ON PRE-1974 DATA: steals and blocks were not official NBA statistics
 * until the 1973-74 season. Lines for earlier players carry the standard
 * researcher estimates, flagged here so the numbers are not mistaken for
 * official records.
 */

import type { CompareKey, Era, Franchise, LeagueContext, RatedPlayer, RosterSlot, Ruleset, TeamRating } from '@/engine/types'
import { parsePlayers } from '../parse'

const SEASON_GAMES = 82
const LEAGUE_PPG = 114

/** Points, rebounds, assists, steals, blocks of a league-average starting five. */
const AVG_LINEUP_PTS = 70
const AVG_LINEUP_DEF = 46

/** Usage saturation. Below 1 so stacked scorers compound with diminishing return. */
const OFFENSE_COMPRESSION = 0.45
const DEFENSE_COMPRESSION = 0.35

export const ERAS: Era[] = [
  { id: 'e60s', label: '1960s-70s', startYear: 1960, endYear: 1979 },
  { id: 'e80s', label: '1980s', startYear: 1980, endYear: 1989 },
  { id: 'e90s', label: '1990s', startYear: 1990, endYear: 1999 },
  { id: 'e00s', label: '2000s', startYear: 2000, endYear: 2009 },
  { id: 'e10s', label: '2010s-20s', startYear: 2010, endYear: 2025 },
]

export const FRANCHISES: Franchise[] = [
  { id: 'LAL', name: 'Los Angeles Lakers', short: 'Lakers', colors: ['#552583', '#fdb927'] },
  { id: 'BOS', name: 'Boston Celtics', short: 'Celtics', colors: ['#007a33', '#ba9653'] },
  { id: 'CHI', name: 'Chicago Bulls', short: 'Bulls', colors: ['#ce1141', '#000000'] },
  { id: 'GSW', name: 'Golden State Warriors', short: 'Warriors', colors: ['#1d428a', '#ffc72c'] },
  { id: 'SAS', name: 'San Antonio Spurs', short: 'Spurs', colors: ['#c4ced4', '#000000'] },
  { id: 'MIA', name: 'Miami Heat', short: 'Heat', colors: ['#98002e', '#f9a01b'] },
  { id: 'PHI', name: 'Philadelphia 76ers', short: '76ers', colors: ['#006bb6', '#ed174c'] },
  { id: 'HOU', name: 'Houston Rockets', short: 'Rockets', colors: ['#ce1141', '#000000'] },
  { id: 'DET', name: 'Detroit Pistons', short: 'Pistons', colors: ['#c8102e', '#1d42ba'] },
  { id: 'NYK', name: 'New York Knicks', short: 'Knicks', colors: ['#006bb6', '#f58426'] },
  { id: 'MIL', name: 'Milwaukee Bucks', short: 'Bucks', colors: ['#00471b', '#eee1c6'] },
  { id: 'PHX', name: 'Phoenix Suns', short: 'Suns', colors: ['#1d1160', '#e56020'] },
  { id: 'UTA', name: 'Utah Jazz', short: 'Jazz', colors: ['#002b5c', '#f9a01b'] },
  { id: 'DAL', name: 'Dallas Mavericks', short: 'Mavericks', colors: ['#00538c', '#002b5e'] },
  { id: 'OKC', name: 'Oklahoma City Thunder', short: 'Thunder', colors: ['#007ac1', '#ef3b24'] },
  { id: 'SEA', name: 'Seattle SuperSonics', short: 'Sonics', colors: ['#00653a', '#ffc200'] },
  { id: 'POR', name: 'Portland Trail Blazers', short: 'Blazers', colors: ['#e03a3e', '#000000'] },
  { id: 'ORL', name: 'Orlando Magic', short: 'Magic', colors: ['#0077c0', '#c4ced4'] },
  { id: 'CLE', name: 'Cleveland Cavaliers', short: 'Cavaliers', colors: ['#860038', '#fdbb30'] },
  { id: 'TOR', name: 'Toronto Raptors', short: 'Raptors', colors: ['#ce1141', '#000000'] },
  { id: 'DEN', name: 'Denver Nuggets', short: 'Nuggets', colors: ['#0e2240', '#fec524'] },
  { id: 'LAC', name: 'Los Angeles Clippers', short: 'Clippers', colors: ['#c8102e', '#1d428a'] },
  { id: 'ATL', name: 'Atlanta Hawks', short: 'Hawks', colors: ['#e03a3e', '#26282a'] },
  { id: 'SAC', name: 'Sacramento Kings', short: 'Kings', colors: ['#5a2d81', '#63727a'] },
  { id: 'WAS', name: 'Washington Wizards', short: 'Wizards', colors: ['#002b5c', '#e31837'] },
  { id: 'IND', name: 'Indiana Pacers', short: 'Pacers', colors: ['#002d62', '#fdbb30'] },
  { id: 'MIN', name: 'Minnesota Timberwolves', short: 'Wolves', colors: ['#0c2340', '#236192'] },
  { id: 'NOP', name: 'New Orleans Pelicans', short: 'Pelicans', colors: ['#0c2340', '#c8102e'] },
  { id: 'NJN', name: 'New Jersey Nets', short: 'Nets', colors: ['#000000', '#c4ced4'] },
]

export const SLOTS: RosterSlot[] = [
  { id: 'PG', label: 'Point Guard', group: 'Backcourt', accepts: ['PG'] },
  { id: 'SG', label: 'Shooting Guard', group: 'Backcourt', accepts: ['SG', 'PG'] },
  { id: 'SF', label: 'Small Forward', group: 'Frontcourt', accepts: ['SF', 'SG'] },
  { id: 'PF', label: 'Power Forward', group: 'Frontcourt', accepts: ['PF', 'SF'] },
  { id: 'C', label: 'Center', group: 'Frontcourt', accepts: ['C', 'PF'] },
]

// name | franchise | era | positions | peak | PPG | RPG | APG | SPG | BPG
const TABLE = `
Oscar Robertson|MIL|e60s|PG|1964|25.7|7.5|9.5|1.2|0.3
Jerry West|LAL|e60s|SG|1966|27.0|5.8|6.7|1.5|0.5
Bob Cousy|BOS|e60s|PG|1957|18.4|5.2|7.5|1.3|0.2
Walt Frazier|NYK|e60s|PG|1970|18.9|5.9|6.1|1.9|0.2
Elgin Baylor|LAL|e60s|SF|1961|27.4|13.5|4.3|1.2|0.5
John Havlicek|BOS|e60s|SF|1971|20.8|6.3|4.8|1.2|0.3
Julius Erving|PHI|e60s|SF|1976|22.0|6.7|3.9|1.8|1.5
Rick Barry|GSW|e60s|SF|1975|23.2|6.5|5.1|2.0|0.5
George Gervin|SAS|e60s|SG|1978|26.2|4.6|2.8|1.2|0.8
Wilt Chamberlain|PHI|e60s|C|1962|30.1|22.9|4.4|1.0|3.5
Bill Russell|BOS|e60s|C|1962|15.1|22.5|4.3|1.1|3.8
Kareem Abdul-Jabbar|LAL|e60s|C|1971|24.6|11.2|3.6|0.9|2.6
Willis Reed|NYK|e60s|C|1970|18.7|12.9|1.8|0.9|1.5
Bill Walton|POR|e60s|C|1977|13.3|10.5|3.4|0.8|2.2
Wes Unseld|WAS|e60s|C|1969|10.8|14.0|3.9|1.1|0.6
Bob Pettit|ATL|e60s|PF|1959|26.4|16.2|3.0|1.0|1.0
Elvin Hayes|WAS|e60s|PF|1975|21.0|12.5|1.8|0.9|2.0
Dave Cowens|BOS|e60s|C|1973|17.6|13.6|3.8|1.1|0.9
Magic Johnson|LAL|e80s|PG|1987|19.5|7.2|11.2|1.9|0.4
Isiah Thomas|DET|e80s|PG|1984|19.2|3.6|9.3|1.9|0.3
Larry Bird|BOS|e80s|SF|1986|24.3|10.0|6.3|1.7|0.8
Dominique Wilkins|ATL|e80s|SF|1988|24.8|6.7|2.5|1.3|0.6
Kevin McHale|BOS|e80s|PF|1987|17.9|7.3|1.7|0.4|1.7
Moses Malone|HOU|e80s|C|1982|20.3|12.2|1.4|0.8|1.3
Robert Parish|BOS|e80s|C|1984|14.5|9.1|1.4|0.8|1.5
James Worthy|LAL|e80s|SF|1988|17.6|5.1|3.0|1.1|0.7
Adrian Dantley|UTA|e80s|SF|1982|24.3|5.7|3.0|1.0|0.2
Sidney Moncrief|MIL|e80s|SG|1983|15.6|4.7|3.6|1.2|0.3
Michael Jordan|CHI|e90s|SG|1991|30.1|6.2|5.3|2.3|0.8
Scottie Pippen|CHI|e90s|SF|1994|16.1|6.4|5.2|2.0|0.8
Dennis Rodman|CHI|e90s|PF|1996|7.3|13.1|1.8|0.7|0.6
Hakeem Olajuwon|HOU|e90s|C|1994|21.8|11.1|2.5|1.7|3.1
David Robinson|SAS|e90s|C|1995|21.1|10.6|2.5|1.4|3.0
Patrick Ewing|NYK|e90s|C|1990|21.0|9.8|1.9|1.0|2.4
Karl Malone|UTA|e90s|PF|1997|25.0|10.1|3.6|1.4|0.8
John Stockton|UTA|e90s|PG|1990|13.1|2.7|10.5|2.2|0.2
Charles Barkley|PHX|e90s|PF|1993|22.1|11.7|3.9|1.5|0.8
Clyde Drexler|POR|e90s|SG|1992|20.4|6.1|5.6|2.0|0.7
Reggie Miller|IND|e90s|SG|1994|18.2|3.0|3.0|1.1|0.2
Gary Payton|SEA|e90s|PG|1996|16.3|3.9|6.7|1.8|0.2
Alonzo Mourning|MIA|e90s|C|1999|17.1|8.5|1.1|0.5|2.8
Shawn Kemp|SEA|e90s|PF|1996|14.6|8.4|1.6|1.2|1.2
Grant Hill|DET|e90s|SF|1997|16.7|6.0|4.1|1.2|0.6
Kobe Bryant|LAL|e00s|SG|2006|25.0|5.2|4.7|1.4|0.5
Shaquille ONeal|LAL|e00s|C|2000|23.7|10.9|2.5|0.6|2.3
Tim Duncan|SAS|e00s|PF|2003|19.0|10.8|3.0|0.7|2.2
Kevin Garnett|MIN|e00s|PF|2004|17.8|10.0|3.7|1.3|1.4
Dirk Nowitzki|DAL|e00s|PF|2006|20.7|7.5|2.4|0.8|0.8
Allen Iverson|PHI|e00s|PG|2001|26.7|3.7|6.2|2.2|0.2
Steve Nash|PHX|e00s|PG|2005|14.3|3.0|8.5|0.7|0.1
Jason Kidd|NJN|e00s|PG|2002|12.6|6.3|8.7|1.9|0.3
Dwyane Wade|MIA|e00s|SG|2009|22.0|4.7|5.4|1.5|0.8
Tracy McGrady|ORL|e00s|SG|2003|19.6|5.6|4.4|1.2|0.9
Ray Allen|SEA|e00s|SG|2001|18.9|4.1|3.4|1.1|0.2
Paul Pierce|BOS|e00s|SF|2002|19.7|5.6|3.5|1.3|0.5
Carmelo Anthony|DEN|e00s|SF|2009|22.5|6.2|2.7|1.0|0.5
Vince Carter|TOR|e00s|SG|2000|16.7|4.3|3.1|1.0|0.6
Manu Ginobili|SAS|e00s|SG|2008|13.3|3.5|3.8|1.3|0.3
Tony Parker|SAS|e00s|PG|2007|15.5|2.7|5.6|0.8|0.1
Dwight Howard|ORL|e00s|C|2009|15.7|11.8|1.3|0.8|1.8
Yao Ming|HOU|e00s|C|2007|19.0|9.2|1.6|0.4|1.9
Chris Webber|SAC|e00s|PF|2001|20.7|9.8|4.2|1.4|1.4
Pau Gasol|LAL|e00s|PF|2009|17.0|9.2|3.2|0.5|1.6
LeBron James|CLE|e10s|SF|2013|27.1|7.5|7.4|1.5|0.7
Stephen Curry|GSW|e10s|PG|2016|24.8|4.7|6.4|1.5|0.2
Kevin Durant|OKC|e10s|SF|2014|27.3|7.1|4.4|1.1|1.1
Kawhi Leonard|SAS|e10s|SF|2017|19.4|6.3|3.0|1.7|0.6
James Harden|HOU|e10s|SG|2018|24.3|5.6|7.0|1.5|0.5
Chris Paul|LAC|e10s|PG|2014|17.9|4.5|9.4|2.1|0.1
Russell Westbrook|OKC|e10s|PG|2017|21.7|7.3|8.3|1.6|0.3
Damian Lillard|POR|e10s|PG|2018|25.2|4.2|6.7|0.9|0.3
Kyrie Irving|CLE|e10s|PG|2016|23.4|3.9|5.7|1.3|0.4
Giannis Antetokounmpo|MIL|e10s|PF|2020|23.5|9.9|4.9|1.1|1.2
Anthony Davis|NOP|e10s|PF|2018|24.0|10.5|2.3|1.3|2.3
Nikola Jokic|DEN|e10s|C|2022|21.0|11.0|7.0|1.3|0.7
Joel Embiid|PHI|e10s|C|2023|27.9|11.2|3.6|0.9|1.7
Rudy Gobert|UTA|e10s|C|2021|12.4|11.7|1.3|0.7|2.1
Draymond Green|GSW|e10s|PF|2016|8.7|6.9|5.6|1.3|0.8
Klay Thompson|GSW|e10s|SG|2016|19.6|3.5|2.3|0.8|0.5
Jimmy Butler|MIA|e10s|SF|2020|18.1|5.2|4.2|1.6|0.4
Luka Doncic|DAL|e10s|PG|2022|28.6|8.7|8.3|1.2|0.5
Jayson Tatum|BOS|e10s|SF|2023|23.0|7.2|3.3|1.0|0.6
Devin Booker|PHX|e10s|SG|2022|24.2|4.1|5.0|0.9|0.3
Donovan Mitchell|UTA|e10s|SG|2020|24.4|4.3|4.5|1.4|0.3
Trae Young|ATL|e10s|PG|2022|25.3|3.7|9.5|1.1|0.2
Bam Adebayo|MIA|e10s|C|2023|15.3|8.5|3.5|1.0|0.8
Paul George|LAC|e10s|SF|2019|20.2|6.1|3.4|1.7|0.4
`

export const PLAYERS = parsePlayers(TABLE, {
  stats: ['ppg', 'rpg', 'apg', 'spg', 'bpg'],
})

const context: LeagueContext = {
  averageScore: LEAGUE_PPG,
  spread: 5.5,
  model: 'normal',
  // NBA team scoring swings about 11 points game to game.
  sigma: 11,
}

function rate(roster: RatedPlayer[]): TeamRating {
  const sum = (key: string) =>
    roster.reduce((total, r) => total + (r.player.stats[key] ?? 0), 0)

  const pts = sum('ppg')
  const reb = sum('rpg')
  const ast = sum('apg')
  const stl = sum('spg')
  const blk = sum('bpg')

  // Playmaking creates shots for others, so assists lift the offense without
  // being points themselves.
  const offenseRaw = pts + ast * 0.6
  const defenseRaw = reb + stl * 2 + blk * 2

  const offense =
    LEAGUE_PPG * Math.pow(offenseRaw / (AVG_LINEUP_PTS + 20 * 0.6), OFFENSE_COMPRESSION)
  const defense =
    LEAGUE_PPG * Math.pow(AVG_LINEUP_DEF / Math.max(1, defenseRaw), DEFENSE_COMPRESSION)

  return {
    offense,
    defense,
    factors: [
      {
        label: 'Lineup scoring',
        value: pts.toFixed(1),
        z: clamp((pts - AVG_LINEUP_PTS) / 45),
        detail: 'Combined points per game',
      },
      {
        label: 'Playmaking',
        value: ast.toFixed(1),
        z: clamp((ast - 20) / 18),
        detail: 'Combined assists per game',
      },
      {
        label: 'Offensive rating',
        value: offense.toFixed(1),
        z: clamp((offense - LEAGUE_PPG) / 30),
        detail: 'Points per game after usage saturation',
      },
      {
        label: 'Glass and rim',
        value: `${reb.toFixed(1)} / ${blk.toFixed(1)}`,
        z: clamp((reb - 40) / 22),
        detail: 'Rebounds and blocks per game',
      },
      {
        label: 'Defensive rating',
        value: defense.toFixed(1),
        z: clamp((LEAGUE_PPG - defense) / 22),
        detail: 'Points allowed per game',
      },
    ],
  }
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

const compareKeys: CompareKey[] = [
  { key: 'ppg', label: 'PPG', higherIsBetter: true, format: (v) => v.toFixed(1) },
  { key: 'rpg', label: 'RPG', higherIsBetter: true, format: (v) => v.toFixed(1) },
  { key: 'apg', label: 'APG', higherIsBetter: true, format: (v) => v.toFixed(1) },
  { key: 'spg', label: 'SPG', higherIsBetter: true, format: (v) => v.toFixed(1) },
  { key: 'bpg', label: 'BPG', higherIsBetter: true, format: (v) => v.toFixed(1) },
]

export const basketball: Ruleset = {
  id: 'basketball',
  slug: '82-0',
  sport: 'Basketball',
  league: 'NBA',
  tagline: 'Five players. Eighty-two games. No losses.',
  seasonGames: SEASON_GAMES,
  drawsPossible: false,
  benchmark: { wins: 73, holder: '2015-16 Warriors', note: 'The 2015-16 Warriors won 73 games and still lost the Finals.' },
  slots: SLOTS,
  eras: ERAS,
  franchises: FRANCHISES,
  players: PLAYERS,
  context,
  rate,
  statLine: (p) =>
    `${(p.stats['ppg'] ?? 0).toFixed(1)} PPG · ${(p.stats['rpg'] ?? 0).toFixed(1)} RPG · ${(p.stats['apg'] ?? 0).toFixed(1)} APG`,
  compareKeys,
}
