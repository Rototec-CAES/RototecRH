import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  initial: number
  onCommit: (n: number) => void
  disabled?: boolean
  className?: string
  step?: string
}

// Input numérico que mantiene estado local mientras se edita y commitea en blur.
// Deshabilitado se ve como texto plano (sin borde) para que se note qué se puede editar.
export function EditableCell({ initial, onCommit, disabled, className, step = '0.01' }: Props) {
  const [val, setVal] = useState<string>(String(initial ?? 0))

  useEffect(() => {
    setVal(String(initial ?? 0))
  }, [initial])

  function commit() {
    const n = Number(val)
    const safe = Number.isFinite(n) && n >= 0 ? n : 0
    if (safe !== initial) onCommit(safe)
    setVal(String(safe))
  }

  return (
    <input
      type="number"
      step={step}
      min={0}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      disabled={disabled}
      className={cn(
        'w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900',
        'transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30',
        'disabled:cursor-not-allowed',
        // Un valor corregido a mano (className con resaltado) se sigue viendo resaltado aunque esté bloqueado.
        className ? className : 'disabled:border-transparent disabled:bg-transparent disabled:text-slate-700',
      )}
    />
  )
}
