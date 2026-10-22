import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/stores/ui.store'
import { cn, getInitials } from '@/lib/utils'
import { NAV_SECTIONS, type NavItemDef } from './navigation'

const AVATAR_BG = { background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? `${item.label} — ${item.hint}` : item.hint}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive ? 'bg-sky-500/15 text-sky-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon icon={item.icon} width={18} />
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

export function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUiStore()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const nombre = user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.username : 'Usuario'
  const detalle = user?.puesto || user?.departamento || user?.username || 'Rototec HR'
  const iniciales = user ? getInitials(user.nombre || user.username, user.apellido) : '·'

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 264 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="flex h-screen shrink-0 flex-col overflow-hidden bg-slate-900"
    >
      {/* Header: logo + toggle */}
      {collapsed ? (
        <div className="flex shrink-0 flex-col items-center gap-2 px-3 pb-3 pt-4">
          <img
            src="/logo_rototec.png"
            alt="Rototec"
            style={{ height: 22, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.82 }}
          />
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expandir menú"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
          >
            <Icon icon="solar:alt-arrow-right-bold" width={13} />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-4">
          <img
            src="/logo_rototec.png"
            alt="Rototec"
            style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.88 }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold leading-none tracking-widest text-white">RECURSOS HUMANOS</p>
            <p className="mt-1 text-[10px] leading-none text-slate-500">v2.0 · Rototec</p>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Colapsar menú"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
          >
            <Icon icon="solar:alt-arrow-left-bold" width={13} />
          </button>
        </div>
      )}

      {/* Tarjeta de usuario */}
      {collapsed ? (
        <div className="mb-3 flex justify-center px-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={AVATAR_BG}
            title={nombre}
          >
            {iniciales}
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800 p-3"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={AVATAR_BG}
            >
              {iniciales}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">{nombre}</p>
              <p className="truncate text-[11px] text-slate-500">{detalle}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Navegación */}
      <nav className="mb-4 flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.label} className="space-y-0.5">
            {collapsed ? (
              i > 0 && <div className="mx-3 my-2 border-t border-slate-800" />
            ) : (
              <p className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Pie: cerrar sesión */}
      <div className="mt-2 shrink-0 border-t border-slate-800 px-2 pb-3 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          title="Cerrar sesión"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          <Icon icon="solar:logout-2-bold" width={18} className="shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </motion.aside>
  )
}
