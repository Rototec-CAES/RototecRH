import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Boxes, Check, Clock, Cog, Download, Eye, Loader2, Moon, Package, Search, Sun, UserX, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import {
  useHorasExtra,
  useHorasExtraDesglose,
  useHorasExtraDetalle,
  useHorasExtraExcluidos,
} from '@/hooks/useHorasExtra'
import { horasExtraApi } from '@/api/horas-extra'
import { apellidosNombre, cn, formatCatorcena, formatRangoCorto } from '@/lib/utils'
import { exportarExcluidos, exportarHorasExtra } from '@/lib/exportHorasExtra'
import type { DesgloseSemanaHE, DetalleDiaHE, EmpleadoBackend, ExcluidoHE, FuenteTurno } from '@/types'

interface Fila {
  idEmpleado: number
  nombre: string
  fuente?: FuenteTurno
  periodo: string
  dia: number
  noche: number
  horasEfectivas: number
  excedente: number
  sistemas: string[]
}

// Etiqueta de la fuente del turno (de qué tabla viene el empleado).
function FuenteBadge({ fuente }: { fuente?: FuenteTurno }) {
  if (fuente === 'ACABADOS')
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-violet-100 text-violet-700">
        <Package className="h-3 w-3" /> Acabados
      </span>
    )
  if (fuente === 'MAQUINAS')
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-teal-100 text-teal-700">
        <Cog className="h-3 w-3" /> Máquinas
      </span>
    )
  if (fuente === 'PVC')
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-sky-100 text-sky-700">
        <Boxes className="h-3 w-3" /> PVC
      </span>
    )
  if (fuente === 'GENERAL')
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-indigo-100 text-indigo-700">
        <Clock className="h-3 w-3" /> General
      </span>
    )
  return <span className="text-xs text-muted-foreground">—</span>
}

// Nombre "APELLIDOS - Nombres": apellidos en negrita, nombres tenues (formato de directorio).
function NombreCell({ nombre }: { nombre: string }) {
  const i = nombre.indexOf(' - ')
  if (i === -1) return <span className="font-medium">{nombre}</span>
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold">{nombre.slice(0, i)}</span>
      <span className="text-muted-foreground"> — {nombre.slice(i + 3)}</span>
    </span>
  )
}

