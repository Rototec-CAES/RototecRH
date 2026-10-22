import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

/* ============================================================================
 * DetailHeader — encabezado oscuro para vistas de detalle (ficha de empleado…)
 *
 *   ┌─ [línea sky] ───────────────────────────────────────────────┐
 *   │  ← Volver                  [ acción ] [ acción ] [ acción ] │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │  EYEBROW                                    [ selección ]   │
 *   │  Título principal                                           │
 *   │  subtítulo                                                  │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │  footer (chips, contadores…)                                │
 *   └─────────────────────────────────────────────────────────────┘
 * ============================================================================ */

interface DetailHeaderProps {
  /** Texto del botón de regreso, ej. "Volver a empleados" */
  backLabel: string
  onBack: () => void
  /** Etiqueta pequeña sobre el título, ej. "Ficha de empleado" */
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  /** Botones de acción arriba a la derecha (DetailAction) */
  actions?: ReactNode
  /** Panel a la derecha del título */
  selectionPanel?: ReactNode
  /** Franja inferior: chips, contadores, etc. */
  footer?: ReactNode
  className?: string
}

export function DetailHeader({
  backLabel,
  onBack,
  eyebrow,
  title,
  subtitle,
  actions,
  selectionPanel,
  footer,
  className,
}: DetailHeaderProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl',
        'bg-gradient-to-br from-[#0c1628] via-[#0f172a] to-[#0c1e35]',
        className,
      )}
    >
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 40%, transparent 100%)' }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 px-6 py-3.5">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-3.5 py-2',
            'border border-white/[0.10] bg-white/[0.06]',
            'text-sm font-semibold text-slate-300',
            'transition-all hover:border-white/20 hover:bg-white/[0.11] hover:text-white',
            'active:scale-[0.97]',
          )}
        >
          <Icon icon="solar:alt-arrow-left-bold" width={15} />
          {backLabel}
        </button>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-400/70">{eyebrow}</p>
          )}
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-1.5 text-sm text-slate-400">{subtitle}</div>}
        </div>

        {selectionPanel && <div className="flex shrink-0 items-center gap-2">{selectionPanel}</div>}
      </div>

      {footer && <div className="border-t border-slate-800/60 px-6 py-3">{footer}</div>}
    </div>
  )
}

/* ── DetailAction — botón de acción dentro del DetailHeader ── */

interface DetailActionProps {
  onClick?: () => void
  disabled?: boolean
  icon: string
  label: string
  /** default = gris, primary = verde, danger = rojo */
  variant?: 'default' | 'primary' | 'danger'
  /** Anima el icono como spinner */
  spinning?: boolean
  className?: string
  title?: string
}

const ACTION_STYLES: Record<string, string> = {
  default: 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white',
  primary:
    'border-emerald-700/80 bg-emerald-900/40 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-800/60 hover:text-emerald-200',
  danger: 'border-red-700/80 bg-red-900/40 text-red-300 hover:border-red-500 hover:bg-red-800/60 hover:text-red-200',
}

export function DetailAction({ onClick, disabled, icon, label, variant = 'default', spinning, className, title }: DetailActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5',
        'text-xs font-semibold transition-all',
        'disabled:pointer-events-none disabled:opacity-40',
        ACTION_STYLES[variant],
        className,
      )}
    >
      <Icon icon={icon} width={13} className={cn(spinning && 'animate-spin')} />
      {label}
    </button>
  )
}

/** Chip translúcido para el footer del DetailHeader. */
export function DetailChip({ icon, children, className }: { icon?: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-300',
        className,
      )}
    >
      {icon && <Icon icon={icon} width={13} className="text-sky-400" />}
      {children}
    </span>
  )
}
