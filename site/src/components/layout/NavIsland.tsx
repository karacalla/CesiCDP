/**
 * Rôle : navigation entre les 5 vues : boutons ronds en verre, DÉTACHÉS les uns des autres (identité de la
 *   maquette) ; l'actif est blanc plein. Libellé en info-bulle et en nom accessible ; `aria-current="page"`.
 */
import { VIEWS, type ViewId } from '@/app/views'
import { fr } from '@/i18n/fr'

interface Props {
  active: ViewId
  onChange: (v: ViewId) => void
}

export function NavIsland({ active, onChange }: Props) {
  return (
    <nav aria-label={fr.nav.label}>
      <ul className="flex items-center gap-2">
        {VIEWS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active
          return (
            <li key={id}>
              <button
                type="button"
                title={label}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onChange(id)}
                className={`grid size-10 place-items-center rounded-full transition-colors ${isActive ? 'bg-white text-ink shadow-lg' : 'glass text-on-dark hover:bg-black/60'}`}
              >
                <Icon size={18} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
