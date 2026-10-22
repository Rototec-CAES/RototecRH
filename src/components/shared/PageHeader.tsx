import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Título principal de la página */
  titulo: ReactNode
  /** Subtítulo / descripción breve */
  descripcion?: ReactNode
  /** Icono Solar (p. ej. 'solar:calendar-bold'). Si se omite no se muestra. */
  icono?: string
  /** Acciones en el lado derecho (botones, badges, etc.) */
  children?: ReactNode
  className?: string
}

/**
 * Encabezado de página: ícono + título + descripción + acciones.
 * El breadcrumb lo maneja el TopBar.
 */
export function PageHeader({ titulo, descripcion, icono, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icono && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 shadow-md">
            <Icon icon={icono} width={20} className="text-white" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sm text-slate-500">{descripcion}</p>}
        </div>
      </div>

      {children && <div className="mt-1 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
