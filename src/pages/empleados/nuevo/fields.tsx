import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
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
}: {
  name: Name
  label: string
  required?: boolean
  type?: string
  placeholder?: string
  disabled?: boolean
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
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!err}
        className={cn(err && 'border-red-400 bg-red-50/40 focus-visible:ring-red-500')}
        {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
      />
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
