# Data license and attribution

The roster pack in `sports/baseball/players.generated.ts` is derived from the
**Lahman Baseball Database / Chadwick Baseball Databank**.

- Source: <https://sabr.org/lahman-database/>
- License: **Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)**
- Copyright (C) 1996-2021 Sean Lahman. Most data is provided by the
  [Chadwick Baseball Bureau](https://www.chadwick-bureau.com).

## What this means for this project

CC BY-SA is a copyleft license. Two obligations follow, and they are real:

1. **Attribution.** Any distribution of this data, or of a work built on it,
   must credit Sean Lahman and the Chadwick Baseball Bureau. The generated file
   carries the notice in its header; a shipped app should carry it somewhere a
   user can find, such as an About screen.

2. **ShareAlike.** Data derived from the databank must itself be offered under
   CC BY-SA 3.0 or a compatible license. This applies to the *derived data* —
   the generated roster pack — not automatically to the game code around it,
   but the boundary is worth a lawyer's read before a commercial launch.

If those terms do not suit the intended use, the options are to license a
commercial statistics feed instead, or to regenerate the pack from a source
with different terms. The importer is deliberately the only thing that touches
the raw database, so swapping the source means changing one script.

## Note on player names

Statistics are facts and are not copyrightable. Player names and likenesses are
a separate question governed by right-of-publicity law, which varies by state
and country. No league logos, team marks, or player images are used or bundled
in this project.
