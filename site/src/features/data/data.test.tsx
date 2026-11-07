import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeGen1000 } from '@/data/gen1000'
import { useVrp } from '@/store/vrp'
import { EditableCell } from './EditableCell'

describe('store des données : seules des données valides y entrent', () => {
  beforeEach(() => useVrp.setState({ instance: makeGen1000(10), status: 'ready' }))

  it('refuse une modification invalide et garde la valeur précédente', () => {
    const before = useVrp.getState().instance?.customers[0]
    const errors = useVrp.getState().updateCustomer(1, { lat: 123 })
    expect(errors[0]?.message).toMatch(/globe/)
    expect(useVrp.getState().instance?.customers[0]).toEqual(before)
  })

  it('accepte une modification valide', () => {
    expect(useVrp.getState().updateCustomer(1, { demand: 7 })).toEqual([])
    expect(useVrp.getState().instance?.customers[0]?.demand).toBe(7)
  })

  it('ajoute puis supprime un client', () => {
    const id = useVrp.getState().addCustomer()
    expect(id).toBe(11)
    expect(useVrp.getState().instance?.customers).toHaveLength(11)
    useVrp.getState().removeCustomer(11)
    expect(useVrp.getState().instance?.customers).toHaveLength(10)
  })

  it('GEN-1000 est déterministe (même graine, mêmes clients)', () => {
    expect(makeGen1000(1000)).toEqual(makeGen1000(1000))
    expect(makeGen1000(1000).customers).toHaveLength(1000)
  })
})

describe('cellule éditable', () => {
  it('Entrée valide, Échap annule, une erreur est annoncée', async () => {
    const commits: string[] = []
    render(<EditableCell value="4" label="Demande — Client 1" onCommit={(t) => (commits.push(t), t === '-1' ? [{ field: 'demand', message: 'demande : demande négative' }] : [])} />)
    const input = screen.getByRole('textbox', { name: 'Demande — Client 1' })
    await userEvent.clear(input)
    await userEvent.type(input, '-1{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('demande négative')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(input, '{Escape}')
    expect(input).toHaveValue('4')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(commits).toEqual(['-1'])
  })
})
