import Link from 'next/link'
import { SPORTS } from '@/sports'

export default function Home() {
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
          <Link key={sport.id} href={`/${sport.slug}`} className="sport-card">
            <span className="sport-record num">{sport.slug}</span>
            <span>
              <span className="sport-name">
                {sport.sport} · {sport.league}
              </span>
              <span className="sport-tag">{sport.tagline}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="spacer" />

      <p className="sport-tag" style={{ marginTop: 20 }}>
        Every run is seeded, so a share link replays the exact same draft. Records are
        measured against what real teams actually did.
      </p>
    </main>
  )
}
