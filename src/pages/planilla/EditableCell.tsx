import { useEffect, useState } from 'react'

interface Props {
  initial: number
  onCommit: (n: number) => void
  disabled?: boolean
  className?: string
  step?: string
}

// Input numérico que mantiene estado local mientras se edita y commitea en blur.
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
      className={
        'w-full rounded border bg-background px-1.5 py-0.5 text-right text-xs tabular-nums ' +
        'focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed ' +
        (className ?? '')
      }
    />
  )
}
