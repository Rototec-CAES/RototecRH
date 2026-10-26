import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from '@/components/ui/sonner'
import { extractApiErrorMessage } from '@/api/client'

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
  DataTableSkeleton,
} from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { confirmar } from '@/components/shared/ConfirmDialog'
import { Tag, type Severidad } from '@/shared/report/report-ui'
import {
  useCerrarSala,
  useCrearSala,
  useDesbloquearParticipante,
  useElegiblesSala,
  useEvaluacionesDeModulos,
  usePensumArbol,
  usePensums,
  useSala,
  useSalas,
} from '@/hooks/useCapacitaciones'
import { cn, formatDate } from '@/lib/utils'
import type { EstadoParticipanteSala, EstadoSala } from '@/types'

const TID = 'rh-capacitaciones'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const linkSala = (codigo: string) => `${window.location.origin}/sala/${codigo}`

const ESTADO_SALA: Record<EstadoSala, { label: string; severity: Severidad }> = {
  ABIERTA: { label: 'Abierta', severity: 'success' },
  CERRADA: { label: 'Cerrada', severity: 'secondary' },
  VENCIDA: { label: 'Vencida', severity: 'warning' },
}

const ESTADO_PARTICIPANTE: Record<EstadoParticipanteSala, { label: string; severity: Severidad; icon: string }> = {
  pendiente: { label: 'No ha entrado', severity: 'secondary', icon: 'solar:clock-circle-linear' },
  en_curso: { label: 'Respondiendo', severity: 'info', icon: 'solar:pen-new-square-linear' },
  terminado: { label: 'Terminó', severity: 'success', icon: 'solar:check-circle-bold' },
}

