/**
 * Baseball roster pack — seed data.
 *
 * PROVENANCE AND ACCURACY
 * -----------------------
 * These are career slash lines and career counting stats for recognizable
 * players, hand-curated so the game is playable and balanced out of the box.
 * Pre-2000 figures are the standard, widely published career numbers. Lines
 * for players whose careers are recent or ongoing are rounded approximations,
 * and Negro Leagues figures follow MLB's 2020 recognition of those records,
 * which are less complete than post-1920 AL/NL bookkeeping.
 *
 * For exact, sourced, season-level data, run `npm run import:lahman`. That
 * ingests the Lahman/Chadwick database (CC BY-SA 3.0, 1871-present) and emits
 * `players.generated.ts` in this exact format, which takes precedence over
 * this file. This pack is the playable default, not the ceiling.
 *
 * Columns: name | franchise | era | positions | peak year | AVG | OBP | SLG | HR | SB
 */

import type { Franchise, Era } from '@/engine/types'
import { parsePlayers } from '../parse'

export const ERAS: Era[] = [
  { id: 'e20s', label: '1920s-30s', startYear: 1901, endYear: 1939 },
  { id: 'e40s', label: '1940s-50s', startYear: 1940, endYear: 1959 },
  { id: 'e60s', label: '1960s-70s', startYear: 1960, endYear: 1979 },
  { id: 'e80s', label: '1980s-90s', startYear: 1980, endYear: 1999 },
  { id: 'e00s', label: '2000s', startYear: 2000, endYear: 2009 },
  { id: 'e10s', label: '2010s-20s', startYear: 2010, endYear: 2025 },
]

export const FRANCHISES: Franchise[] = [
  { id: 'NYY', name: 'New York Yankees', short: 'Yankees', colors: ['#132448', '#c4ced3'] },
  { id: 'BOS', name: 'Boston Red Sox', short: 'Red Sox', colors: ['#bd3039', '#0c2340'] },
  { id: 'LAD', name: 'Los Angeles Dodgers', short: 'Dodgers', colors: ['#005a9c', '#ef3e42'] },
  { id: 'SFG', name: 'San Francisco Giants', short: 'Giants', colors: ['#fd5a1e', '#27251f'] },
  { id: 'STL', name: 'St. Louis Cardinals', short: 'Cardinals', colors: ['#c41e3a', '#0c2340'] },
  { id: 'CHC', name: 'Chicago Cubs', short: 'Cubs', colors: ['#0e3386', '#cc3433'] },
  { id: 'ATL', name: 'Atlanta Braves', short: 'Braves', colors: ['#ce1141', '#13274f'] },
  { id: 'CIN', name: 'Cincinnati Reds', short: 'Reds', colors: ['#c6011f', '#000000'] },
  { id: 'DET', name: 'Detroit Tigers', short: 'Tigers', colors: ['#0c2340', '#fa4616'] },
  { id: 'PIT', name: 'Pittsburgh Pirates', short: 'Pirates', colors: ['#fdb827', '#27251f'] },
  { id: 'BAL', name: 'Baltimore Orioles', short: 'Orioles', colors: ['#df4601', '#000000'] },
  { id: 'OAK', name: 'Athletics', short: "A's", colors: ['#003831', '#efb21e'] },
  { id: 'HOU', name: 'Houston Astros', short: 'Astros', colors: ['#eb6e1f', '#002d62'] },
  { id: 'SEA', name: 'Seattle Mariners', short: 'Mariners', colors: ['#0c2c56', '#005c5c'] },
  { id: 'PHI', name: 'Philadelphia Phillies', short: 'Phillies', colors: ['#e81828', '#002d72'] },
  { id: 'MIN', name: 'Minnesota Twins', short: 'Twins', colors: ['#002b5c', '#d31145'] },
  { id: 'CLE', name: 'Cleveland Guardians', short: 'Guardians', colors: ['#00385d', '#e50022'] },
  { id: 'TEX', name: 'Texas Rangers', short: 'Rangers', colors: ['#003278', '#c0111f'] },
  { id: 'NYM', name: 'New York Mets', short: 'Mets', colors: ['#002d72', '#ff5910'] },
  { id: 'TOR', name: 'Toronto Blue Jays', short: 'Blue Jays', colors: ['#134a8e', '#1d2d5c'] },
  { id: 'SDP', name: 'San Diego Padres', short: 'Padres', colors: ['#2f241d', '#ffc425'] },
  { id: 'MIL', name: 'Milwaukee Brewers', short: 'Brewers', colors: ['#12284b', '#ffc52f'] },
  { id: 'LAA', name: 'Los Angeles Angels', short: 'Angels', colors: ['#ba0021', '#003263'] },
  { id: 'ARI', name: 'Arizona Diamondbacks', short: 'D-backs', colors: ['#a71930', '#e3d4ad'] },
  { id: 'WSN', name: 'Washington Nationals', short: 'Nationals', colors: ['#ab0003', '#14225a'] },
  { id: 'WSH', name: 'Washington Senators', short: 'Senators', colors: ['#a01d2d', '#122a5c'] },
  { id: 'KCR', name: 'Kansas City Royals', short: 'Royals', colors: ['#004687', '#bd9b60'] },
  { id: 'CHW', name: 'Chicago White Sox', short: 'White Sox', colors: ['#27251f', '#c4ced4'] },
  { id: 'COL', name: 'Colorado Rockies', short: 'Rockies', colors: ['#33006f', '#c4ced4'] },
  { id: 'MON', name: 'Montreal Expos', short: 'Expos', colors: ['#12284b', '#ef3340'] },
  { id: 'NLG', name: 'Negro Leagues', short: 'Negro Lgs', colors: ['#1b1b1b', '#c9a227'] },
]

