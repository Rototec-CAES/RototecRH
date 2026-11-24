import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { EmpleadoCreateValues } from '@/lib/validators'
import { type DocumentoIdentidad, formatearDocumento, limpiarDocumento } from '@/lib/documentosPais'

export type Opt = { value: string; label: string }
type Name = keyof EmpleadoCreateValues

function FieldShell({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <Icon icon="solar:danger-circle-bold" width={13} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({
  name,
  label,
  required,
  type = 'text',
  placeholder,
  disabled,
  step,
}: {
  name: Name
  label: string
  required?: boolean
  type?: string
  placeholder?: string
  disabled?: boolean
  /** Solo para type="number". Sin esto el navegador usa step=1 y rechaza decimales. */
  step?: string
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<EmpleadoCreateValues>()
  const err = errors[name]?.message as string | undefined
  return (
    <FieldShell label={label} required={required} error={err}>
      <Input
        type={type}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!err}
        className={cn(err && 'border-red-400 bg-red-50/40 focus-visible:ring-red-500')}
        {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
      />
    </FieldShell>
  )
}

/**
 * Documento de identificación con máscara según el país (DPI ####-#####-####, DUI ########-#, …).
 * Muestra los guiones mientras se escribe, pero en el formulario (y en la BD) guarda el valor limpio.
 * Acepta pegar el número con o sin guiones, espacios o puntos. Sin `doc` (país sin regla) es texto libre.
 */
export function DocumentoIdentidadField({
  name,
  label,
  required,
  doc,
}: {
  name: Name
  label: string
  required?: boolean
  doc: DocumentoIdentidad
}) {
  const { control, setValue } = useFormContext<EmpleadoCreateValues>()
  const { field, fieldState } = useController({ name, control })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const caretSignificativos = useRef<number | null>(null)

  const raw = String(field.value ?? '')
  const limpio = limpiarDocumento(doc, raw)
  const mostrado = formatearDocumento(doc, limpio)
  // Carácter que cuenta (no es guion ni separador).
  const esSignificativo = (c: string) => limpiarDocumento(doc, c) !== ''

  // Valores viejos guardados con espacios/guiones/minúsculas: se limpian sin marcar el formulario como modificado.
  useEffect(() => {
    if (raw !== limpio) setValue(name, limpio as never, { shouldDirty: false, shouldValidate: fieldState.isTouched })
  }, [raw, limpio, name, setValue, fieldState.isTouched])

  // Mantiene el cursor en su lugar aunque se agreguen o quiten guiones.
  useLayoutEffect(() => {
    const n = caretSignificativos.current
    const el = inputRef.current
    if (n === null || !el) return
    caretSignificativos.current = null
    let pos = 0
    for (let vistos = 0; pos < mostrado.length && vistos < n; pos++) if (esSignificativo(mostrado[pos])) vistos++
    el.setSelectionRange(pos, pos)
  })

  const err = fieldState.error?.message
  return (
    <FieldShell label={label} required={required} error={err}>
      <Input
        ref={(el) => {
          inputRef.current = el
          field.ref(el)
        }}
        name={field.name}
        value={mostrado}
        onBlur={field.onBlur}
        inputMode={doc.tipo === 'digitos' ? 'numeric' : 'text'}
        autoCapitalize={doc.tipo === 'alfanumerico' ? 'characters' : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={doc.placeholder}
        aria-invalid={!!err}
        className={cn('tabular-nums', err && 'border-red-400 bg-red-50/40 focus-visible:ring-red-500')}
        onChange={(e) => {
          const texto = e.target.value
          const cursor = e.target.selectionStart ?? texto.length
          let antes = limpiarDocumento(doc, texto.slice(0, cursor)).length
          let nuevo = limpiarDocumento(doc, texto)
          // Borrar un guion no cambia el valor: se borra el carácter anterior, como se espera.
          if (nuevo === limpio && texto.length < mostrado.length && antes > 0) {
            nuevo = nuevo.slice(0, antes - 1) + nuevo.slice(antes)
            antes -= 1
          }
          nuevo = nuevo.slice(0, doc.longitud)
          caretSignificativos.current = Math.min(antes, nuevo.length)
          field.onChange(nuevo)
        }}
      />
      <p className="text-[11px] text-slate-400">
        {doc.longitud} {doc.tipo === 'digitos' ? 'dígitos' : 'caracteres'}
        {doc.grupos ? ' · los guiones se agregan solos' : ''}
      </p>
    </FieldShell>
  )
}

export function SelectField({
  name,
  label,
  required,
  options,
  disabled,
  loading,
  placeholder = 'Seleccionar',
}: {
  name: Name
  label: string
  required?: boolean
  options: Opt[]
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<EmpleadoCreateValues>()
  const err = errors[name]?.message as string | undefined
  const value = watch(name)
  return (
    <FieldShell label={label} required={required} error={err}>
      <Select
        value={value == null || value === '' ? undefined : String(value)}
        onValueChange={(v) => setValue(name, v as never, { shouldValidate: true, shouldDirty: true })}
        disabled={disabled || loading}
      >
        <SelectTrigger className={cn(err && 'border-red-400 bg-red-50/40 focus:ring-red-500')}>
          <SelectValue placeholder={loading ? 'Cargando…' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}

export function CheckboxField({
  name,
  label,
  hint,
}: {
  name: Name
  label: string
  hint?: string
}) {
  const { watch, setValue } = useFormContext<EmpleadoCreateValues>()
  const checked = watch(name) as boolean | undefined
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <Checkbox
        id={name}
        checked={!!checked}
        onCheckedChange={(val) => setValue(name, !!val as never, { shouldDirty: true })}
      />
      <div className="space-y-0.5 leading-none">
        <Label htmlFor={name} className="cursor-pointer text-sm font-medium text-slate-700">
          {label}
        </Label>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}
