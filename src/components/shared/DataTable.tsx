import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

/* ── Wrapper card + table ── */

interface DataTableProps {
  children: ReactNode
  footer?: ReactNode
  className?: string
  minWidth?: string
}

export function DataTable({ children, footer, className, minWidth = '480px' }: DataTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          {children}
        </table>
      </div>
      {footer}
    </div>
  )
}

/* ── Head ── */

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50/70">{children}</tr>
    </thead>
  )
}

export function DataTableHeadCell({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn('px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', className)}>
      {children}
    </th>
  )
}

/* ── Body ── */

interface DataTableBodyProps {
  children: ReactNode
  divided?: boolean
  className?: string
}

export function DataTableBody({ children, divided = true, className }: DataTableBodyProps) {
  return <tbody className={cn(divided && 'divide-y divide-slate-100', className)}>{children}</tbody>
}

/* ── Row ── */

interface DataTableRowProps {
  children: ReactNode
  onClick?: () => void
  highlighted?: boolean
  selected?: boolean
  className?: string
}

export function DataTableRow({ children, onClick, highlighted, selected, className }: DataTableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors duration-100',
        onClick && 'cursor-pointer',
        selected ? 'bg-indigo-50/60' : highlighted ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50/80',
        className,
      )}
    >
      {children}
    </tr>
  )
}

/* ── Cell ── */

export function DataTableCell({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td colSpan={colSpan} className={cn('px-5 py-3.5', className)}>
      {children}
    </td>
  )
}

/* ── Empty state ── */

interface DataTableEmptyProps {
  icon?: string
  title?: ReactNode
  description?: ReactNode
  colSpan?: number
}

export function DataTableEmpty({
  icon = 'solar:inbox-bold',
  title = 'Sin resultados',
  description,
  colSpan = 10,
}: DataTableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState icon={icon} title={title} description={description} />
      </td>
    </tr>
  )
}

/** Estado vacío reutilizable fuera de tablas (listas, tarjetas). */
export function EmptyState({
  icon = 'solar:inbox-bold',
  title = 'Sin resultados',
  description,
  className,
}: {
  icon?: string
  title?: ReactNode
  description?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Icon icon={icon} width={22} className="text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-md text-xs text-slate-400">{description}</p>}
    </div>
  )
}

/* ── Generic skeleton ── */

interface DataTableSkeletonProps {
  rows?: number
  cols?: number
}

export function DataTableSkeleton({ rows = 4, cols = 4 }: DataTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 rounded-full bg-slate-100" style={{ width: `${60 + ((i + j) % 3) * 20}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
