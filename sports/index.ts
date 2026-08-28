import type { Ruleset, SportId } from '@/engine/types'
import { baseball } from './baseball'
import { basketball } from './basketball'
import { football } from './football'
import { soccer } from './soccer'

/** Every sport pack, in the order they appear on the home screen. */
export const SPORTS: Ruleset[] = [baseball, basketball, football, soccer]

export const SPORTS_BY_ID: Record<SportId, Ruleset> = {
  baseball,
  basketball,
  football,
  soccer,
}

export function bySlug(slug: string): Ruleset | undefined {
  return SPORTS.find((s) => s.slug === slug)
}

export { baseball, basketball, football, soccer }