const BATTERS = `
# ---- 1920s-30s ----
Babe Ruth|NYY|e20s|RF|1927|.342|.474|.690|714|123
Lou Gehrig|NYY|e20s|1B|1934|.340|.447|.632|493|102
Bill Dickey|NYY|e20s|C|1936|.313|.382|.486|202|36
Tony Lazzeri|NYY|e20s|2B|1929|.292|.380|.467|178|148
Earle Combs|NYY|e20s|CF|1927|.325|.397|.462|58|98
Jimmie Foxx|OAK|e20s|1B|1932|.325|.428|.609|534|87
Mickey Cochrane|OAK|e20s|C|1930|.320|.419|.478|119|64
Al Simmons|OAK|e20s|LF|1930|.334|.380|.535|307|88
Eddie Collins|OAK|e20s|2B|1914|.333|.424|.429|47|745
Home Run Baker|OAK|e20s|3B|1913|.307|.363|.442|96|235
Rogers Hornsby|STL|e20s|2B|1925|.358|.434|.577|301|135
Frankie Frisch|STL|e20s|2B|1927|.316|.369|.432|105|419
Jim Bottomley|STL|e20s|1B|1928|.310|.369|.500|219|58
Chick Hafey|STL|e20s|LF|1931|.317|.372|.526|164|70
Ty Cobb|DET|e20s|CF|1911|.366|.433|.512|117|897
Charlie Gehringer|DET|e20s|2B|1937|.320|.404|.480|184|181
Harry Heilmann|DET|e20s|RF|1923|.342|.410|.520|183|113
Hank Greenberg|DET|e20s|1B|1938|.313|.412|.605|331|58
Mel Ott|SFG|e20s|RF|1936|.304|.414|.533|511|89
Bill Terry|SFG|e20s|1B|1930|.341|.393|.506|154|56
Travis Jackson|SFG|e20s|SS|1929|.291|.337|.433|135|71
Paul Waner|PIT|e20s|RF|1927|.333|.404|.473|113|104
Arky Vaughan|PIT|e20s|SS|1935|.318|.406|.453|96|118
Pie Traynor|PIT|e20s|3B|1927|.320|.362|.435|58|158
Hack Wilson|CHC|e20s|CF|1930|.307|.395|.545|244|52
Gabby Hartnett|CHC|e20s|C|1930|.297|.370|.489|236|28
Tris Speaker|CLE|e20s|CF|1912|.345|.428|.500|117|436
Joe Sewell|CLE|e20s|SS|1923|.312|.391|.413|49|74
Earl Averill|CLE|e20s|CF|1936|.318|.395|.534|238|70
Luke Appling|CHW|e20s|SS|1936|.310|.399|.398|45|179
Joe Jackson|CHW|e20s|LF|1919|.356|.423|.517|54|202
Josh Gibson|NLG|e20s|C|1937|.372|.458|.718|165|22
Oscar Charleston|NLG|e20s|CF|1925|.363|.449|.614|143|206
Buck Leonard|NLG|e20s|1B|1938|.345|.437|.590|127|30
Turkey Stearnes|NLG|e20s|CF|1928|.348|.410|.616|186|128
Cool Papa Bell|NLG|e20s|CF|1929|.325|.395|.446|55|285
Mule Suttles|NLG|e20s|1B|1926|.329|.393|.615|179|61
Pop Lloyd|NLG|e20s|SS|1919|.343|.412|.451|33|175
Judy Johnson|NLG|e20s|3B|1929|.301|.362|.408|24|66
# ---- 1940s-50s ----
Ted Williams|BOS|e40s|LF|1941|.344|.482|.634|521|24
Bobby Doerr|BOS|e40s|2B|1944|.288|.362|.461|223|54
Dom DiMaggio|BOS|e40s|CF|1950|.298|.383|.419|87|100
Johnny Pesky|BOS|e40s|SS|1946|.307|.394|.386|17|53
Joe DiMaggio|NYY|e40s|CF|1941|.325|.398|.579|361|30
Yogi Berra|NYY|e40s|C|1955|.285|.348|.482|358|30
Mickey Mantle|NYY|e40s|CF|1956|.298|.421|.557|536|153
Phil Rizzuto|NYY|e40s|SS|1950|.273|.351|.355|38|149
Jackie Robinson|LAD|e40s|2B|1949|.311|.409|.474|137|197
Roy Campanella|LAD|e40s|C|1953|.276|.360|.500|242|25
Duke Snider|LAD|e40s|CF|1955|.295|.380|.540|407|99
Gil Hodges|LAD|e40s|1B|1954|.273|.359|.487|370|63
Pee Wee Reese|LAD|e40s|SS|1949|.269|.366|.377|126|232
Stan Musial|STL|e40s|LF|1948|.331|.417|.559|475|78
Enos Slaughter|STL|e40s|RF|1949|.300|.382|.453|169|71
Red Schoendienst|STL|e40s|2B|1953|.289|.337|.387|84|89
Marty Marion|STL|e40s|SS|1944|.263|.323|.345|36|35
Larry Doby|CLE|e40s|CF|1952|.283|.386|.490|253|47
Lou Boudreau|CLE|e40s|SS|1948|.295|.380|.415|68|51
Al Rosen|CLE|e40s|3B|1953|.285|.384|.495|192|39
Willie Mays|SFG|e40s|CF|1954|.301|.384|.557|660|339
Monte Irvin|SFG|e40s|LF|1951|.293|.383|.475|99|28
Johnny Mize|SFG|e40s|1B|1947|.312|.397|.562|359|28
Hank Aaron|ATL|e40s|RF|1957|.305|.374|.555|755|240
Eddie Mathews|ATL|e40s|3B|1953|.271|.376|.509|512|68
Ralph Kiner|PIT|e40s|LF|1949|.279|.398|.548|369|22
Al Kaline|DET|e40s|RF|1955|.297|.376|.480|399|137
George Kell|DET|e40s|3B|1949|.306|.367|.414|78|51
Nellie Fox|CHW|e40s|2B|1957|.288|.348|.363|35|76
Minnie Minoso|CHW|e40s|LF|1954|.299|.389|.459|195|216
Ted Kluszewski|CIN|e40s|1B|1954|.298|.353|.498|279|20
# ---- 1960s-70s ----
Johnny Bench|CIN|e60s|C|1972|.267|.342|.476|389|68
Joe Morgan|CIN|e60s|2B|1976|.271|.392|.427|268|689
Pete Rose|CIN|e60s|LF|1973|.303|.375|.409|160|198
Tony Perez|CIN|e60s|1B|1970|.279|.341|.463|379|49
Dave Concepcion|CIN|e60s|SS|1979|.267|.322|.357|101|321
Ken Griffey Sr|CIN|e60s|RF|1976|.296|.359|.431|152|200
Brooks Robinson|BAL|e60s|3B|1964|.267|.322|.401|268|28
Frank Robinson|BAL|e60s|RF|1966|.294|.389|.537|586|204
Boog Powell|BAL|e60s|1B|1970|.266|.361|.462|339|20
Roberto Clemente|PIT|e60s|RF|1967|.317|.359|.475|240|83
Willie Stargell|PIT|e60s|LF|1971|.282|.360|.529|475|17
Bill Mazeroski|PIT|e60s|2B|1966|.260|.299|.367|138|27
Willie McCovey|SFG|e60s|1B|1969|.270|.374|.515|521|26
Orlando Cepeda|SFG|e60s|1B|1961|.297|.350|.499|379|142
Ernie Banks|CHC|e60s|SS|1958|.274|.330|.500|512|50
Billy Williams|CHC|e60s|LF|1972|.290|.361|.492|426|90
Ron Santo|CHC|e60s|3B|1967|.277|.362|.464|342|35
Carl Yastrzemski|BOS|e60s|LF|1967|.285|.379|.462|452|168
Carlton Fisk|BOS|e60s|C|1977|.269|.341|.457|376|128
Harmon Killebrew|MIN|e60s|1B|1969|.256|.376|.509|573|19
Rod Carew|MIN|e60s|2B|1977|.328|.393|.429|92|353
Tony Oliva|MIN|e60s|RF|1971|.304|.353|.476|220|86
Reggie Jackson|OAK|e60s|RF|1973|.262|.356|.490|563|228
Bert Campaneris|OAK|e60s|SS|1968|.259|.311|.342|79|649
Sal Bando|OAK|e60s|3B|1973|.254|.352|.408|242|75
Lou Brock|STL|e60s|LF|1968|.293|.343|.410|149|938
Curt Flood|STL|e60s|CF|1968|.293|.342|.389|85|88
Ted Simmons|STL|e60s|C|1975|.285|.348|.437|248|21
Maury Wills|LAD|e60s|SS|1962|.281|.330|.331|20|586
Steve Garvey|LAD|e60s|1B|1974|.294|.329|.446|272|83
Ron Cey|LAD|e60s|3B|1977|.261|.354|.445|316|24
Jimmy Wynn|HOU|e60s|CF|1969|.250|.366|.436|291|225
Rocky Colavito|CLE|e60s|RF|1958|.266|.359|.489|374|19
# ---- 1980s-90s ----
Rickey Henderson|OAK|e80s|LF|1990|.279|.401|.419|297|1406
Mark McGwire|OAK|e80s|1B|1998|.263|.394|.588|583|12
Jose Canseco|OAK|e80s|RF|1988|.266|.353|.515|462|200
Ozzie Smith|STL|e80s|SS|1987|.262|.337|.328|28|580
Willie McGee|STL|e80s|CF|1985|.295|.333|.396|79|352
Ryne Sandberg|CHC|e80s|2B|1984|.285|.344|.452|282|344
Andre Dawson|CHC|e80s|RF|1987|.279|.323|.482|438|314
Sammy Sosa|CHC|e80s|RF|1998|.273|.344|.534|609|234
Cal Ripken Jr|BAL|e80s|SS|1991|.276|.340|.447|431|36
Eddie Murray|BAL|e80s|1B|1983|.287|.359|.476|504|110
George Brett|KCR|e80s|3B|1980|.305|.369|.487|317|201
Willie Wilson|KCR|e80s|CF|1980|.285|.326|.376|41|668
Bo Jackson|KCR|e80s|LF|1989|.250|.309|.474|141|82
Wade Boggs|BOS|e80s|3B|1987|.328|.415|.443|118|24
Jim Rice|BOS|e80s|LF|1978|.298|.352|.502|382|58
Mo Vaughn|BOS|e80s|1B|1995|.293|.383|.523|328|30
Mike Schmidt|PHI|e80s|3B|1980|.267|.380|.527|548|174
Robin Yount|MIL|e80s|SS|1982|.285|.342|.430|251|271
Paul Molitor|MIL|e80s|3B|1987|.306|.369|.448|234|504
Tim Raines|MON|e80s|LF|1986|.294|.385|.425|170|808
Gary Carter|MON|e80s|C|1982|.262|.335|.439|324|39
Andre Thornton|CLE|e80s|1B|1982|.254|.360|.452|253|48
Darryl Strawberry|NYM|e80s|RF|1988|.259|.357|.505|335|221
Keith Hernandez|NYM|e80s|1B|1986|.296|.384|.436|162|98
Tony Gwynn|SDP|e80s|RF|1987|.338|.388|.459|135|319
Ken Griffey Jr|SEA|e80s|CF|1997|.284|.370|.538|630|184
Alex Rodriguez|SEA|e80s|SS|1996|.295|.380|.550|696|329
Edgar Martinez|SEA|e80s|3B|1995|.312|.418|.515|309|49
Jim Thome|CLE|e80s|1B|1997|.276|.402|.554|612|19
Manny Ramirez|CLE|e80s|RF|1999|.312|.411|.585|555|38
Albert Belle|CLE|e80s|LF|1995|.295|.369|.564|381|88
Kenny Lofton|CLE|e80s|CF|1994|.299|.372|.423|130|622
Omar Vizquel|CLE|e80s|SS|1999|.272|.336|.352|80|404
Roberto Alomar|TOR|e80s|2B|1993|.300|.371|.443|210|474
Joe Carter|TOR|e80s|RF|1993|.259|.306|.464|396|231
Jeff Bagwell|HOU|e80s|1B|1994|.297|.408|.540|449|202
Craig Biggio|HOU|e80s|2B|1997|.281|.363|.433|291|414
Chipper Jones|ATL|e80s|3B|1999|.303|.401|.529|468|150
Andruw Jones|ATL|e80s|CF|1998|.254|.337|.486|434|152
Javy Lopez|ATL|e80s|C|1998|.287|.337|.491|260|8
David Justice|ATL|e80s|RF|1993|.279|.378|.500|305|53
Barry Larkin|CIN|e80s|SS|1995|.295|.371|.444|198|379
Eric Davis|CIN|e80s|CF|1987|.269|.359|.482|282|349
Barry Bonds|PIT|e80s|LF|1992|.298|.444|.607|762|514
Ivan Rodriguez|TEX|e80s|C|1999|.296|.334|.464|311|127
Juan Gonzalez|TEX|e80s|RF|1996|.295|.343|.561|434|26
Rafael Palmeiro|TEX|e80s|1B|1999|.288|.371|.515|569|97
Frank Thomas|CHW|e80s|1B|1994|.301|.419|.555|521|32
Will Clark|SFG|e80s|1B|1989|.303|.384|.497|284|67
Matt Williams|SFG|e80s|3B|1994|.268|.317|.489|378|55
Don Mattingly|NYY|e80s|1B|1985|.307|.358|.471|222|14
Bernie Williams|NYY|e80s|CF|1998|.297|.381|.477|287|147
Paul ONeill|NYY|e80s|RF|1994|.288|.363|.470|281|141
Mike Piazza|LAD|e80s|C|1997|.308|.377|.545|427|17
# ---- 2000s ----
Albert Pujols|STL|e00s|1B|2003|.296|.374|.544|703|117
Yadier Molina|STL|e00s|C|2013|.277|.329|.399|176|68
Scott Rolen|STL|e00s|3B|2004|.281|.364|.490|316|118
Jim Edmonds|STL|e00s|CF|2004|.284|.376|.527|393|67
Derek Jeter|NYY|e00s|SS|2006|.310|.377|.440|260|358
Jorge Posada|NYY|e00s|C|2007|.273|.374|.474|275|20
David Ortiz|BOS|e00s|1B|2006|.286|.380|.552|541|17
Dustin Pedroia|BOS|e00s|2B|2008|.299|.365|.439|140|138
Kevin Youkilis|BOS|e00s|1B|2008|.281|.382|.478|150|25
Ichiro Suzuki|SEA|e00s|RF|2004|.311|.355|.402|117|509
Joe Mauer|MIN|e00s|C|2009|.306|.388|.439|143|52
Justin Morneau|MIN|e00s|1B|2006|.281|.348|.481|247|17
Torii Hunter|MIN|e00s|CF|2007|.277|.331|.461|353|195
Vladimir Guerrero|LAA|e00s|RF|2004|.318|.379|.553|449|181
Chase Utley|PHI|e00s|2B|2007|.275|.358|.465|259|154
Jimmy Rollins|PHI|e00s|SS|2007|.264|.324|.418|231|470
Ryan Howard|PHI|e00s|1B|2006|.258|.343|.515|382|18
Todd Helton|COL|e00s|1B|2000|.316|.414|.539|369|37
Larry Walker|COL|e00s|RF|1997|.313|.400|.565|383|230
Matt Holliday|COL|e00s|LF|2007|.299|.379|.510|316|108
Carlos Beltran|NYM|e00s|CF|2006|.279|.350|.486|435|312
David Wright|NYM|e00s|3B|2007|.296|.376|.491|242|196
Prince Fielder|MIL|e00s|1B|2007|.283|.382|.506|319|18
Ryan Braun|MIL|e00s|LF|2011|.296|.358|.532|352|216
Carlos Delgado|TOR|e00s|1B|2000|.280|.383|.546|473|14
Vernon Wells|TOR|e00s|CF|2006|.270|.319|.459|270|110
Aramis Ramirez|CHC|e00s|3B|2004|.283|.341|.492|386|13
Derrek Lee|CHC|e00s|1B|2005|.281|.365|.495|331|76
Lance Berkman|HOU|e00s|LF|2006|.293|.406|.537|366|86
Adam Dunn|CIN|e00s|LF|2004|.237|.364|.490|462|63
Magglio Ordonez|DET|e00s|RF|2007|.309|.369|.502|294|94
Grady Sizemore|CLE|e00s|CF|2008|.265|.349|.459|143|134
Victor Martinez|CLE|e00s|C|2007|.295|.360|.455|246|8
Luis Gonzalez|ARI|e00s|LF|2001|.283|.367|.479|354|128
# ---- 2010s-20s ----
Mike Trout|LAA|e10s|CF|2013|.299|.409|.581|378|212
Shohei Ohtani|LAA|e10s|RF|2023|.282|.372|.556|243|145
Mookie Betts|LAD|e10s|RF|2018|.294|.374|.518|279|186
Freddie Freeman|LAD|e10s|1B|2020|.301|.386|.512|352|118
Corey Seager|LAD|e10s|SS|2020|.285|.359|.512|220|20
Justin Turner|LAD|e10s|3B|2017|.285|.362|.460|195|30
Jose Altuve|HOU|e10s|2B|2017|.306|.361|.470|245|320
Carlos Correa|HOU|e10s|SS|2017|.272|.351|.469|190|20
George Springer|HOU|e10s|CF|2019|.262|.351|.474|300|100
Alex Bregman|HOU|e10s|3B|2019|.272|.366|.483|210|30
Aaron Judge|NYY|e10s|RF|2022|.288|.409|.599|350|40
Giancarlo Stanton|NYY|e10s|LF|2017|.262|.352|.531|430|55
Rafael Devers|BOS|e10s|3B|2021|.279|.343|.510|230|20
Xander Bogaerts|BOS|e10s|SS|2019|.291|.356|.458|180|100
JD Martinez|BOS|e10s|LF|2018|.286|.351|.519|350|20
Bryce Harper|PHI|e10s|RF|2015|.280|.392|.527|340|130
Juan Soto|WSN|e10s|LF|2021|.285|.421|.532|220|60
Anthony Rendon|WSN|e10s|3B|2019|.277|.360|.474|160|30
Francisco Lindor|NYM|e10s|SS|2018|.273|.341|.473|280|180
Pete Alonso|NYM|e10s|1B|2019|.249|.339|.516|240|10
Kris Bryant|CHC|e10s|3B|2016|.273|.369|.483|180|60
Anthony Rizzo|CHC|e10s|1B|2016|.263|.360|.470|300|60
Javier Baez|CHC|e10s|SS|2018|.254|.297|.443|180|80
Nolan Arenado|COL|e10s|3B|2019|.283|.343|.523|350|30
Charlie Blackmon|COL|e10s|CF|2017|.293|.355|.492|230|130
Trevor Story|COL|e10s|SS|2018|.265|.324|.485|170|110
Josh Donaldson|TOR|e10s|3B|2015|.259|.361|.487|279|40
Vladimir Guerrero Jr|TOR|e10s|1B|2021|.283|.360|.494|180|10
Bo Bichette|TOR|e10s|SS|2021|.293|.333|.463|130|60
Ronald Acuna Jr|ATL|e10s|RF|2023|.291|.386|.535|180|200
Ozzie Albies|ATL|e10s|2B|2021|.272|.324|.470|160|80
Matt Olson|ATL|e10s|1B|2023|.249|.343|.500|280|10
Austin Riley|ATL|e10s|3B|2021|.275|.342|.510|180|10
Byron Buxton|MIN|e10s|CF|2021|.246|.305|.470|130|90
Jose Ramirez|CLE|e10s|3B|2018|.280|.355|.510|280|250
Manny Machado|SDP|e10s|3B|2022|.280|.343|.489|350|100
Fernando Tatis Jr|SDP|e10s|RF|2021|.283|.357|.531|160|110
Christian Yelich|MIL|e10s|LF|2018|.285|.375|.463|200|180
Joey Votto|CIN|e10s|1B|2017|.294|.409|.511|356|90
Paul Goldschmidt|ARI|e10s|1B|2015|.289|.381|.510|360|160
Buster Posey|SFG|e10s|C|2012|.302|.372|.460|158|23
Brandon Crawford|SFG|e10s|SS|2015|.248|.316|.398|150|40
Nelson Cruz|SEA|e10s|LF|2014|.274|.343|.513|464|40
Julio Rodriguez|SEA|e10s|CF|2022|.273|.331|.463|90|100
Adrian Beltre|TEX|e10s|3B|2012|.286|.339|.480|477|121
Salvador Perez|KCR|e10s|C|2021|.265|.300|.464|280|10
Jose Abreu|CHW|e10s|1B|2020|.282|.339|.487|250|10
Tim Anderson|CHW|e10s|SS|2019|.284|.318|.417|90|110
Andrew McCutchen|PIT|e10s|CF|2013|.277|.368|.472|320|220
Willson Contreras|CHC|e10s|C|2022|.256|.348|.457|150|20
Yasmani Grandal|CHW|e10s|C|2019|.238|.351|.442|180|10
Gary Sanchez|NYY|e10s|C|2017|.222|.310|.463|180|10
Sean Murphy|ATL|e10s|C|2023|.240|.331|.437|100|5
Christian Vazquez|BOS|e10s|C|2019|.259|.306|.386|70|20
`

