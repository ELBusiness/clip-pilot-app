import { baseball } from './baseball'

/**
 * One game, one sport. The Ruleset shape stays because baseball implements it
 * and the engine is written against it, but this ships as a single MLB game:
 * competing in four verticals at once means being second-best in all of them.
 */
export const baseballGame = baseball
export { baseball }
