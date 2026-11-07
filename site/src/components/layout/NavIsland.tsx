/**
 * Rôle : îlot de navigation en verre (5 vues) posé sur la carte ; le bouton actif est blanc plein et porte son libellé.
 * Accessibilité : <nav> nommée, `aria-current="page"` sur la vue active, libellé de chaque bouton toujours présent
 *   (visible pour l'actif, info-bulle + nom accessible pour les autres).
 */
import { VIEWS, type ViewId } from '@/app/views'
import { fr } from '@/i18n/fr'

interface Props {
  active: ViewId
  onChange: (v: ViewId) => void
}

export function NavIsland({ active, onChange }: Props) {
  return (
    <nav aria-label={fr.nav.label} className="glass inline-flex items-center gap-1 rounded-full p-1">
      {VIEWS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(id)}
            className={`inline-flex h-10 items-center gap-2 rounded-full transition-colors ${
              isActive ? 'bg-white px-4 text-ink' : 'w-10 justify-center text-on-dark hover:bg-white/10'
            }`}
          >
            <Icon size={18} aria-hidden />
            <span className={isActive ? 'text-sm font-semibold' : 'sr-only'}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