const PITCHERS = `
# name | franchise | era | positions | peak | ERA | W | SO | WHIP
# ---- 1920s-30s ----
Walter Johnson|WSH|e20s|SP|1913|2.17|417|3509|1.06
Christy Mathewson|SFG|e20s|SP|1908|2.13|373|2507|1.06
Cy Young|CLE|e20s|SP|1901|2.63|511|2803|1.13
Grover Alexander|PHI|e20s|SP|1915|2.56|373|2198|1.12
Lefty Grove|OAK|e20s|SP|1931|3.06|300|2266|1.28
Dizzy Dean|STL|e20s|SP|1934|3.02|150|1163|1.21
Carl Hubbell|SFG|e20s|SP|1933|2.98|253|1677|1.17
Red Faber|CHW|e20s|SP|1921|3.15|254|1471|1.30
Waite Hoyt|NYY|e20s|SP|1927|3.59|237|1206|1.34
Satchel Paige|NLG|e20s|SP|1935|2.79|146|1231|1.06
Smokey Joe Williams|NLG|e20s|SP|1914|2.52|110|1053|1.05
Bullet Rogan|NLG|e20s|SP|1924|2.65|119|976|1.15
# ---- 1940s-50s ----
Bob Feller|CLE|e40s|SP|1946|3.25|266|2581|1.32
Warren Spahn|ATL|e40s|SP|1953|3.09|363|2583|1.19
Whitey Ford|NYY|e40s|SP|1961|2.75|236|1956|1.22
Robin Roberts|PHI|e40s|SP|1952|3.41|286|2357|1.17
Early Wynn|CLE|e40s|SP|1954|3.54|300|2334|1.33
Hal Newhouser|DET|e40s|SP|1945|3.06|207|1796|1.31
Don Newcombe|LAD|e40s|SP|1956|3.56|149|1129|1.21
Allie Reynolds|NYY|e40s|SP|1952|3.30|182|1423|1.34
Hoyt Wilhelm|SFG|e40s|RP|1952|2.52|143|1610|1.13
# ---- 1960s-70s ----
Sandy Koufax|LAD|e60s|SP|1965|2.76|165|2396|1.11
Bob Gibson|STL|e60s|SP|1968|2.91|251|3117|1.19
Tom Seaver|NYM|e60s|SP|1971|2.86|311|3640|1.12
Nolan Ryan|HOU|e60s|SP|1973|3.19|324|5714|1.25
Steve Carlton|PHI|e60s|SP|1972|3.22|329|4136|1.25
Jim Palmer|BAL|e60s|SP|1975|2.86|268|2212|1.18
Juan Marichal|SFG|e60s|SP|1966|2.89|243|2303|1.10
Ferguson Jenkins|CHC|e60s|SP|1971|3.34|284|3192|1.14
Gaylord Perry|CLE|e60s|SP|1972|3.11|314|3534|1.18
Don Drysdale|LAD|e60s|SP|1962|2.95|209|2486|1.15
Catfish Hunter|OAK|e60s|SP|1974|3.26|224|2012|1.13
Phil Niekro|ATL|e60s|SP|1969|3.35|318|3342|1.27
Rollie Fingers|OAK|e60s|RP|1974|2.90|114|1299|1.16
Sparky Lyle|NYY|e60s|RP|1977|2.88|99|873|1.28
# ---- 1980s-90s ----
Roger Clemens|BOS|e80s|SP|1997|3.12|354|4672|1.17
Greg Maddux|ATL|e80s|SP|1995|3.16|355|3371|1.14
Randy Johnson|SEA|e80s|SP|1999|3.29|303|4875|1.17
Tom Glavine|ATL|e80s|SP|1991|3.54|305|2607|1.31
John Smoltz|ATL|e80s|SP|1996|3.33|213|3084|1.18
Pedro Martinez|BOS|e80s|SP|1999|2.93|219|3154|1.05
Curt Schilling|PHI|e80s|SP|1997|3.46|216|3116|1.14
Mike Mussina|BAL|e80s|SP|1992|3.68|270|2813|1.19
Dwight Gooden|NYM|e80s|SP|1985|3.51|194|2293|1.26
Orel Hershiser|LAD|e80s|SP|1988|3.48|204|2014|1.26
Jack Morris|DET|e80s|SP|1986|3.90|254|2478|1.30
Bret Saberhagen|KCR|e80s|SP|1989|3.34|167|1715|1.14
David Cone|NYY|e80s|SP|1994|3.46|194|2668|1.26
Kevin Brown|TEX|e80s|SP|1996|3.28|211|2397|1.22
Dennis Eckersley|OAK|e80s|RP|1990|3.50|197|2401|1.16
Lee Smith|CHC|e80s|RP|1991|3.03|71|1251|1.26
Bruce Sutter|STL|e80s|RP|1984|2.83|68|861|1.14
Goose Gossage|NYY|e80s|RP|1980|3.01|124|1502|1.23
Trevor Hoffman|SDP|e80s|RP|1998|2.87|61|1133|1.06
Billy Wagner|HOU|e80s|RP|1999|2.31|47|1196|1.00
John Wetteland|MON|e80s|RP|1993|2.93|48|804|1.14
# ---- 2000s ----
Roy Halladay|TOR|e00s|SP|2003|3.38|203|2117|1.18
Johan Santana|MIN|e00s|SP|2004|3.20|139|1988|1.13
CC Sabathia|CLE|e00s|SP|2007|3.74|251|3093|1.26
Tim Lincecum|SFG|e00s|SP|2008|3.74|110|1736|1.29
Felix Hernandez|SEA|e00s|SP|2010|3.42|169|2524|1.20
Cliff Lee|PHI|e00s|SP|2008|3.52|143|1824|1.20
Chris Carpenter|STL|e00s|SP|2005|3.76|144|1697|1.26
Andy Pettitte|NYY|e00s|SP|2005|3.85|256|2448|1.35
Josh Beckett|BOS|e00s|SP|2007|3.88|138|1901|1.25
Brandon Webb|ARI|e00s|SP|2006|3.27|87|1065|1.24
Mariano Rivera|NYY|e00s|RP|2005|2.21|82|1173|1.00
Joe Nathan|MIN|e00s|RP|2006|2.87|64|976|1.12
Francisco Rodriguez|LAA|e00s|RP|2008|2.86|52|1122|1.16
Jonathan Papelbon|BOS|e00s|RP|2007|2.44|39|809|1.03
# ---- 2010s-20s ----
Clayton Kershaw|LAD|e10s|SP|2014|2.50|216|2968|1.00
Justin Verlander|HOU|e10s|SP|2019|3.24|262|3400|1.13
Max Scherzer|WSN|e10s|SP|2018|3.16|216|3400|1.10
Jacob deGrom|NYM|e10s|SP|2018|2.53|87|1667|1.00
Madison Bumgarner|SFG|e10s|SP|2014|3.45|134|1900|1.13
Gerrit Cole|NYY|e10s|SP|2019|3.20|153|2200|1.10
Corey Kluber|CLE|e10s|SP|2017|3.32|118|1700|1.10
Zack Greinke|ARI|e10s|SP|2015|3.49|225|2979|1.16
Chris Sale|CHW|e10s|SP|2017|3.10|138|2500|1.04
Jon Lester|CHC|e10s|SP|2016|3.66|200|2488|1.28
Stephen Strasburg|WSN|e10s|SP|2019|3.24|113|1723|1.10
Blake Snell|SDP|e10s|SP|2023|3.20|75|1300|1.20
Shane Bieber|CLE|e10s|SP|2020|3.20|62|1000|1.10
Kenley Jansen|LAD|e10s|RP|2017|2.60|45|1150|0.98
Craig Kimbrel|ATL|e10s|RP|2012|2.60|45|1200|1.03
Aroldis Chapman|NYY|e10s|RP|2016|2.55|48|1250|1.05
Edwin Diaz|NYM|e10s|RP|2022|2.90|30|800|1.05
Josh Hader|MIL|e10s|RP|2021|2.50|25|700|0.95
Liam Hendriks|CHW|e10s|RP|2021|3.50|30|750|1.15
`

export const PLAYERS = [
  ...parsePlayers(BATTERS, { stats: ['avg', 'obp', 'slg', 'hr', 'sb'] }),
  ...parsePlayers(PITCHERS, { stats: ['era', 'w', 'so', 'whip'] }),
]
