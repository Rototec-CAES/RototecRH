import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmpleadoOption {
  id: number
  nombre: string
}

interface Option {
  id: number | null
  label: string
}

interface Props {
  empleados: EmpleadoOption[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  searchPlaceholder?: string
  allowAll?: boolean
  allLabel?: string
  emptyLabel?: string
  disabled?: boolean
  className?: string
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function EmpleadoCombobox({
  empleados,
  value,
  onChange,
  placeholder = 'Seleccionar empleado',
  searchPlaceholder = 'Buscar por nombre…',
  allowAll = false,
  allLabel = 'Todos',
  emptyLabel = 'Sin resultados',
  disabled = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const selected = useMemo(
    () => empleados.find((e) => e.id === value) ?? null,
    [empleados, value],
  )

  const options = useMemo<Option[]>(() => {
    const q = norm(query.trim())
    const base = empleados
      .filter((e) => !q || norm(e.nombre).includes(q))
      .map((e) => ({ id: e.id as number | null, label: e.nombre }))
    if (allowAll && !q) return [{ id: null, label: allLabel }, ...base]
    return base
  }, [empleados, query, allowAll, allLabel])

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  // Al abrir: limpiar búsqueda y enfocar el input
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function commit(id: number | null) {
    onChange(id)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = options[activeIndex]
      if (opt) commit(opt.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  const showAllSelected = allowAll && value == null
  const triggerText = selected ? selected.nombre : showAllSelected ? allLabel : placeholder
  const isPlaceholder = !selected && !showAllSelected

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-700 transition-colors duration-150 hover:border-slate-300 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
        )}
      >
        <span className={cn('line-clamp-1 text-left', isPlaceholder && 'text-slate-400')}>
          {triggerText}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {options.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-400">{emptyLabel}</p>
            ) : (
              options.map((opt, i) => {
                const isSelected = opt.id === value
                return (
                  <button
                    key={opt.id ?? '__all__'}
                    type="button"
                    ref={(el) => (itemRefs.current[i] = el)}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(opt.id)}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-left text-sm outline-none',
                      i === activeIndex && 'bg-sky-50 text-sky-700',
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4 text-sky-500" />
                      </span>
                    )}
                    <span className="line-clamp-1">{opt.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
