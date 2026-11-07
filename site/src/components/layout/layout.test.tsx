import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { ViewId } from '@/app/views'
import { AppFrame } from './AppFrame'
import { NavIsland } from './NavIsland'
import { TeamHeader } from './TeamHeader'

function FrameHarness() {
  const [collapsed, setCollapsed] = useState(false)
  return <AppFrame map={<p>carte</p>} panel={<p>contenu du panneau</p>} collapsed={collapsed} onTogglePanel={() => setCollapsed((c) => !c)} />
}

function NavHarness() {
  const [view, setView] = useState<ViewId>('data')
  return <NavIsland active={view} onChange={setView} />
}

describe('coque', () => {
  it('la poignée replie et déplie le panneau, état annoncé', async () => {
    render(<FrameHarness />)
    const handle = screen.getByRole('button', { name: 'Replier le panneau' })
    expect(handle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(handle)
    expect(screen.getByRole('button', { name: 'Déplier le panneau' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('contenu du panneau')).not.toBeVisible()
  })

  it('l’îlot de navigation marque la vue active (aria-current)', async () => {
    render(<NavHarness />)
    expect(screen.getByRole('button', { name: 'Données' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Tournées' }))
    expect(screen.getByRole('button', { name: 'Tournées' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Données' })).not.toHaveAttribute('aria-current')
  })

  it('l’en-tête liste les 4 membres sans inventer de nom (E1)', () => {
    render(<TeamHeader />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(screen.getByRole('list', { name: 'Membres du groupe' })).toBeInTheDocument()
  })
})
