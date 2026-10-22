/**
 * Átomos de UI para reportes (port de la intranet): KpiCard, Panel, Tag,
 * Segmented, GuiaLectura, RangoFechas y Skeleton. (EChart no se incluye: RH
 * todavía no tiene gráficas; si se agregan, instalar echarts + echarts-for-react.)
 */
import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

/* ── Skeleton ── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />
}

/* ── KpiCard ── */

const ACCENTS = {
  slate: 'from-slate-500 to-slate-600',
  rose: 'from-rose-500 to-rose-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  cyan: 'from-cyan-500 to-cyan-600',
  violet: 'from-violet-500 to-violet-600',
  sky: 'from-sky-500 to-sky-600',
} as const

export type Accent = keyof typeof ACCENTS

interface KpiCardProps {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  accent?: Accent
  /** Icono Solar opcional a la derecha */
  icon?: string
  loading?: boolean
  testId?: string
  className?: string
}

const ICON_TONES: Record<Accent, string> = {
  slate: 'bg-slate-100 text-slate-600',
  rose: 'bg-rose-50 text-rose-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  violet: 'bg-violet-50 text-violet-600',
  sky: 'bg-sky-50 text-sky-600',
}

export function KpiCard({ label, value, hint, accent = 'slate', icon, loading, testId, className }: KpiCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md',
        className,
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', ACCENTS[accent])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-[70%]" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ICON_TONES[accent])}>
            <Icon icon={icon} width={18} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Panel ── */

interface PanelProps {
  title?: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  /** Icono Solar opcional junto al título */
  icon?: string
  children: ReactNode
  className?: string
  /** Sin padding interno (para tablas a todo el ancho del panel) */
  flush?: boolean
}

export function Panel({ title, subtitle, right, icon, children, className, flush }: PanelProps) {
  const header = (title || right) && (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', flush ? 'border-b border-slate-100 px-5 py-4' : 'mb-4')}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Icon icon={icon} width={16} />
          </div>
        )}
        <div className="min-w-0">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', flush ? 'overflow-hidden' : 'p-5', className)}>
      {header}
      {children}
    </div>
  )
}

/* ── Tag (estado en pill) ── */

export type Severidad = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'primary'

const SEVERIDADES: Record<Severidad, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  info: 'bg-sky-100 text-sky-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  secondary: 'bg-slate-100 text-slate-600',
  primary: 'bg-indigo-100 text-indigo-700',
}

export function Tag({
  value,
  severity = 'primary',
  icon,
  className,
  title,
}: {
  value: ReactNode
  severity?: Severidad
  icon?: string
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        SEVERIDADES[severity],
        className,
      )}
    >
      {icon && <Icon icon={icon} width={12} className="shrink-0" />}
      {value}
    </span>
  )
}

/* ── Segmented (botones tipo SelectButton) ── */

interface SegmentedProps<T extends string | boolean> {
  value: T
  onChange: (v: T) => void
  options: { label: ReactNode; value: T }[]
  testId?: string
  disabled?: boolean
  className?: string
}

export function Segmented<T extends string | boolean>({ value, onChange, options, testId, disabled, className }: SegmentedProps<T>) {
  return (
    <div
      data-testid={testId}
      className={cn('inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-sm', className)}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 transition-colors disabled:opacity-50',
            o.value === value ? 'bg-cyan-600 font-medium text-white' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Guía de lectura desmontable ── */

interface GuiaLecturaProps {
  visible: boolean
  onOcultar: () => void
  items: { titulo: string; texto: string }[]
  titulo?: string
  columnas?: 2 | 3 | 4
  testId?: string
}

export function GuiaLectura({ visible, onOcultar, items, titulo = 'Cómo leer este reporte', columnas = 4, testId }: GuiaLecturaProps) {
  if (!visible) return null
  return (
    <div data-testid={testId} className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:book-2-bold" className="text-cyan-600" width={18} />
          <h2 className="text-sm font-semibold text-cyan-900">{titulo}</h2>
        </div>
        <button
          type="button"
          onClick={onOcultar}
          title="Ocultar esta guía"
          className="rounded-full p-1 text-slate-500 hover:bg-white/70"
        >
          <Icon icon="solar:close-circle-linear" width={18} />
        </button>
      </div>
      <div
        className={cn(
          'grid grid-cols-1 gap-3 sm:grid-cols-2',
          columnas === 4 ? 'lg:grid-cols-4' : columnas === 3 ? 'lg:grid-cols-3' : '',
        )}
      >
        {items.map((item) => (
          <div key={item.titulo} className="rounded-lg bg-white/70 p-3">
            <p className="text-xs font-semibold text-slate-800">{item.titulo}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">{item.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Rango de fechas: nunca deja un rango invertido ── */

interface RangoFechasProps {
  desde: string
  hasta: string
  onChange: (desde: string, hasta: string) => void
  max?: string
  disabled?: boolean
  testId?: string
}

export function RangoFechas({ desde, hasta, onChange, max, disabled, testId }: RangoFechasProps) {
  const cls =
    'h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50'
  const cambiarDesde = (v: string) => onChange(v, '')
  const cambiarHasta = (v: string) => {
    if (!v) onChange(desde, '')
    else if (!desde || v < desde) onChange(v, '')
    else onChange(desde, v)
  }
  return (
    <div data-testid={testId} className="flex items-center gap-1">
      <input
        type="date"
        aria-label="Fecha inicial"
        className={cls}
        value={desde}
        max={max}
        disabled={disabled}
        onChange={(e) => cambiarDesde(e.target.value)}
      />
      <span className="text-slate-400">—</span>
      <input
        type="date"
        aria-label="Fecha final"
        className={cls}
        value={hasta}
        min={desde || undefined}
        max={max}
        disabled={disabled}
        onChange={(e) => cambiarHasta(e.target.value)}
      />
    </div>
  )
}

/* ── Etiqueta de campo de filtro ── */

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-slate-600">
      {children}
    </label>
  )
}

/* ── Card de filtros: contenedor estándar de la parte superior de una pantalla ── */

export function FilterCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</div>
}

/** Separador punteado entre el encabezado y los filtros locales de la FilterCard. */
export function FilterRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-4 flex flex-wrap items-end gap-3 border-t border-dashed border-slate-200 pt-4', className)}>
      {children}
    </div>
  )
}