function hora(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Salas de examen: el capacitador elige un módulo y a las personas; cada una entra desde su
 * teléfono con el QR o el código, elige su nombre, confirma con los últimos 4 dígitos de su DPI
 * y hace su propio examen. Aquí se ve el avance en vivo.
 */
export default function SalasTab() {
  const { data, isLoading, isError, isFetching, refetch } = useSalas()
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [salaId, setSalaId] = useState<number | undefined>(undefined)
  const salas = data ?? []

  return (
    <div className="space-y-4">
      <TableToolbar className="justify-between">
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          <Icon icon="solar:info-circle-linear" width={16} className="text-sky-500" />
          Crea una sala para evaluar a varias personas a la vez: cada quien entra desde su teléfono y hace su propio examen.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Actualizar" title="Actualizar" disabled={isFetching}>
            <Icon icon={isFetching ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={16} />
          </Button>
          <Button onClick={() => setNuevaOpen(true)} data-testid={`${TID}__btn-nueva-sala`}>
            <Icon icon="solar:add-circle-bold" width={16} />
            Nueva sala
          </Button>
        </div>
      </TableToolbar>

      <DataTable>
        <DataTableHead>
          <DataTableHeadCell className="w-28">Código</DataTableHeadCell>
          <DataTableHeadCell>Módulo</DataTableHeadCell>
          <DataTableHeadCell className="w-32 text-center">Terminaron</DataTableHeadCell>
          <DataTableHeadCell className="w-28">Estado</DataTableHeadCell>
          <DataTableHeadCell className="w-40">Creada</DataTableHeadCell>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            <DataTableSkeleton rows={3} cols={5} />
          ) : isError ? (
            <DataTableEmpty
              icon="solar:danger-triangle-bold"
              title="No se pudieron cargar las salas"
              description="Revisa la conexión y presiona el botón Actualizar."
              colSpan={5}
            />
          ) : salas.length === 0 ? (
            <DataTableEmpty
              icon="solar:users-group-two-rounded-bold"
              title="Aún no hay salas de examen"
              description="Crea la primera con el botón Nueva sala."
              colSpan={5}
            />
          ) : (
            salas.map((s) => (
              <DataTableRow key={s.id} onClick={() => setSalaId(s.id)}>
                <DataTableCell className="font-mono text-base font-semibold tracking-widest text-slate-900">{s.codigo}</DataTableCell>
                <DataTableCell>
                  <span className="block font-medium text-slate-900">{s.modulo}</span>
                  {s.pensum && <span className="text-xs text-slate-500">{s.pensum}</span>}
                </DataTableCell>
                <DataTableCell className="text-center text-slate-700">
                  {s.terminados} / {s.participantes}
                </DataTableCell>
                <DataTableCell>
                  <Tag severity={ESTADO_SALA[s.estado].severity} value={ESTADO_SALA[s.estado].label} />
                </DataTableCell>
                <DataTableCell className="text-slate-600">{hora(s.creadoEn)}</DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      <NuevaSalaDialog
        open={nuevaOpen}
        onOpenChange={setNuevaOpen}
        onCreada={(id) => {
          setNuevaOpen(false)
          setSalaId(id)
        }}
      />
      <SalaDetalleDialog idSala={salaId} onOpenChange={(o) => !o && setSalaId(undefined)} />
    </div>
  )
}

// ------------------------------------------------------------------------------------------
// Nueva sala
// ------------------------------------------------------------------------------------------

function NuevaSalaDialog({
  open,
  onOpenChange,
  onCreada,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreada: (id: number) => void
}) {
  const { data: pensums } = usePensums()
  const [idPensum, setIdPensum] = useState<number | undefined>(undefined)
  const [idModulo, setIdModulo] = useState<number | undefined>(undefined)
  const [horas, setHoras] = useState(4)
  const [buscar, setBuscar] = useState('')
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const { data: arbol } = usePensumArbol(open ? idPensum : undefined)
  const modulos = arbol?.modulos ?? []
  const { tieneEvaluacion } = useEvaluacionesDeModulos(modulos.map((m) => m.id))
  const { data: elegibles, isLoading: cargandoElegibles } = useElegiblesSala(open ? idModulo : undefined)
  const crear = useCrearSala()

  useEffect(() => {
    if (!open) return
    setIdPensum(undefined)
    setIdModulo(undefined)
    setHoras(4)
    setBuscar('')
    setSeleccion(new Set())
  }, [open])

  // Al cargar las personas del módulo se preseleccionan las que aún no lo aprueban.
  useEffect(() => {
    setSeleccion(new Set((elegibles ?? []).filter((e) => e.estado !== 'Aprobado').map((e) => e.empleadoId)))
  }, [elegibles])

  const filtrados = useMemo(() => {
    const q = norm(buscar.trim())
    return (elegibles ?? []).filter((e) => !q || norm(e.nombre).includes(q))
  }, [elegibles, buscar])
  const sinDpi = (elegibles ?? []).filter((e) => seleccion.has(e.empleadoId) && !e.tieneDpi).length

  function toggle(id: number, on: boolean) {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function onCrear() {
    if (!idModulo || seleccion.size === 0) return
    try {
      const sala = await crear.mutateAsync({ idModulo, empleadoIds: [...seleccion], horasVigencia: horas })
      toast.success(`Sala ${sala.codigo} creada`)
      onCreada(sala.id)
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva sala de examen</DialogTitle>
          <DialogDescription>Elige el módulo y a las personas que van a hacer el examen.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Pensum</Label>
            <Select
              value={idPensum ? String(idPensum) : undefined}
              onValueChange={(v) => {
                setIdPensum(Number(v))
                setIdModulo(undefined)
              }}
            >
              <SelectTrigger><SelectValue placeholder="Elige un pensum" /></SelectTrigger>
              <SelectContent>
                {(pensums ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Módulo</Label>
            <Select value={idModulo ? String(idModulo) : undefined} onValueChange={(v) => setIdModulo(Number(v))} disabled={!idPensum}>
              <SelectTrigger><SelectValue placeholder={idPensum ? 'Elige un módulo' : 'Primero el pensum'} /></SelectTrigger>
              <SelectContent>
                {modulos.map((m, i) => (
                  <SelectItem key={m.id} value={String(m.id)} disabled={tieneEvaluacion(m.id) === false}>
                    {i + 1}. {m.modulo}{tieneEvaluacion(m.id) === false ? ' (sin evaluación)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {idModulo && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-slate-600">
                Personas ({seleccion.size} de {elegibles?.length ?? 0} seleccionadas)
              </Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setSeleccion(new Set((elegibles ?? []).map((e) => e.empleadoId)))}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSeleccion(new Set())}>Ninguna</Button>
              </div>
            </div>
            <Input placeholder="Buscar por nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            {cargandoElegibles ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (elegibles ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                Nadie tiene este módulo asignado. Asigna el pensum en la pestaña Asignar.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">
                {filtrados.map((e) => (
                  <li key={e.empleadoId}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                      <Checkbox checked={seleccion.has(e.empleadoId)} onCheckedChange={(c) => toggle(e.empleadoId, c === true)} />
                      <span className="min-w-0 flex-1 truncate text-slate-800">{e.nombre}</span>
                      {!e.tieneDpi && <Tag severity="warning" icon="solar:danger-triangle-linear" value="Sin DPI" />}
                      <Tag
                        severity={e.estado === 'Aprobado' ? 'success' : e.estado === 'No aprobado' ? 'danger' : 'secondary'}
                        value={e.puntuacion != null ? `${e.estado} · ${e.puntuacion}` : e.estado}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {sinDpi > 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                {sinDpi} persona(s) seleccionada(s) no tienen DPI registrado y no podrán entrar a la sala. Regístralo en su ficha o genérales su enlace individual en Asignados.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-600">La sala queda abierta</Label>
              <Input
                type="number"
                min={1}
                max={72}
                className="w-20"
                value={horas}
                onChange={(e) => setHoras(Math.min(72, Math.max(1, Number(e.target.value) || 1)))}
              />
              <span className="text-xs text-slate-500">hora(s)</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onCrear} disabled={!idModulo || seleccion.size === 0 || crear.isPending}>
            <Icon icon={crear.isPending ? 'svg-spinners:180-ring' : 'solar:play-circle-bold'} width={16} />
            Crear sala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ------------------------------------------------------------------------------------------
// Detalle de la sala (en vivo)
// ------------------------------------------------------------------------------------------

function SalaDetalleDialog({ idSala, onOpenChange }: { idSala: number | undefined; onOpenChange: (open: boolean) => void }) {
  const { data: sala, isLoading } = useSala(idSala)
  const cerrar = useCerrarSala()
  const desbloquear = useDesbloquearParticipante(idSala ?? 0)
  const [proyectar, setProyectar] = useState(false)

  useEffect(() => {
    if (idSala === undefined) setProyectar(false)
  }, [idSala])

  const conteo = useMemo(() => {
    const ps = sala?.participantes ?? []
    return {
      total: ps.length,
      pendiente: ps.filter((p) => p.estado === 'pendiente').length,
      en_curso: ps.filter((p) => p.estado === 'en_curso').length,
      terminado: ps.filter((p) => p.estado === 'terminado').length,
      aprobados: ps.filter((p) => p.resultado === 'Aprobado').length,
    }
  }, [sala])

  async function onCerrar() {
    if (!sala) return
    const ok = await confirmar({
      titulo: `¿Cerrar la sala ${sala.codigo}?`,
      mensaje: 'Ya nadie más podrá entrar. Quien esté respondiendo puede terminar su examen.',
      textoConfirmar: 'Cerrar sala',
      peligro: true,
    })
    if (!ok) return
    try {
      await cerrar.mutateAsync(sala.id)
      toast.success('Sala cerrada')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  function copiar() {
    if (!sala) return
    navigator.clipboard.writeText(linkSala(sala.codigo))
    toast.success('Enlace copiado')
  }

  const abierta = sala?.estado === 'ABIERTA'

  return (
    <Dialog open={idSala !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[95vh] overflow-y-auto', proyectar ? 'max-w-[96vw]' : 'sm:max-w-4xl')}>
        {isLoading || !sala ? (
          <div className="space-y-3 p-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                Sala {sala.codigo}
                <Tag severity={ESTADO_SALA[sala.estado].severity} value={ESTADO_SALA[sala.estado].label} />
              </DialogTitle>
              <DialogDescription>
                {sala.modulo}{sala.pensum ? ` · ${sala.pensum}` : ''} · {abierta ? `abierta hasta ${hora(sala.expiraEn)}` : sala.cerradaEn ? `cerrada ${hora(sala.cerradaEn)}` : 'vencida'}
              </DialogDescription>
            </DialogHeader>

            <div className={cn('grid gap-5', proyectar ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'md:grid-cols-[260px_minmax(0,1fr)]')}>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center">
                {abierta ? (
                  <>
                    <QRCodeSVG value={linkSala(sala.codigo)} size={proyectar ? 360 : 200} marginSize={1} />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Código de la sala</p>
                      <p className={cn('font-mono font-bold tracking-[0.3em] text-slate-900', proyectar ? 'text-6xl' : 'text-3xl')}>{sala.codigo}</p>
                    </div>
                    <p className={cn('break-all text-slate-500', proyectar ? 'text-lg' : 'text-xs')}>{linkSala(sala.codigo)}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={copiar}>
                        <Icon icon="solar:copy-bold" width={15} />
                        Copiar enlace
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setProyectar((p) => !p)}>
                        <Icon icon={proyectar ? 'solar:minimize-square-linear' : 'solar:maximize-square-linear'} width={15} />
                        {proyectar ? 'Vista normal' : 'Proyectar'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-sm text-slate-500">
                    <Icon icon="solar:lock-keyhole-bold" width={36} className="text-slate-400" />
                    La sala ya no admite entradas.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Conteo label="No han entrado" valor={conteo.pendiente} />
                  <Conteo label="Respondiendo" valor={conteo.en_curso} tono="text-sky-700" />
                  <Conteo label="Terminaron" valor={conteo.terminado} tono="text-emerald-700" />
                  <Conteo label="Aprobaron" valor={conteo.aprobados} tono="text-emerald-700" />
                </div>
                <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {sala.participantes.map((p) => {
                    const est = ESTADO_PARTICIPANTE[p.estado]
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                        <Icon icon={est.icon} width={18} className={p.estado === 'terminado' ? 'text-emerald-600' : p.estado === 'en_curso' ? 'text-sky-600' : 'text-slate-400'} />
                        <span className={cn('min-w-0 flex-1 truncate text-slate-800', proyectar && 'text-base')}>{p.nombre}</span>
                        {!p.tieneDpi && <Tag severity="warning" value="Sin DPI" />}
                        {p.bloqueado && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={() => desbloquear.mutate(p.id, { onError: (err) => toast.error(extractApiErrorMessage(err)) })}
                            disabled={desbloquear.isPending}
                            title="Bloqueado por equivocarse de DPI varias veces"
                          >
                            <Icon icon="solar:lock-unlocked-bold" width={14} />
                            Desbloquear
                          </Button>
                        )}
                        {p.estado === 'terminado' && p.resultado ? (
                          <Tag
                            severity={p.resultado === 'Aprobado' ? 'success' : 'danger'}
                            value={`${p.resultado}${p.puntuacion != null ? ` · ${p.puntuacion}` : ''}`}
                          />
                        ) : (
                          <Tag severity={est.severity} value={est.label} />
                        )}
                      </li>
                    )
                  })}
                </ul>
                {abierta && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon icon="svg-spinners:pulse-2" width={14} className="text-emerald-500" />
                    Se actualiza solo cada pocos segundos.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              {abierta && (
                <Button variant="destructive" onClick={onCerrar} disabled={cerrar.isPending}>
                  <Icon icon="solar:lock-keyhole-bold" width={16} />
                  Cerrar sala
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Conteo({ label, valor, tono }: { label: string; valor: number; tono?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('text-2xl font-bold text-slate-900', tono)}>{valor}</p>
    </div>
  )
}
