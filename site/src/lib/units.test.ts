import { describe, expect, it } from 'vitest'
import { formatDistance } from './units'

describe('formatDistance', () => {
  it('convertit les mètres en kilomètres pour une instance géographique', () => {
    expect(formatDistance(12_400, false)).toBe('12,4 km')
  })
  it('garde l’unité de l’instance pour des coordonnées planes', () => {
    expect(formatDistance(827.3, true)).toBe('827,3 u')
  })
  it('affiche un tiret si la distance n’est pas fournie', () => {
    expect(formatDistance(null, true)).toBe('—')
  })
})
