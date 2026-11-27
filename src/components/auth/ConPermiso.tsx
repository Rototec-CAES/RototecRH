import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { Skeleton } from '@/components/ui/skeleton'
import type { AccionRH, PaginaRH } from '@/api/permisos'
import { usePermisos } from '@/hooks/usePermisos'
import { NAV_ITEMS } from '@/components/layout/navigation'

function Cargando() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  )
}

export function SinAcceso({ mensaje }: { mensaje?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center" data-testid="rh-sin-acceso">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon icon="solar:lock-keyhole-bold" width={26} />
      </span>
      <h2 className="text-lg font-semibold text-slate-900">Sin acceso</h2>
      <p className="max-w-sm text-sm text-slate-500">
        {mensaje ?? 'Tu usuario no tiene permiso para esta pantalla. Si lo necesitas, pídeselo al administrador.'}
      </p>
    </div>
  )
}

/** Muestra la pantalla solo si el usuario tiene `accion` (por defecto 'leer') en `pagina`. */
export function ConPermiso({
  pagina,
  accion = 'leer',
  children,
}: {
  pagina: PaginaRH
  accion?: AccionRH
  children: ReactNode
}) {
  const { puede, cargando } = usePermisos()
  if (cargando) return <Cargando />
  if (!puede(pagina, accion)) return <SinAcceso />
  return <>{children}</>
}

/** Inicio y rutas desconocidas: a la primera pantalla del menú que el usuario puede ver. */
export function InicioSegunPermisos() {
  const { puede, cargando } = usePermisos()
  if (cargando) return <Cargando />
  const primera = NAV_ITEMS.find((i) => puede(i.permiso))
  if (!primera) {
    return <SinAcceso mensaje="Tu usuario todavía no tiene permisos en la app de Recursos Humanos. Pídeselos al administrador." />
  }
  return <Navigate to={primera.to} replace />
}
