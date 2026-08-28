/**
 * Soccer — the 38-0 game.
 *
 * Football is the one sport here where the scoring model is genuinely settled:
 * goals per match follow a Poisson distribution closely enough that the
 * academic literature and every serious betting model use it directly. So the
 * simulation needs no invented curve — team attack and defence rates go
 * straight into Poisson draws, and draws are real outcomes rather than ties to
 * be broken, which is why a perfect season here means 38 wins and not one
 * dropped point.
 *
 * A NOTE ON THE `grade` COLUMN: attacking output is measured from real career
 * club goals, assists, and appearances. Defenders and goalkeepers have no
 * equivalent public counting stat — clean-sheet records depend on the team in
 * front of them — so this pack carries an explicit editorial peak-strength
 * grade for every player, in the same spirit as the All-Pro counts used for
 * offensive linemen in the 17-0 pack. It is judgment, it is labelled as
 * judgment, and it is the one number here that is not a record.
 */

import type { CompareKey, Era, Franchise, LeagueContext, Player, RatedPlayer, RosterSlot, Ruleset, TeamRating } from '@/engine/types'
import { parsePlayers } from '../parse'

const SEASON_GAMES = 38
/** A Premier League side averages about 1.4 goals a match. */
const LEAGUE_GOALS = 1.4

/** Six league-average attackers, each contributing 0.34 goals per appearance. */
const ATTACK_BASELINE = 6 * 0.34

export const ERAS: Era[] = [
  { id: 'e80s', label: '1970s-80s', startYear: 1970, endYear: 1991 },
  { id: 'e90s', label: '1990s', startYear: 1992, endYear: 1999 },
  { id: 'e00s', label: '2000s', startYear: 2000, endYear: 2009 },
  { id: 'e10s', label: '2010s', startYear: 2010, endYear: 2019 },
  { id: 'e20s', label: '2020s', startYear: 2020, endYear: 2025 },
]

export const FRANCHISES: Franchise[] = [
  { id: 'MUN', name: 'Manchester United', short: 'Man Utd', colors: ['#da291c', '#fbe122'] },
  { id: 'LIV', name: 'Liverpool', short: 'Liverpool', colors: ['#c8102e', '#00b2a9'] },
  { id: 'ARS', name: 'Arsenal', short: 'Arsenal', colors: ['#ef0107', '#063672'] },
  { id: 'CHE', name: 'Chelsea', short: 'Chelsea', colors: ['#034694', '#ffffff'] },
  { id: 'MCI', name: 'Manchester City', short: 'Man City', colors: ['#6cabdd', '#1c2c5b'] },
  { id: 'TOT', name: 'Tottenham Hotspur', short: 'Spurs', colors: ['#132257', '#ffffff'] },
  { id: 'EVE', name: 'Everton', short: 'Everton', colors: ['#003399', '#ffffff'] },
  { id: 'NEW', name: 'Newcastle United', short: 'Newcastle', colors: ['#241f20', '#ffffff'] },
  { id: 'LEI', name: 'Leicester City', short: 'Leicester', colors: ['#003090', '#fdbe11'] },
  { id: 'AVL', name: 'Aston Villa', short: 'Aston Villa', colors: ['#95bfe5', '#670e36'] },
  { id: 'WHU', name: 'West Ham United', short: 'West Ham', colors: ['#7a263a', '#1bb1e7'] },
  { id: 'BLB', name: 'Blackburn Rovers', short: 'Blackburn', colors: ['#009ee0', '#ffffff'] },
  { id: 'NFO', name: 'Nottingham Forest', short: 'Forest', colors: ['#dd0000', '#ffffff'] },
  { id: 'LEE', name: 'Leeds United', short: 'Leeds', colors: ['#ffffff', '#1d428a'] },
]

export const SLOTS: RosterSlot[] = [
  { id: 'GK', label: 'Goalkeeper', group: 'Keeper', accepts: ['GK'] },
  { id: 'DF1', label: 'Defender', group: 'Defence', accepts: ['DF'] },
  { id: 'DF2', label: 'Defender', group: 'Defence', accepts: ['DF'] },
  { id: 'DF3', label: 'Defender', group: 'Defence', accepts: ['DF'] },
  { id: 'DF4', label: 'Defender', group: 'Defence', accepts: ['DF', 'MF'] },
  { id: 'MF1', label: 'Midfielder', group: 'Midfield', accepts: ['MF'] },
  { id: 'MF2', label: 'Midfielder', group: 'Midfield', accepts: ['MF'] },
  { id: 'MF3', label: 'Midfielder', group: 'Midfield', accepts: ['MF', 'FW'] },
  { id: 'FW1', label: 'Forward', group: 'Attack', accepts: ['FW'] },
  { id: 'FW2', label: 'Forward', group: 'Attack', accepts: ['FW', 'MF'] },
  { id: 'FW3', label: 'Forward', group: 'Attack', accepts: ['FW', 'MF'] },
]

