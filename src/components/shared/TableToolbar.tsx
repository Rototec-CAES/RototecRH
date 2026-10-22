import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

/* ── Layout wrapper ── */

export function TableToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
}

/* ── Search input ── */

interface TableSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** data-testid del <input>. */
  testId?: string
}

export function TableSearch({ value, onChange, placeholder = 'Buscar...', className, testId }: TableSearchProps) {
  return (
    <div className={cn('relative', className)}>
      <Icon
        icon="solar:magnifer-bold"
        width={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className={cn(
          'h-10 w-full rounded-xl py-2.5 pl-9 pr-9 text-sm',
          'border border-slate-200 bg-white',
          'text-slate-900 placeholder:text-slate-400',
          'focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500',
          'transition-all duration-150',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <Icon icon="solar:close-circle-bold" width={14} />
        </button>
      )}
    </div>
  )
}

/* ── Select filter (nativo) ── */

interface TableFilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  /** Texto de la opción vacía (""). Pasar null para no mostrarla. */
  placeholder?: string | null
  className?: string
  testId?: string
  'aria-label'?: string
}

export function TableFilterSelect({
  value,
  onChange,
  options,
  placeholder = 'Todos',
  className,
  testId,
  'aria-label': ariaLabel,
}: TableFilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(
        'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700',
        'focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500',
        'transition-all duration-150',
        className,
      )}
    >
      {placeholder !== null && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/* ── Result count badge ── */

interface TableResultCountProps {
  total: number
  filtered?: number
  /** Singular; se pluraliza agregando "s" (o pasar `plural`). */
  label?: string
  plural?: string
  className?: string
}

export function TableResultCount({ total, filtered, label = 'resultado', plural, className }: TableResultCountProps) {
  const count = filtered ?? total
  const showOf = filtered !== undefined && filtered !== total
  return (
    <span className={cn('shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500', className)}>
      {count} {count === 1 ? label : plural ?? `${label}s`}
      {showOf && <span className="text-slate-400"> de {total}</span>}
    </span>
  )
}

/* ── Active filters chip ── */

interface ActiveFilterChipProps {
  label: ReactNode
  onRemove: () => void
}

export function ActiveFilterChip({ label, onRemove }: ActiveFilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
      {label}
      <button type="button" onClick={onRemove} title="Quitar filtro" className="text-sky-400 transition-colors hover:text-sky-700">
        <Icon icon="solar:close-circle-bold" width={13} />
      </button>
    </span>
  )
}
