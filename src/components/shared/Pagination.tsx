import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

/* ── Hook ── */

export function usePagination<T>(items: T[], pageSize: number, page: number) {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize
  return {
    paged: items.slice(start, start + pageSize),
    total,
    pageCount,
    safePage,
  }
}

/* ── Component ── */

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const btn = (onClick: () => void, disabled: boolean, icon: string, title: string) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon icon={icon} width={13} />
    </button>
  )

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5', className)}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {onPageSizeChange && (
          <>
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value))
                onPageChange(1)
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>por página ·</span>
          </>
        )}
        <span>
          <span className="font-semibold text-slate-700">
            {from}–{to}
          </span>{' '}
          de <span className="font-semibold text-slate-700">{total}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        {btn(() => onPageChange(1), page <= 1, 'solar:double-alt-arrow-left-bold', 'Primera página')}
        {btn(() => onPageChange(page - 1), page <= 1, 'solar:alt-arrow-left-bold', 'Anterior')}
        <span className="min-w-[64px] text-center text-xs font-semibold text-slate-600">
          {page} / {pageCount}
        </span>
        {btn(() => onPageChange(page + 1), page >= pageCount, 'solar:alt-arrow-right-bold', 'Siguiente')}
        {btn(() => onPageChange(pageCount), page >= pageCount, 'solar:double-alt-arrow-right-bold', 'Última página')}
      </div>
    </div>
  )
}
