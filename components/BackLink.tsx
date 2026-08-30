'use client'

import Link from 'next/link'

/**
 * "All sports" navigation.
 *
 * In the Next app this is a route change. In the standalone single-file build
 * (one page, no router) there is nowhere to navigate to, so the caller passes
 * `onBack` and it becomes a state change instead. Keeping this decision in one
 * component is what lets both builds share Game and SeasonReport verbatim.
 */
export default function BackLink({ onBack }: { onBack?: () => void }) {
  if (onBack) {
    return (
      <button onClick={onBack} style={{ color: 'var(--text-faint)', fontSize: 14, fontWeight: 600, padding: '6px 0' }}>
        ← All sports
      </button>
    )
  }
  return <Link href="/">← All sports</Link>
}
