import { describe, expect, it } from 'vitest'
import { cameraPadding, NO_INSETS } from './cameraPadding'

const vp = { width: 1280, height: 800 }

describe('cameraPadding', () => {
  it('bulle latérale : marge droite = largeur occupée depuis le bord gauche de la bulle', () => {
    expect(cameraPadding({ top: 10, right: 20, bottom: 10, left: 10 }, vp, { left: 760, top: 20, width: 500, height: 760 })).toEqual({ top: 10, right: 540, bottom: 10, left: 10 })
  })
  it('feuille du bas : marge basse', () => {
    expect(cameraPadding(NO_INSETS, { width: 768, height: 1000 }, { left: 12, top: 508, width: 744, height: 480 })).toEqual({ top: 0, right: 0, bottom: 492, left: 0 })
  })
  it('bulle repliée ou absente : marge inchangée', () => {
    expect(cameraPadding(NO_INSETS, vp, null)).toEqual(NO_INSETS)
    expect(cameraPadding(NO_INSETS, vp, { left: 0, top: 0, width: 0, height: 0 })).toEqual(NO_INSETS)
  })
})
