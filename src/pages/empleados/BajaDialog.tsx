import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TIPOS_BAJA } from '@/constants/guatemala'
import { useDarDeBaja } from '@/hooks/useEmpleados'
import { bajaSchema, type BajaFormValues } from '@/lib/validators'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleadoId: string
  empleadoNombre: string
}

export function BajaDialog({ open, onOpenChange, empleadoId, empleadoNombre }: Props) {
  const darDeBaja = useDarDeBaja(empleadoId)
  const form = useForm<BajaFormValues>({
    resolver: zodResolver(bajaSchema),
    defaultValues: {
      tipoBaja: 'RENUNCIA',
      fechaBaja: new Date().toISOString().slice(0, 10),
      motivoBaja: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        tipoBaja: 'RENUNCIA',
        fechaBaja: new Date().toISOString().slice(0, 10),
        motivoBaja: '',
      })
    }
  }, [open, form])

  async function onSubmit(values: BajaFormValues) {
    try {
      await darDeBaja.mutateAsync(values)
      toast.success(`${empleadoNombre} dado de baja`)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al dar de baja'
      toast.error(msg)
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Icon icon="solar:user-minus-bold" width={18} />
            </span>
            Dar de baja a {empleadoNombre}
          </DialogTitle>
          <DialogDescription>
            Esta acción cambia el estado del empleado y queda registrada en su expediente.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Tipo de baja *</Label>
            <Select
              value={form.watch('tipoBaja')}
              onValueChange={(v) => form.setValue('tipoBaja', v as BajaFormValues['tipoBaja'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_BAJA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipoBaja && (
              <p className="mt-1 text-xs text-red-600">{errors.tipoBaja.message}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Fecha de baja *</Label>
            <Input type="date" {...form.register('fechaBaja')} />
            {errors.fechaBaja && (
              <p className="mt-1 text-xs text-red-600">{errors.fechaBaja.message}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Motivo *</Label>
            <Textarea rows={4} placeholder="Descripción breve del motivo" {...form.register('motivoBaja')} />
            <p className="mt-1 text-xs text-slate-400">Queda guardado en el expediente del empleado.</p>
            {errors.motivoBaja && (
              <p className="mt-1 text-xs text-red-600">{errors.motivoBaja.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={darDeBaja.isPending}>
              <Icon icon={darDeBaja.isPending ? 'svg-spinners:180-ring' : 'solar:user-minus-bold'} />
              {darDeBaja.isPending ? 'Guardando…' : 'Confirmar baja'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
