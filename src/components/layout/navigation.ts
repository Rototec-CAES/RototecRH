/** Menú lateral y breadcrumb: una sola fuente para ambos. */

export interface NavItemDef {
  to: string
  label: string
  icon: string
  /** Texto de ayuda que aparece al pasar el mouse */
  hint: string
}

export interface NavSection {
  label: string
  items: NavItemDef[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Personal',
    items: [
      { to: '/empleados', label: 'Empleados', icon: 'solar:users-group-rounded-bold', hint: 'Expedientes, altas, bajas y datos del personal' },
      { to: '/organizacion', label: 'Organización', icon: 'solar:structure-bold', hint: 'Departamentos, áreas y puestos' },
      { to: '/capacitaciones', label: 'Capacitaciones', icon: 'solar:diploma-bold', hint: 'Pensums, asignaciones y carnés' },
    ],
  },
  {
    label: 'Tiempo',
    items: [
      { to: '/carga-turnos', label: 'Carga de turnos', icon: 'solar:upload-square-bold', hint: 'Subir el archivo de turnos programados' },
      { to: '/asistencias', label: 'Asistencias', icon: 'solar:calendar-mark-bold', hint: 'Marcajes del reloj contra el turno programado' },
      { to: '/ausencias', label: 'Ausencias', icon: 'solar:calendar-minimalistic-bold', hint: 'Vacaciones, IGSS, permisos y faltas' },
      { to: '/horas-extra', label: 'Horas Extra', icon: 'solar:clock-circle-bold', hint: 'Cálculo de horas extra por semana' },
    ],
  },
  {
    label: 'Nómina',
    items: [{ to: '/planilla', label: 'Planilla', icon: 'solar:wallet-money-bold', hint: 'Generar y revisar la planilla quincenal' }],
  },
]

export const NAV_ITEMS: NavItemDef[] = NAV_SECTIONS.flatMap((s) => s.items)

export interface Crumb {
  label: string
  href?: string
}

/** Subpáginas conocidas (todo lo que no es la raíz de una sección del menú). */
function subpagina(seccion: NavItemDef, resto: string[]): string | null {
  if (resto.length === 0) return null
  if (seccion.to === '/empleados') {
    if (resto[0] === 'nuevo') return 'Nuevo empleado'
    if (resto[0] === 'actualizacion-masiva') return 'Actualización masiva'
    if (resto[1] === 'editar') return 'Editar empleado'
    return 'Ficha del empleado'
  }
  if (seccion.to === '/asistencias') return 'Asistencia del empleado'
  return 'Detalle'
}

/** RH › Sección › Subpágina */
export function buildBreadcrumb(pathname: string): Crumb[] {
  const seccion = NAV_ITEMS.find((n) => pathname === n.to || pathname.startsWith(n.to + '/'))
  const crumbs: Crumb[] = [{ label: 'RH', href: '/empleados' }]
  if (!seccion) return crumbs
  const resto = pathname.slice(seccion.to.length).split('/').filter(Boolean)
  const sub = subpagina(seccion, resto)
  crumbs.push({ label: seccion.label, href: sub ? seccion.to : undefined })
  if (sub) crumbs.push({ label: sub })
  return crumbs
}
