/**
 * Single-file build entry.
 *
 * Same engine, same sport packs, same components as the Next app — the only
 * difference is that routing collapses into one piece of state, because this
 * build is one HTML file with no server and no router. That constraint is what
 * makes it portable: it opens from a link on any phone with nothing installed.
 */

import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SPORTS } from '@/sports'
import Game from '@/components/Game'
import type { SportId } from '@/engine/types'

function App() {
  const [sportId, setSportId] = useState<SportId | null>(null)

  if (sportId) {
    return <Game key={sportId} sportId={sportId} onBack={() => setSportId(null)} />
  }

  return (
    <main className="shell">
      <h1 className="home-title">
        Perfect
        <br />
        <em>Season</em>
      </h1>
      <p className="home-sub">
        Spin for a franchise and an era. Draft one legend at a time. Then find out how
        close your roster gets to a season without a single loss.
      </p>

      <nav className="sport-grid">
        {SPORTS.map((sport) => (
          <button key={sport.id} className="sport-card" onClick={() => setSportId(sport.id)}>
            <span className="sport-record num">{sport.slug}</span>
            <span>
              <span className="sport-name">
                {sport.sport} · {sport.league}
              </span>
              <span className="sport-tag">{sport.tagline}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="spacer" />

      <p className="sport-tag" style={{ marginTop: 20 }}>
        Every run is seeded, so the same seed replays the exact same draft. Records are
        measured against what real teams actually did.
      </p>
    </main>
  )
}

const host = document.getElementById('root')
if (host) {
  createRoot(host).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