// Control segmentado para filtrar por fuente (Todos / Acabados / Máquinas / PVC), con conteos.
function FuenteFilter({
  value,
  onChange,
  counts,
}: {
  value: 'TODAS' | FuenteTurno
  onChange: (v: 'TODAS' | FuenteTurno) => void
  counts: Record<'TODAS' | FuenteTurno, number>
}) {
  const opts: { key: 'TODAS' | FuenteTurno; label: string; dot?: string; active: string }[] = [
    { key: 'TODAS', label: 'Todos', active: 'bg-foreground text-background' },
    { key: 'ACABADOS', label: 'Acabados', dot: 'bg-violet-500', active: 'bg-violet-600 text-white' },
    { key: 'MAQUINAS', label: 'Máquinas', dot: 'bg-teal-500', active: 'bg-teal-600 text-white' },
    { key: 'PVC', label: 'PVC', dot: 'bg-sky-500', active: 'bg-sky-600 text-white' },
    { key: 'GENERAL', label: 'General', dot: 'bg-indigo-500', active: 'bg-indigo-600 text-white' },
  ]
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {opts.map((o) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all',
              on ? `${o.active} shadow-sm` : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            {o.dot && <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-white' : o.dot)} />}
            {o.label}
            <span className={cn('tabular-nums', on ? 'opacity-90' : 'opacity-50')}>{counts[o.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

function hhDecimal(n: number): string {
  return n.toFixed(2)
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Primer día del mes en curso (YYYY-MM-DD, hora local). */
function primerDiaDelMes(): string {
  const n = new Date()
  return isoLocal(new Date(n.getFullYear(), n.getMonth(), 1))
}
/** Hoy (YYYY-MM-DD, hora local). */
function hoy(): string {
  return isoLocal(new Date())
}

export default function HorasExtraPage() {
  // Por defecto: del primer día del mes en curso hasta hoy.
  const [desde, setDesde] = useState(primerDiaDelMes)
  const [hasta, setHasta] = useState(hoy)
  const [texto, setTexto] = useState('')
  const [fuenteFiltro, setFuenteFiltro] = useState<'TODAS' | FuenteTurno>('TODAS')
  const [detalle, setDetalle] = useState<{ id: number; nombre: string } | null>(null)
  const [exportando, setExportando] = useState(false)

  const q = useHorasExtra(desde, hasta)
  const { data: empleados } = useEmpleadosBackendList()

  const empById = useMemo(() => {
    const m = new Map<number, EmpleadoBackend>()
    for (const e of empleados ?? []) m.set(e.id, e)
    return m
  }, [empleados])

  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = []
    for (const e of q.data ?? []) {
      for (const p of e.periodos) {
        // Mostrar quien tenga horas extra O un déficit (deben horas); ocultar lo neutro.
        if (p.dia <= 0 && p.noche <= 0 && p.excedente >= -0.005) continue
        const emp = empById.get(e.idEmpleado)
        const nombre = emp ? apellidosNombre(emp) : e.nombre || `#${e.idEmpleado}`
        out.push({ idEmpleado: e.idEmpleado, nombre, fuente: e.fuente, ...p })
      }
    }
    const t = texto.trim().toLowerCase()
    return out
      .filter((f) => fuenteFiltro === 'TODAS' || f.fuente === fuenteFiltro)
      .filter((f) => !t || f.nombre.toLowerCase().includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre) || a.periodo.localeCompare(b.periodo))
  }, [q.data, texto, fuenteFiltro, empById])

  // Conteo por fuente (sobre todo el universo con HE, sin aplicar el filtro de fuente) para las pestañas.
  const conteoFuente = useMemo(() => {
    const ids = { ACABADOS: new Set<number>(), MAQUINAS: new Set<number>(), PVC: new Set<number>(), GENERAL: new Set<number>() }
    for (const e of q.data ?? []) {
      const tieneHE = e.periodos.some((p) => p.dia > 0 || p.noche > 0 || p.excedente < -0.005)
      if (tieneHE && e.fuente) ids[e.fuente].add(e.idEmpleado)
    }
    return {
      ACABADOS: ids.ACABADOS.size,
      MAQUINAS: ids.MAQUINAS.size,
      PVC: ids.PVC.size,
      GENERAL: ids.GENERAL.size,
      TODAS: ids.ACABADOS.size + ids.MAQUINAS.size + ids.PVC.size + ids.GENERAL.size,
    }
  }, [q.data])

  const totalDia = filas.reduce((s, f) => s + f.dia, 0)
  const totalNoche = filas.reduce((s, f) => s + f.noche, 0)
  const empleadosConHE = new Set(filas.map((f) => f.idEmpleado)).size

  // Excluidos (programados que no marcaron), con el nombre resuelto desde el catálogo y ordenados.
  const exclQ = useHorasExtraExcluidos(desde, hasta)
  const excluidos = useMemo(() => {
    return (exclQ.data ?? [])
      .map((ex) => {
        const emp = empById.get(ex.idEmpleado)
        return { ...ex, nombre: emp ? apellidosNombre(emp) : ex.nombre || `#${ex.idEmpleado}` }
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [exclQ.data, empById])

  const onExportar = async () => {
    setExportando(true)
    try {
      // El detalle día a día de todos se trae al momento de exportar (consulta más pesada).
      const det = await horasExtraApi.detalleTodos(desde, hasta)
      const detalle = det.map((e) => {
        const emp = empById.get(e.idEmpleado)
        return {
          nombre: emp ? apellidosNombre(emp) : e.nombre || `#${e.idEmpleado}`,
          fuente: e.fuente,
          dias: e.dias,
        }
      })
      await exportarHorasExtra({ filas, excluidos, detalle, desde, hasta, fuente: fuenteFiltro })
    } finally {
      setExportando(false)
    }
  }
  const onExportarExcluidos = () => exportarExcluidos({ excluidos, desde, hasta })

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-amber-500/20 via-sky-500/15 to-violet-500/20 p-2.5 ring-1 ring-border">
          <Clock className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-none tracking-tight">Horas Extra</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Cálculo por catorcena · la catorcena y sus 2 semanas arrancan en la fecha «Desde»
          </p>
        </div>
      </div>

      {/* Barra de filtros */}
      <Card className="p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex items-end gap-2 rounded-lg border bg-muted/30 p-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Desde</label>
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-36" />
              </div>
              <span className="pb-2.5 text-muted-foreground">→</span>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hasta</label>
                <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-36" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Empleado</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Buscar por apellido o nombre…"
                  className="h-9 w-72 pl-9 pr-8"
                />
                {texto && (
                  <button
                    type="button"
                    onClick={() => setTexto('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Fuente</label>
              <FuenteFilter value={fuenteFiltro} onChange={setFuenteFiltro} counts={conteoFuente} />
            </div>
            <Button
              onClick={onExportar}
              disabled={!filas.length || exportando}
              className="h-9 gap-2 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              title="Descargar Resumen + Detalle día a día + Excluidos en Excel"
            >
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportando ? 'Generando…' : 'Exportar a Excel'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatChip icon={Users} label="Empleados con HE" value={String(empleadosConHE)} tone="neutral" />
        <StatChip icon={Sun} label="HE diurnas (h)" value={hhDecimal(totalDia)} tone="warning" />
        <StatChip icon={Moon} label="HE nocturnas (h)" value={hhDecimal(totalNoche)} tone="info" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Catorcena</TableHead>
              <TableHead>Sistema(s)</TableHead>
              <TableHead className="text-right">Efectivas</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">HE diurnas</TableHead>
              <TableHead className="text-right">HE nocturnas</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : q.isError ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-destructive">
                  Error al calcular horas extra. Revisa que el backend y los datos del rango existan.
                </TableCell>
              </TableRow>
            ) : filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Sin horas extra en el rango seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((f) => (
                <TableRow key={`${f.idEmpleado}-${f.periodo}`}>
                  <TableCell><NombreCell nombre={f.nombre} /></TableCell>
                  <TableCell><FuenteBadge fuente={f.fuente} /></TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {formatCatorcena(f.periodo)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.sistemas.join(' · ') || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{hhDecimal(f.horasEfectivas)}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      f.excedente < -0.005
                        ? 'font-semibold text-rose-600'
                        : f.excedente > 0.005
                          ? 'text-emerald-600'
                          : 'text-muted-foreground',
                    )}
                  >
                    {hhDecimal(f.excedente)}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', f.dia > 0 && 'font-semibold text-amber-600')}>
                    {hhDecimal(f.dia)}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', f.noche > 0 && 'font-semibold text-sky-600')}>
                    {hhDecimal(f.noche)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Ver detalle de días/sistema"
                      onClick={() => setDetalle({ id: f.idEmpleado, nombre: f.nombre })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <ExcluidosCard excluidos={excluidos} isLoading={exclQ.isLoading} onExport={onExportarExcluidos} />

      <DetalleDialog
        desde={desde}
        hasta={hasta}
        empleado={detalle}
        onClose={() => setDetalle(null)}
      />
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string
  tone: 'neutral' | 'warning' | 'info'
}) {
  const tones = {
    neutral: 'text-foreground bg-muted',
    warning: 'text-amber-600 bg-amber-50',
    info: 'text-sky-600 bg-sky-50',
  } as const
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div className={cn('rounded-md p-2', tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// Excluidos del cálculo: tienen turno programado en el rango pero no marcaron ("no vino").
function ExcluidosCard({
  excluidos,
  isLoading,
  onExport,
}: {
  excluidos: (ExcluidoHE & { nombre: string })[]
  isLoading: boolean
  onExport: () => void
}) {
  const [abierto, setAbierto] = useState(false)

  if (!isLoading && excluidos.length === 0) return null

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-2 text-left text-sm font-semibold"
        >
          <UserX className="h-4 w-4 text-rose-600" />
          Excluidos del cálculo
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
            {excluidos.length}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            programados que no marcaron (no vinieron)
          </span>
          <span className="text-xs text-muted-foreground">· {abierto ? 'ocultar' : 'ver'}</span>
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!excluidos.length}
          className="h-8 shrink-0 gap-2"
          title="Descargar los excluidos en Excel"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
      </div>

      {abierto && (
        <div className="mt-3 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead className="text-right">Días programados</TableHead>
                <TableHead>Razón</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                excluidos.map((f) => (
                  <TableRow key={f.idEmpleado}>
                    <TableCell><NombreCell nombre={f.nombre} /></TableCell>
                    <TableCell>
                      <FuenteBadge fuente={f.fuente} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{f.diasProgramados}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">No marcó (no vino)</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function diaSemana(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? '' : DIAS_SEM[d.getDay()]
}
function fmtHora(h: string): string {
  return h && h !== '00:00:00' ? h.slice(0, 5) : '—'
}
function fmt2(n: number): string {
  return n.toFixed(2)
}
/** Nº de días que cubre el periodo "AAAA-MM-DD..AAAA-MM-DD" (14 salvo la última catorcena cortada). */
function diasDelPeriodo(periodo: string): number {
  const [desde, hasta] = periodo.split('..')
  if (!desde || !hasta) return 0
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000) + 1
}
function rangoHoras(a: string | null, b: string | null): string {
  const ha = a ? fmtHora(a) : '—'
  const hb = b ? fmtHora(b) : '—'
  return ha === '—' && hb === '—' ? '—' : `${ha}–${hb}`
}
function fmtDuracion(min: number): string {
  const abs = Math.abs(Math.round(min))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}
function fmtCumpl(n?: number | null, unidad?: 'puntos' | 'kg' | null): string {
  if (n == null) return '—'
  const v = Number.isInteger(n) ? String(n) : n.toFixed(2)
  return `${v}${unidad === 'kg' ? ' kg' : unidad === 'puntos' ? ' pts' : ''}`
}

function Badge({ tone, children }: { tone: 'red' | 'amber' | 'green'; children: ReactNode }) {
  const tones = {
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-emerald-100 text-emerald-700',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

function EstadoDia({ dia, trabajado }: { dia: DetalleDiaHE; trabajado: boolean }) {
  // Turno programado sin ninguna marca → no se presentó (no se infiere asistencia ni se pagan horas).
  if (dia.tipo === 'AUSENTE') {
    return (
      <Badge tone="red">
        <AlertTriangle className="h-3 w-3" /> No se presentó
      </Badge>
    )
  }
  const badges: ReactNode[] = []
  if (dia.faltaMarca)
    badges.push(
      <Badge key="fm" tone="red">
        <AlertTriangle className="h-3 w-3" /> Falta marca
      </Badge>,
    )
  if (dia.marcaSinTurno)
    badges.push(
      <Badge key="mst" tone="red">
        <AlertTriangle className="h-3 w-3" /> Marcó s/turno
      </Badge>,
    )
  if (dia.marcaFueraDeTurno)
    badges.push(
      <Badge key="mft" tone="red">
        <AlertTriangle className="h-3 w-3" /> Marca fuera de turno
      </Badge>,
    )
  if (dia.entradaTarde && dia.entradaDeltaMin != null)
    badges.push(
      <Badge key="et" tone="amber">
        <Clock className="h-3 w-3" /> Entró {fmtDuracion(dia.entradaDeltaMin)} tarde
      </Badge>,
    )
  if (dia.entradaAntes && dia.entradaDeltaMin != null)
    badges.push(
      <Badge key="ea" tone="amber">
        <Clock className="h-3 w-3" /> Entró {fmtDuracion(dia.entradaDeltaMin)} antes
      </Badge>,
    )
  if (dia.salidaTarde && dia.salidaDeltaMin != null)
    badges.push(
      <Badge key="st" tone="amber">
        <Clock className="h-3 w-3" /> Salió {fmtDuracion(dia.salidaDeltaMin)} después
      </Badge>,
    )
  if (dia.salidaTemprano && dia.salidaDeltaMin != null)
    badges.push(
      <Badge key="se" tone="amber">
        <Clock className="h-3 w-3" /> Salió {fmtDuracion(dia.salidaDeltaMin)} antes
      </Badge>,
    )
  if (dia.horarioAutorizado)
    badges.push(
      <Badge key="ha" tone="green">
        <Check className="h-3 w-3" /> Horario autorizado
        {dia.cumplimientoPct != null ? ` · meta ${dia.cumplimientoPct.toFixed(2)}%` : ''}
      </Badge>,
    )
  if (badges.length === 0) {
    return trabajado ? (
      <Badge tone="green">
        <Check className="h-3 w-3" /> OK
      </Badge>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )
  }
  return <div className="flex flex-wrap gap-1">{badges}</div>
}

function DetalleDialog({
  desde,
  hasta,
  empleado,
  onClose,
}: {
  desde: string
  hasta: string
  empleado: { id: number; nombre: string } | null
  onClose: () => void
}) {
  const desg = useHorasExtraDesglose(desde, hasta, empleado?.id ?? null)
  const det = useHorasExtraDetalle(desde, hasta, empleado?.id ?? null)

  const porPeriodo = useMemo(() => {
    const m = new Map<string, DesgloseSemanaHE[]>()
    for (const f of desg.data ?? []) {
      const arr = m.get(f.periodo) ?? []
      arr.push(f)
      m.set(f.periodo, arr)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [desg.data])

  return (
    <Dialog open={!!empleado} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(96vw,88rem)]">
        <DialogHeader>
          <DialogTitle>Detalle — {empleado?.nombre}</DialogTitle>
          <DialogDescription>
            Cálculo por semana de la catorcena ({desde} – {hasta})
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-6 overflow-auto">
          {/* Desglose por semana (réplica del Resumen del Machote, cols H-W) */}
          {desg.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : porPeriodo.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos en el rango.</p>
          ) : (
            porPeriodo.map(([periodo, filas]) => {
              const heDia = filas.reduce((s, f) => s + f.saldoDia, 0)
              const heNoche = filas.reduce((s, f) => s + f.saldoNoche, 0)
              return (
                <div key={periodo} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      {formatCatorcena(periodo)}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {diasDelPeriodo(periodo)} días
                        {diasDelPeriodo(periodo) < 14 && ' · catorcena incompleta'}
                      </span>
                    </h4>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                        HE diurnas {fmt2(heDia)}
                      </span>
                      <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">
                        HE nocturnas {fmt2(heNoche)}
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                        HE totales {fmt2(heDia + heNoche)}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Semana</TableHead>
                          <TableHead className="whitespace-nowrap">Fechas</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Días</TableHead>
                          <TableHead className="whitespace-nowrap">Sistema</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Efectivas</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ordinarias</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Excedente</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Prop. día</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Prop. noche</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Saldo día</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Saldo noche</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filas.map((f) => (
                          <TableRow key={`${f.periodo}#${f.semana}`}>
                            <TableCell className="tabular-nums">{f.semana}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                              {formatRangoCorto(f.desde, f.hasta)}
                            </TableCell>
                            <TableCell
                              className={cn(
                                'text-right tabular-nums',
                                f.tipoSemana === 'parcial' ? 'font-medium text-amber-600' : 'text-muted-foreground',
                              )}
                              title={f.tipoSemana === 'parcial' ? 'Semana incompleta: ordinarias prorrateadas' : undefined}
                            >
                              {f.diasEnSemana}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">{f.sistema}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt2(f.horasEfectivas)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt2(f.ordinariasTotal)}</TableCell>
                            <TableCell
                              className={cn(
                                'text-right tabular-nums',
                                f.excedente > 0.005 ? 'font-medium text-emerald-600' : 'text-muted-foreground',
                              )}
                            >
                              {fmt2(f.excedente)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.propDia)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.propNoche)}
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums', f.saldoDia > 0.005 && 'font-medium text-amber-600')}>
                              {fmt2(f.saldoDia)}
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums', f.saldoNoche > 0.005 && 'font-medium text-sky-600')}>
                              {fmt2(f.saldoNoche)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Horas extra finales = suma de saldos (sin multiplicador, sin neteo) */}
                        <TableRow className="border-t-2 bg-muted/40 font-semibold">
                          <TableCell colSpan={9} className="text-right">
                            Horas extra finales · total {fmt2(heDia + heNoche)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-700">{fmt2(heDia)}</TableCell>
                          <TableCell className="text-right tabular-nums text-sky-700">{fmt2(heNoche)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })
          )}

          {/* Detalle día a día (qué día trabajó qué sistema) */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Detalle día a día</h4>
            <div className="max-h-[55vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead className="text-center">Programado</TableHead>
                    <TableHead className="text-center">Biométrico</TableHead>
                    <TableHead className="text-center">Oficial</TableHead>
                    <TableHead className="text-right">Efectivas</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Ejecutado</TableHead>
                    <TableHead className="text-right">% Cumpl.</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {det.isLoading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={12}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !det.data || det.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                        Sin datos en el rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    det.data.map((d) => {
                      const trabajado = d.tipo === 'DIA' || d.tipo === 'NOCHE'
                      const grave = d.faltaMarca || d.marcaSinTurno || d.marcaFueraDeTurno || d.tipo === 'AUSENTE'
                      const leve = d.inconsistente && !grave
                      return (
                        <TableRow
                          key={d.fecha}
                          className={cn(
                            !trabajado && 'text-muted-foreground',
                            grave && 'bg-rose-50',
                            !grave && leve && 'bg-amber-50',
                          )}
                        >
                          <TableCell className="tabular-nums">{d.fecha}</TableCell>
                          <TableCell className="text-xs">{diaSemana(d.fecha)}</TableCell>
                          <TableCell className="text-xs">{d.tipo}</TableCell>
                          <TableCell className="text-xs tabular-nums">{d.sistema}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">
                            {rangoHoras(d.turnoIngreso, d.turnoSalida)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-center text-xs tabular-nums',
                              leve && 'font-semibold text-amber-700',
                              grave && 'font-semibold text-rose-700',
                            )}
                          >
                            {rangoHoras(d.marcaIngreso, d.marcaSalida)}
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                            {rangoHoras(d.ingreso, d.egreso)}
                          </TableCell>
                          <TableCell className={cn('text-right tabular-nums', trabajado && 'font-medium')}>
                            {d.efectivas.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {fmtCumpl(d.metaDia, d.unidad)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {fmtCumpl(d.ejecutado, d.unidad)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right text-xs tabular-nums',
                              d.cumplimientoPct == null
                                ? 'text-muted-foreground'
                                : d.cumplioMeta
                                  ? 'font-semibold text-emerald-600'
                                  : 'text-amber-600',
                            )}
                          >
                            {d.cumplimientoPct == null ? '—' : `${d.cumplimientoPct.toFixed(2)}%`}
                          </TableCell>
                          <TableCell>
                            <EstadoDia dia={d} trabajado={trabajado} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