// name | club | era | pos | peak | club goals | club assists | club apps | grade
const TABLE = `
Peter Schmeichel|MUN|e90s|GK|1996|0|1|398|94
David Seaman|ARS|e90s|GK|1998|0|0|564|89
Edwin van der Sar|MUN|e00s|GK|2009|0|0|266|90
Petr Cech|CHE|e00s|GK|2005|0|0|494|93
David de Gea|MUN|e10s|GK|2018|0|0|545|89
Alisson Becker|LIV|e10s|GK|2019|1|0|250|93
Ederson|MCI|e10s|GK|2019|0|3|300|90
Hugo Lloris|TOT|e10s|GK|2017|0|0|447|85
Shay Given|NEW|e00s|GK|2006|0|0|451|84
Ray Clemence|LIV|e80s|GK|1979|0|0|665|91
Peter Shilton|NFO|e80s|GK|1979|0|0|1005|92
Tony Adams|ARS|e90s|DF|1998|48|12|669|90
Rio Ferdinand|MUN|e00s|DF|2008|8|4|455|92
Nemanja Vidic|MUN|e00s|DF|2011|21|3|300|90
John Terry|CHE|e00s|DF|2005|67|14|717|91
Ashley Cole|CHE|e00s|DF|2010|15|39|555|89
Gary Neville|MUN|e90s|DF|1999|7|57|602|85
Virgil van Dijk|LIV|e10s|DF|2019|28|8|320|95
Vincent Kompany|MCI|e10s|DF|2012|20|8|360|90
Kyle Walker|MCI|e10s|DF|2019|9|30|400|86
Sol Campbell|ARS|e00s|DF|2004|18|5|503|88
Jaap Stam|MUN|e90s|DF|1999|3|1|127|89
Alan Hansen|LIV|e80s|DF|1984|14|20|620|90
Phil Neal|LIV|e80s|DF|1979|59|20|650|85
Ruben Dias|MCI|e20s|DF|2021|7|3|200|92
Trent Alexander-Arnold|LIV|e20s|DF|2022|18|85|310|90
Andrew Robertson|LIV|e20s|DF|2020|10|65|300|89
Roy Keane|MUN|e90s|MF|1999|51|33|480|93
Paul Scholes|MUN|e00s|MF|2007|155|69|718|93
Frank Lampard|CHE|e00s|MF|2005|211|150|648|94
Steven Gerrard|LIV|e00s|MF|2009|186|154|710|94
Patrick Vieira|ARS|e90s|MF|2002|33|34|406|92
Bryan Robson|MUN|e80s|MF|1984|99|60|461|91
Graeme Souness|LIV|e80s|MF|1982|56|40|359|90
Yaya Toure|MCI|e10s|MF|2014|79|41|315|90
David Silva|MCI|e10s|MF|2012|77|140|436|93
Kevin De Bruyne|MCI|e10s|MF|2020|102|170|400|96
Cesc Fabregas|ARS|e00s|MF|2008|57|111|350|90
Michael Carrick|MUN|e00s|MF|2009|24|38|464|85
NGolo Kante|CHE|e10s|MF|2017|13|18|300|91
Luka Modric|TOT|e10s|MF|2011|17|24|159|89
Paul Gascoigne|TOT|e90s|MF|1991|33|30|262|89
David Beckham|MUN|e90s|MF|1999|85|152|394|91
Rodri|MCI|e20s|MF|2023|26|20|260|94
Bruno Fernandes|MUN|e20s|MF|2021|85|65|280|89
Thierry Henry|ARS|e00s|FW|2004|228|103|376|97
Alan Shearer|BLB|e90s|FW|1995|283|64|559|95
Eric Cantona|MUN|e90s|FW|1996|82|58|185|93
Dennis Bergkamp|ARS|e90s|FW|1998|120|94|423|93
Wayne Rooney|MUN|e00s|FW|2010|253|146|559|93
Cristiano Ronaldo|MUN|e00s|FW|2008|145|64|346|97
Didier Drogba|CHE|e00s|FW|2010|164|86|381|93
Ruud van Nistelrooy|MUN|e00s|FW|2003|150|29|219|92
Sergio Aguero|MCI|e10s|FW|2015|260|71|390|95
Mohamed Salah|LIV|e10s|FW|2018|230|100|380|95
Harry Kane|TOT|e10s|FW|2018|280|64|435|94
Luis Suarez|LIV|e10s|FW|2014|82|48|133|94
Robin van Persie|ARS|e10s|FW|2012|132|65|372|90
Erling Haaland|MCI|e20s|FW|2023|110|20|130|95
Son Heung-min|TOT|e20s|FW|2021|170|85|450|90
Ian Rush|LIV|e80s|FW|1984|346|100|660|94
Kenny Dalglish|LIV|e80s|FW|1979|172|100|515|95
Gary Lineker|EVE|e80s|FW|1986|48|10|57|91
Jamie Vardy|LEI|e10s|FW|2016|198|65|500|88
Andrew Cole|NEW|e90s|FW|1994|187|73|414|89
Michael Owen|LIV|e00s|FW|2001|158|39|297|91
Robbie Fowler|LIV|e90s|FW|1996|183|56|369|90
Teddy Sheringham|TOT|e90s|FW|1993|146|72|418|87
`

