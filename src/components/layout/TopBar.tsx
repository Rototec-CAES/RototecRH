import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import { buildBreadcrumb } from './navigation'

export function TopBar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const crumbs = buildBreadcrumb(pathname)

  const nombre = user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.username : ''
  const detalle = user?.puesto || user?.departamento || user?.username || ''

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5">
      {/* Breadcrumb */}
      <nav aria-label="Ubicación" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm">
        {crumbs.map((c, i) => (
          <div key={i} className="flex min-w-0 shrink-0 items-center gap-1.5">
            {i > 0 && <Icon icon="solar:alt-arrow-right-bold" width={10} className="shrink-0 text-slate-300" />}
            {i === crumbs.length - 1 ? (
              <span className="truncate font-medium text-slate-800">{c.label}</span>
            ) : c.href ? (
              <Link
                to={c.href}
                className="whitespace-nowrap font-semibold text-sky-500 underline-offset-2 transition-colors hover:text-sky-600 hover:underline"
              >
                {c.label}
              </Link>
            ) : (
              <span className="whitespace-nowrap text-slate-400">{c.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Usuario */}
      {user && (
        <div className="ml-4 flex shrink-0 items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}
          >
            {getInitials(user.nombre || user.username, user.apellido)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-slate-800">{nombre}</p>
            {detalle && <p className="text-xs leading-tight text-slate-400">{detalle}</p>}
          </div>
        </div>
      )}
    </header>
  )
}
