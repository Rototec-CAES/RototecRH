import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { extractApiErrorMessage } from '@/api/client'
import { useGenerarPlanillaNomina } from '@/hooks/useNomina'
import { formatDate } from '@/lib/utils'
import type { PeriodoPlanilla, PlanillaNomina, PropuestaPlanilla } from '@/types/nomina'
import { lunesDe, semanasAlrededor, sumarDias } from './semanas'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodo: PeriodoPlanilla
  propuesta: PropuestaPlanilla | undefined
  /** Planilla en borrador que se va a regenerar (sus semanas vienen preseleccionadas). */
  actual: PlanillaNomina | null
}

export function GenerarPlanillaDialog({ open, onOpenChange, periodo, propuesta, actual }: Props) {
  const generar = useGenerarPlanillaNomina()
  const corte = propuesta ? sumarDias(lunesDe(propuesta.fechaDesde), 6) : null
  const opciones = useMemo(() => (corte ? semanasAlrededor(corte, 10, 1) : []), [corte])

  const [sinHE, setSinHE] = useState(false)
  const [desde, setDesde] = useState<string>('')
  const [hasta, setHasta] = useState<string>('')

  useEffect(() => {
    if (!open || !propuesta) return
    const d = actual ? actual.semanaHEDesde : propuesta.semanaHEDesde
    const h = actual ? actual.semanaHEHasta : propuesta.semanaHEHasta
    setSinHE(!d || !h)
    setDesde(d ?? propuesta.semanasHE[0]?.desde ?? opciones[opciones.length - 2]?.desde ?? '')
    setHasta(h ?? opciones[opciones.length - 2]?.hasta ?? '')
  }, [open, propuesta, actual, opciones])

  const opcionesHasta = opciones.filter((o) => !desde || o.desde >= desde)
  const cantidad = opcionesHasta.filter((o) => o.hasta <= hasta).length

  async function onGenerar() {
    if (!sinHE && (!desde || !hasta || desde > hasta)) {
      toast.error('Selecciona un rango de semanas válido')
      return
    }
    try {
      await generar.mutateAsync({
        ...periodo,
        semanaHEDesde: sinHE ? null : desde,
        semanaHEHasta: sinHE ? null : hasta,
      })
      toast.success(actual ? 'Planilla regenerada' : 'Planilla generada')
      onOpenChange(false)
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{actual ? 'Regenerar planilla' : 'Generar planilla'}</DialogTitle>
          <DialogDescription>
            Quincena del {formatDate(propuesta?.fechaDesde)} al {formatDate(propuesta?.fechaHasta)}.
            {actual && ' Las capturas manuales (bonos, anticipos, ISR y horas corregidas) se conservan.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Las horas extra se calculan por semana ISO cruzando el <b>turno programado</b> con el{' '}
            <b>marcaje del biométrico</b>: ingreso = el más tarde entre turno y marca, salida = la más
            temprana entre fin de turno y marca. Un turno sin marcas cuenta como ausencia.
            {propuesta?.ultimaSemanaPagada && (
              <> Última semana pagada: hasta el {formatDate(propuesta.ultimaSemanaPagada)}.</>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sinHE} onCheckedChange={(v) => setSinHE(v === true)} />
            No pagar horas extra en esta planilla
          </label>

          {!sinHE && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Desde la semana</Label>
                <Select
                  value={desde}
                  onValueChange={(v) => {
                    setDesde(v)
                    if (hasta < v) setHasta(sumarDias(v, 6))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {opciones.map((o) => (
                      <SelectItem key={o.desde} value={o.desde}>
                        Sem. {o.numero} · {formatDate(o.desde)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta la semana</Label>
                <Select value={hasta} onValueChange={setHasta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcionesHasta.map((o) => (
                      <SelectItem key={o.hasta} value={o.hasta}>
                        Sem. {o.numero} · al {formatDate(o.hasta)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                {cantidad} semana(s): del {formatDate(desde)} al {formatDate(hasta)}.
                {propuesta?.semanaHEDesde && (
                  <> Propuesta del sistema: {formatDate(propuesta.semanaHEDesde)} al {formatDate(propuesta.semanaHEHasta)}.</>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generar.isPending}>
            Cancelar
          </Button>
          <Button onClick={onGenerar} disabled={generar.isPending || !propuesta}>
            {generar.isPending ? 'Calculando…' : actual ? 'Regenerar' : 'Generar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
