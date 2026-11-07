import { describe, expect, it } from 'vitest'
import { initials, teamView } from './team'

describe('membres du groupe (E1)', () => {
  it('calcule les initiales sans inventer de nom', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('Jean-Pierre Martin Durand')).toBe('JD')
    expect(initials('Zoé')).toBe('Z')
    expect(initials(null)).toBe('?')
    expect(initials('   ')).toBe('?')
  })

  it('signale les membres non renseignés', () => {
    const v = teamView([{ name: null }, { name: 'Ada Lovelace', role: 'interface' }])
    expect(v[0]).toMatchObject({ label: 'Membre 1 — à compléter', initials: '?', missing: true })
    expect(v[1]).toMatchObject({ label: 'Ada Lovelace · interface', initials: 'AL', missing: false })
  })
})