export const PLAYERS: Player[] = parsePlayers(TABLE, {
  stats: ['goals', 'assists', 'apps', 'grade'],
})

const context: LeagueContext = {
  averageScore: LEAGUE_GOALS,
  spread: 0.35,
  model: 'poisson',
}

function rate(roster: RatedPlayer[]): TeamRating {
  const attackers = roster.filter((r) => r.slot.group === 'Attack' || r.slot.group === 'Midfield')
  const defenders = roster.filter((r) => r.slot.group === 'Defence' || r.slot.group === 'Keeper')

  // Attacking output per appearance, averaged across the front six. Assists
  // count for less than goals because someone still has to finish the chance.
  const perApp = (r: RatedPlayer) => {
    const apps = Math.max(1, r.player.stats['apps'] ?? 1)
    return ((r.player.stats['goals'] ?? 0) + 0.6 * (r.player.stats['assists'] ?? 0)) / apps
  }

  // Summed rather than averaged: six players who each contribute a goal every
  // other match make a devastating attack, and averaging would hide that behind
  // the deep-lying midfielders who are there to win the ball back.
  const attackRate = attackers.reduce((sum, r) => sum + perApp(r), 0)

  const meanGrade = (group: RatedPlayer[]) =>
    group.length === 0
      ? 85
      : group.reduce((sum, r) => sum + (r.player.stats['grade'] ?? 85), 0) / group.length

  const attackGrade = meanGrade(attackers)
  const defenceGrade = meanGrade(defenders)

  // A league-average front six contributes about 0.34 goals per appearance
  // each, so 6 x 0.34 is the point where the model returns league scoring.
  // Calibration targets are real: the 2017-18 champions scored 2.79 a game,
  // and this returns roughly 2.7 for an all-time front six.
  const offense =
    LEAGUE_GOALS * Math.pow(attackRate / ATTACK_BASELINE, 1.15) * (1 + (attackGrade - 90) / 90)

  // Exponential decay in defensive grade. The 2018-19 champions conceded 0.61
  // a game; a grade-95 back line lands near that, and no defence reaches zero.
  const defense = LEAGUE_GOALS * Math.exp(-(defenceGrade - 86) / 9)

  return {
    offense: Math.max(0.2, offense),
    defense: Math.max(0.15, defense),
    factors: [
      {
        label: 'Attacking output',
        value: (attackRate / 6).toFixed(2),
        z: clamp((attackRate - ATTACK_BASELINE) / 1.6),
        detail: 'Goals plus assists per appearance across the front six',
      },
      {
        label: 'Attack quality',
        value: attackGrade.toFixed(0),
        z: clamp((attackGrade - 90) / 6),
        detail: 'Peak-strength grade of the front six',
      },
      {
        label: 'Goals per match',
        value: offense.toFixed(2),
        z: clamp((offense - LEAGUE_GOALS) / 1.4),
        detail: 'Projected scoring',
      },
      {
        label: 'Back line and keeper',
        value: defenceGrade.toFixed(0),
        z: clamp((defenceGrade - 88) / 6),
        detail: 'Peak-strength grade of the defence',
      },
      {
        label: 'Goals conceded',
        value: defense.toFixed(2),
        z: clamp((LEAGUE_GOALS - defense) / 1.0),
        detail: 'Projected concession per match',
      },
    ],
  }
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

const compareKeys: CompareKey[] = [
  { key: 'goals', label: 'G', higherIsBetter: true },
  { key: 'assists', label: 'A', higherIsBetter: true },
  { key: 'apps', label: 'APP', higherIsBetter: true },
  { key: 'grade', label: 'GRADE', higherIsBetter: true },
]

function statLine(player: Player): string {
  const s = player.stats
  return `${s['goals']} G · ${s['assists']} A · ${s['apps']} apps`
}

export const soccer: Ruleset = {
  id: 'soccer',
  slug: '38-0',
  sport: 'Soccer',
  league: 'English top flight',
  tagline: 'A starting XI that drops nothing. Thirty-eight wins.',
  seasonGames: SEASON_GAMES,
  drawsPossible: true,
  benchmark: { wins: 32, holder: '2017-18 Man City', note: 'Man City won 32 of 38 in 2017-18; Arsenal went unbeaten in 2003-04 with 26 wins and 12 draws.' },
  slots: SLOTS,
  eras: ERAS,
  franchises: FRANCHISES,
  players: PLAYERS,
  context,
  rate,
  statLine,
  compareKeys,
}
