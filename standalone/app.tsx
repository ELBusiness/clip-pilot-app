/**
 * Single-file build entry.
 *
 * Same engine, same roster pack, same components as the Next app. The only
 * difference is the document skeleton, which is why this file is four lines:
 * the game is one screen, so there is nothing to route.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Game from '@/components/Game'

const host = document.getElementById('root')
if (host) {
  createRoot(host).render(
    <StrictMode>
      <Game />
    </StrictMode>,
  )
}
