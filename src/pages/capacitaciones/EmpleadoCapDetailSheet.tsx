import { type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { extractApiErrorMessage } from '@/api/client'

import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAsignarPrimaria,
  useAsignarSecundaria,
  useEmpleadoCap,
  useEvaluacionesDeModulos,
  useGenerarExamen,
  usePensumArbol,
  usePensums,
  useReabrir,
} from '@/hooks/useCapacitaciones'
import { formatDate } from '@/lib/utils'
import { generarDiplomaDocx } from '@/lib/diploma'
import { useEmpleado } from '@/hooks/useEmpleados'
import {
  asignacionSecundariaSchema,
  generarExamenSchema,
  type GenerarExamenFormValues,
} from '@/lib/validators'
import type {
  AsignacionCap,
  AsignacionDetalleCap,
  GenerarExamenResult,
} from '@/types'

interface Props {
  empleadoId: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmpleadoCapDetailSheet({ empleadoId, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = useEmpleadoCap(open ? empleadoId : undefined)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Capacitación del empleado</SheetTitle>
          <SheetDescription>
            Las notas, intentos y licencia son de solo lectura (se calculan al evaluar).
          </SheetDescription>
        </SheetHeader>

        {empleadoId == null ? null : isLoading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError || !data ? (
          <p className="mt-6 text-sm text-destructive">Error al cargar el detalle</p>
        ) : (
          <div className="mt-6 space-y-8">
            <DiplomaButton empleadoId={empleadoId} asignaciones={data.asignaciones} />
            <PrimariaSection empleadoId={empleadoId} />
            <SecundariaSection empleadoId={empleadoId} />
            <div>
              <SectionTitle>Asignaciones</SectionTitle>
              {data.asignaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
              ) : (
                <div className="space-y-4">
                  {data.asignaciones.map((a) => (
                    <AsignacionCard key={a.id} asignacion={a} empleadoId={empleadoId} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h3>
      <Separator className="mb-3" />
    </>
  )
}

function DiplomaButton({
  empleadoId,
  asignaciones,
}: {
  empleadoId: number
  asignaciones: AsignacionCap[]
}) {
  const { data: empleado } = useEmpleado(String(empleadoId))
  const [generando, setGenerando] = useState(false)

  const detalles = asignaciones.flatMap((a) => a.detalles)
  const todosAprobados =
    detalles.length > 0 &&
    detalles.every((d) => d.estado.toLowerCase() === 'aprobado')

  async function onGenerar() {
    setGenerando(true)
    try {
      const partes = [empleado?.primerNombre, empleado?.primerApellido].filter(
        Boolean,
      )
      const nombreCompleto =
        [
          empleado?.primerNombre,
          empleado?.segundoNombre,
          empleado?.primerApellido,
          empleado?.segundoApellido,
        ]
          .filter(Boolean)
          .join(' ') ||
        empleado?.nombre ||
        String(empleadoId)
      const nombreCorto = partes.length ? partes.join(' ') : nombreCompleto
      await generarDiplomaDocx({
        nombreCorto,
        nombreCompleto,
        codigoEmpleado: empleado?.id ? String(empleado.id) : String(empleadoId),
        puesto: empleado?.puesto ?? '',
      })
      toast.success('Diploma generado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el diploma')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div>
      <SectionTitle>Diploma</SectionTitle>
      <Button
        size="sm"
        onClick={onGenerar}
        disabled={!todosAprobados || generando}
        title={
          todosAprobados ? undefined : 'Todos los módulos deben estar aprobados'
        }
      >
        Generar diploma
      </Button>
      {!todosAprobados && (
        <p className="mt-2 text-xs text-muted-foreground">
          Todos los módulos deben estar aprobados.
        </p>
      )}
    </div>
  )
}

function PrimariaSection({ empleadoId }: { empleadoId: number }) {
  const asignar = useAsignarPrimaria()
  async function onAssign() {
    try {
      await asignar.mutateAsync([empleadoId])
      toast.success('Pensum primario asignado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }
  return (
    <div>
      <SectionTitle>Asignación primaria</SectionTitle>
      <Button size="sm" onClick={onAssign} disabled={asignar.isPending}>
        Asignar pensum primario (por puesto)
      </Button>
    </div>
  )
}

function SecundariaSection({ empleadoId }: { empleadoId: number }) {
  const { data: pensums } = usePensums()
  const asignar = useAsignarSecundaria(empleadoId)
  const [idPensum, setIdPensum] = useState<string>('')

  async function onAssign() {
    const parsed = asignacionSecundariaSchema.safeParse({ idPensum })
    if (!parsed.success) {
      toast.error('Selecciona un pensum')
      return
    }
    try {
      await asignar.mutateAsync(parsed.data.idPensum)
      toast.success('Pensum secundario asignado')
      setIdPensum('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div>
      <SectionTitle>Asignación secundaria</SectionTitle>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select value={idPensum} onValueChange={setIdPensum}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un pensum" />
            </SelectTrigger>
            <SelectContent>
              {(pensums ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onAssign} disabled={asignar.isPending || !idPensum}>
          Asignar
        </Button>
      </div>
    </div>
  )
}

function AsignacionCard({
  asignacion,
  empleadoId,
}: {
  asignacion: AsignacionCap
  empleadoId: number
}) {
  const reabrir = useReabrir(empleadoId)
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const { data: pensumArbol } = usePensumArbol(asignacion.idPensum)
  const idModulos = asignacion.detalles.map((d) => d.idModulo)
  const { tieneEvaluacion } = useEvaluacionesDeModulos(idModulos)

  function toggle(id: number, checked: boolean) {
    setSeleccionados((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    )
  }

  async function repetirEntera() {
    if (!window.confirm('¿Reabrir toda la capacitación? Se reiniciarán todos los módulos.')) return
    try {
      await reabrir.mutateAsync({ idAsignacion: asignacion.id })
      setSeleccionados([])
      toast.success('Capacitación reabierta')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  async function repetirSeleccionados() {
    try {
      await reabrir.mutateAsync({ idAsignacion: asignacion.id, input: { idModulos: seleccionados } })
      setSeleccionados([])
      toast.success('Módulos reabiertos')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const pensumNombre = pensumArbol?.nombre ?? 'Pensum'
  const tipoBadgeVariant: 'default' | 'secondary' =
    asignacion.tipo === 'primaria' ? 'default' : 'secondary'
  const tipoLabel = asignacion.tipo === 'primaria' ? 'Primaria' : 'Secundaria'

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={tipoBadgeVariant}>{tipoLabel}</Badge>
        <span className="text-xs text-muted-foreground">{pensumNombre}</span>
        {(() => {
          if (asignacion.venceLicencia !== null) {
            const hoy = new Date(); hoy.setHours(0,0,0,0)
            return new Date(asignacion.venceLicencia) >= hoy
              ? <Badge variant="success">Licencia activa</Badge>
              : <Badge variant="destructive">Licencia expirada</Badge>
          }
          return <Badge variant="outline">Sin licencia</Badge>
        })()}
      </div>
      <dl className="mb-3 space-y-1 text-xs text-muted-foreground">
        <div>Vence licencia: {asignacion.venceLicencia ? formatDate(asignacion.venceLicencia) : '—'}</div>
        <div>Finaliza: {asignacion.fechaFinaliza ? formatDate(asignacion.fechaFinaliza) : '—'}</div>
      </dl>
      <div className="space-y-2">
        {asignacion.detalles.map((d) => (
          <DetalleRow
            key={d.id}
            detalle={d}
            checked={seleccionados.includes(d.idModulo)}
            onCheckedChange={(c) => toggle(d.idModulo, c)}
            tieneEvaluacion={tieneEvaluacion(d.idModulo)}
            moduloNombre={pensumArbol?.modulos.find((m) => m.id === d.idModulo)?.modulo}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={repetirEntera}
          disabled={reabrir.isPending || asignacion.detalles.length === 0}
        >
          Repetir capacitación entera
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={repetirSeleccionados}
          disabled={reabrir.isPending || seleccionados.length === 0}
        >
          Repetir seleccionados ({seleccionados.length})
        </Button>
      </div>
    </div>
  )
}

function estadoBadge(estado: string) {
  const e = estado.toLowerCase()
  if (e === 'aprobado') return <Badge variant="success">Aprobado</Badge>
  if (e === 'no aprobado') return <Badge variant="destructive">No aprobado</Badge>
  return <Badge variant="warning">{estado}</Badge>
}

function DetalleRow({
  detalle,
  checked,
  onCheckedChange,
  tieneEvaluacion,
  moduloNombre,
}: {
  detalle: AsignacionDetalleCap
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  tieneEvaluacion: boolean | undefined
  moduloNombre: string | undefined
}) {
  const generar = useGenerarExamen()
  const [examen, setExamen] = useState<GenerarExamenResult | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<GenerarExamenFormValues>({
    resolver: zodResolver(generarExamenSchema),
    defaultValues: { horasVigencia: 72 },
  })

  async function onGenerar(values: GenerarExamenFormValues) {
    try {
      const res = await generar.mutateAsync({
        idAsignacionDetalle: detalle.id,
        horasVigencia: values.horasVigencia,
      })
      setExamen(res)
      setDialogOpen(false)
      toast.success('Examen generado')
    } catch (err) {
      // Mensaje del backend (p.ej. evaluación de video sin video cargado) en vez del genérico de axios.
      toast.error(extractApiErrorMessage(err))
    }
  }

  const examLink = examen ? `${window.location.origin}/examen/${examen.token}` : undefined

  function copyLink() {
    if (!examLink) return
    navigator.clipboard.writeText(examLink)
    toast.success('Link copiado')
  }

  const btnDisabled = tieneEvaluacion === false || tieneEvaluacion === undefined
  const btnTitle =
    tieneEvaluacion === false
      ? 'Este módulo no tiene evaluación generada'
      : tieneEvaluacion === undefined
        ? 'Verificando evaluación…'
        : undefined

  const moduloLabel = moduloNombre ?? 'Módulo'

  return (
    <div className="rounded border bg-muted/30 p-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={checked}
            onCheckedChange={(c) => onCheckedChange(c === true)}
            aria-label="Seleccionar módulo para repetir"
          />
          <span className="font-medium">{moduloLabel}</span>
          <span className="text-xs text-muted-foreground">
            Nota: {detalle.puntuacion != null ? detalle.puntuacion : '—'}
          </span>
          {estadoBadge(detalle.estado)}
          <span className="text-xs text-muted-foreground">Intentos: {detalle.intentos}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={btnDisabled}
            title={btnTitle}
          >
            Generar examen
          </Button>
          {tieneEvaluacion === false && (
            <p className="text-xs text-muted-foreground">
              Este módulo no tiene evaluación generada.
            </p>
          )}
        </div>
      </div>

      {examLink && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <Input readOnly value={examLink} className="h-8 text-xs" />
            <Button variant="ghost" size="sm" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              Copiar link
            </Button>
            <a
              href={examLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir examen
            </a>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar examen</DialogTitle>
            <DialogDescription>
              Define las horas de vigencia del link del examen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onGenerar)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor={`horas-${detalle.id}`}>Horas de vigencia</Label>
              <Input
                id={`horas-${detalle.id}`}
                type="number"
                {...form.register('horasVigencia')}
              />
              {form.formState.errors.horasVigencia && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.horasVigencia.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={generar.isPending}>
                Generar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
