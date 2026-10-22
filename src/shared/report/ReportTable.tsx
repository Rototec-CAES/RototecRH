/**
 * Tabla declarativa de reportes: ordenamiento por columna (asc/desc), paginación,
 * filas expandibles y pie de totales. Construida sobre los primitivos de DataTable.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableSkeleton,
} from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { cn } from '@/lib/utils'

export interface ColumnaTabla<T> {
  key: string
  header: ReactNode
  /** Campo por el que se ordena. Si se omite, la columna no se ordena. */
  field?: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  body?: (row: T) => ReactNode
  minWidth?: string
  className?: string
}

export interface OrdenTabla {
  field: string
  order: 1 | -1
}

interface ReportTableProps<T> {
  rows: T[]
  columns: ColumnaTabla<T>[]
  dataKey: (row: T) => string
  loading?: boolean
  emptyMessage?: ReactNode
  emptyDescription?: ReactNode
  paginator?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  defaultSort?: OrdenTabla | null
  expansion?: (row: T) => ReactNode
  /** Clase extra por fila (p. ej. resaltar novedades). */
  rowClassName?: (row: T) => string | undefined
  onRowClick?: (row: T) => void
  footer?: ReactNode
  testId?: string
  minWidth?: string
  compact?: boolean
  maxHeight?: string
  className?: string
}

const alignCls = (a?: 'left' | 'center' | 'right') => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left')

/** Nulos primero; strings con localeCompare numérico. */
function comparar(a: unknown, b: unknown): number {
  if (a == null && b != null) return -1
  if (a != null && b == null) return 1
  if (a == null && b == null) return 0
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, undefined, { numeric: true })
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1
  return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0
}

export function ReportTable<T>({
  rows,
  columns,
  dataKey,
  loading,
  emptyMessage = 'Sin resultados',
  emptyDescription,
  paginator = false,
  pageSize: pageSizeInicial = 15,
  pageSizeOptions,
  defaultSort = null,
  expansion,
  rowClassName,
  onRowClick,
  footer,
  testId,
  minWidth = '640px',
  compact,
  maxHeight,
  className,
}: ReportTableProps<T>) {
  const [orden, setOrden] = useState<OrdenTabla | null>(defaultSort)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(pageSizeInicial)
  const [expandidas, setExpandidas] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setPageSize(pageSizeInicial)
  }, [pageSizeInicial])
  useEffect(() => {
    setPage(1)
  }, [rows])

  const ordenadas = useMemo(() => {
    if (!orden) return rows
    const campo = orden.field
    return [...rows].sort(
      (a, b) => orden.order * comparar((a as Record<string, unknown>)[campo], (b as Record<string, unknown>)[campo]),
    )
  }, [rows, orden])

  const pageCount = Math.max(1, Math.ceil(ordenadas.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visibles = paginator ? ordenadas.slice((safePage - 1) * pageSize, safePage * pageSize) : ordenadas

  const alternarOrden = (field: string) => {
    setOrden((prev) => (prev?.field === field ? { field, order: prev.order === 1 ? -1 : 1 } : { field, order: 1 }))
  }

  const alternarFila = (key: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const totalCols = columns.length + (expansion ? 1 : 0)
  const celda = compact ? 'px-3 py-2' : undefined

  return (
    <div data-testid={testId} className={className}>
      <div style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        <DataTable
          minWidth={minWidth}
          footer={
            paginator && ordenadas.length > 0 ? (
              <Pagination
                page={safePage}
                pageSize={pageSize}
                total={ordenadas.length}
                onPageChange={setPage}
                onPageSizeChange={pageSizeOptions ? setPageSize : undefined}
                pageSizeOptions={pageSizeOptions}
              />
            ) : undefined
          }
        >
          <DataTableHead>
            {expansion && <th className="w-12 px-3 py-3.5" />}
            {columns.map((c) => {
              const sortable = c.sortable && c.field
              const activo = orden?.field === c.field
              return (
                <th
                  key={c.key}
                  style={c.minWidth ? { minWidth: c.minWidth } : undefined}
                  className={cn(
                    'px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500',
                    compact && 'px-3 py-2.5',
                    alignCls(c.align),
                    sortable && 'cursor-pointer select-none hover:text-slate-700',
                  )}
                  onClick={sortable ? () => alternarOrden(c.field as string) : undefined}
                >
                  <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                    {c.header}
                    {sortable && (
                      <Icon
                        width={12}
                        className={activo ? 'text-cyan-600' : 'text-slate-300'}
                        icon={
                          activo
                            ? orden?.order === 1
                              ? 'solar:alt-arrow-up-bold'
                              : 'solar:alt-arrow-down-bold'
                            : 'solar:sort-vertical-linear'
                        }
                      />
                    )}
                  </span>
                </th>
              )
            })}
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <DataTableSkeleton rows={5} cols={totalCols} />
            ) : visibles.length === 0 ? (
              <DataTableEmpty title={emptyMessage} description={emptyDescription} colSpan={totalCols} />
            ) : (
              visibles.map((row, i) => {
                const key = dataKey(row)
                const abierta = expandidas.has(key)
                const extra = rowClassName?.(row)
                return (
                  <Fragment key={`${key}-${i}`}>
                    <DataTableRow
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(!extra && i % 2 === 1 && 'bg-slate-50/40', extra)}
                    >
                      {expansion && (
                        <DataTableCell className="w-12 px-3 py-2">
                          <button
                            type="button"
                            aria-label={abierta ? 'Contraer fila' : 'Expandir fila'}
                            onClick={(e) => {
                              e.stopPropagation()
                              alternarFila(key)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                          >
                            <Icon icon={abierta ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} width={16} />
                          </button>
                        </DataTableCell>
                      )}
                      {columns.map((c) => (
                        <DataTableCell key={c.key} className={cn(celda, alignCls(c.align), c.className)}>
                          {c.body ? c.body(row) : String((row as Record<string, unknown>)[c.field ?? c.key] ?? '')}
                        </DataTableCell>
                      ))}
                    </DataTableRow>
                    {expansion && abierta && (
                      <tr>
                        <td colSpan={totalCols} className="p-0">
                          {expansion(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </DataTableBody>
          {footer && !loading && visibles.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">{footer}</tfoot>
          )}
        </DataTable>
      </div>
    </div>
  )
}
