import {
  AlertTriangle,
  CalendarOff,
  Check,
  CheckCircle2,
  Clock,
  Cog,
  Factory,
  Hammer,
  ListChecks,
  LogOut,
  Package,
  UserX,
  type LucideIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatDate, parseHora } from '@/lib/utils'
import type { FuenteTurno, VerificacionAsistencia } from '@/types'

// =====================================================
// Helpers
// =====================================================
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function diaSemanaCorto(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return DIAS_SEMANA[d.getDay()]
}

function fmtMin(n: number): string {
  const m = Math.abs(Math.round(n))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

function diffMin(aHHMM: string | null, bHHMM: string | null): number | null {
  if (!aHHMM || !bHHMM) return null
  const a = parseHora(aHHMM)
  const b = parseHora(bHHMM)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return b - a
}

/**
 * Estado de un día, en el orden en que importa: primero lo que decidió RRHH (la ausencia), luego lo
 * que dice el reloj. Una ausencia registrada manda sobre el biométrico — es la regla que evita que
 * un día de vacaciones se reporte como "no vino" o como atraso.
 */
export type EstadoVerif =
  | { clase: 'justificada'; etiqueta: string; detalle: string }
  | { clase: 'injustificada'; etiqueta: string }
  | { clase: 'no-vino' }
  | { clase: 'sin-turno' }
  | { clase: 'falta-marca' }
  | { clase: 'novedad'; tarde: boolean; temprano: boolean; retrasoMin: number | null; tempranoMin: number | null }
  | { clase: 'autorizado'; }
  | { clase: 'ok' }

export function estadoVerif(v: VerificacionAsistencia): EstadoVerif {
  if (v.ausenciaEfecto === 'JORNADA_FIJA' || v.ausenciaEfecto === 'JORNADA_MEDIA') {
    return {
      clase: 'justificada',
      etiqueta: v.ausenciaNombre ?? 'Ausencia justificada',
      detalle: v.ausenciaEfecto === 'JORNADA_MEDIA' ? 'media jornada 08:00–13:00' : 'jornada 08:00–17:00',
    }
  }
  if (v.ausenciaEfecto === 'AUSENTE') {
    return { clase: 'injustificada', etiqueta: v.ausenciaNombre ?? 'Ausencia' }
  }
  if (v.tipoDia === 'AUSENTE') return { clase: 'no-vino' }
  if (v.marcaSinTurno) return { clase: 'sin-turno' }
  if (v.faltaMarca) return { clase: 'falta-marca' }
  if (v.llegoTarde || v.salioTemprano) {
    return {
      clase: 'novedad',
      tarde: v.llegoTarde,
      temprano: v.salioTemprano,
      retrasoMin: v.llegoTarde ? diffMin(v.horaEntradaProgramada, v.horaEntradaReal) : null,
      tempranoMin: v.salioTemprano ? diffMin(v.horaSalida, v.horaSalidaProgramada) : null,
    }
  }
  if (v.horarioAutorizado) return { clase: 'autorizado' }
  return { clase: 'ok' }
}

/** ¿Es un día que amerita revisión? Las ausencias justificadas NO lo son: ya están resueltas. */
export function tieneNovedad(v: VerificacionAsistencia): boolean {
  const e = estadoVerif(v)
  return e.clase !== 'ok' && e.clase !== 'autorizado' && e.clase !== 'justificada'
}

// =====================================================
// Badges
// =====================================================
const FUENTE_META: Record<FuenteTurno, { label: string; icon: LucideIcon; clase: string }> = {
  ACABADOS: { label: 'Acabados', icon: Hammer, clase: 'bg-sky-100 text-sky-800 hover:bg-sky-100' },
  MAQUINAS: { label: 'Máquinas', icon: Factory, clase: 'bg-violet-100 text-violet-800 hover:bg-violet-100' },
  PVC: { label: 'PVC', icon: Package, clase: 'bg-teal-100 text-teal-800 hover:bg-teal-100' },
  GENERAL: { label: 'General', icon: Cog, clase: 'bg-slate-100 text-slate-800 hover:bg-slate-100' },
}

export function TipoBadge({ tipo }: { tipo: FuenteTurno }) {
  const meta = FUENTE_META[tipo] ?? FUENTE_META.MAQUINAS
  const Icon = meta.icon
  return (
    <Badge className={cn('gap-1 border-transparent', meta.clase)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}

function EstadoBadges({ estado }: { estado: EstadoVerif }) {
  switch (estado.clase) {
    case 'justificada':
      return (
        <Badge className="gap-1 border-transparent bg-sky-100 text-sky-700 hover:bg-sky-100">
          <CalendarOff className="h-3 w-3" />
          {estado.etiqueta} · {estado.detalle}
        </Badge>
      )
    case 'injustificada':
      return (
        <Badge className="gap-1 border-transparent bg-rose-100 text-rose-700 hover:bg-rose-100">
          <CalendarOff className="h-3 w-3" />
          {estado.etiqueta} · sin horas
        </Badge>
      )
    case 'no-vino':
      return (
        <Badge className="gap-1 border-transparent bg-rose-100 text-rose-700 hover:bg-rose-100">
          <UserX className="h-3 w-3" />
          No se presentó
        </Badge>
      )
    case 'sin-turno':
      return (
        <Badge className="gap-1 border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100">
          <AlertTriangle className="h-3 w-3" />
          Marcó sin turno
        </Badge>
      )
    case 'falta-marca':
      return (
        <Badge className="gap-1 border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100">
          <AlertTriangle className="h-3 w-3" />
          Falta marca
        </Badge>
      )
    case 'autorizado':
      return (
        <Badge variant="success" className="gap-1">
          <Check className="h-3 w-3" />
          Horario autorizado
        </Badge>
      )
    case 'ok':
      return (
        <Badge variant="success" className="gap-1">
          <Check className="h-3 w-3" />
          A tiempo
        </Badge>
      )
    case 'novedad':
      return (
        <div className="flex flex-wrap gap-1">
          {estado.tarde && (
            <Badge className="gap-1 border-transparent bg-rose-100 text-rose-700 hover:bg-rose-100">
              <Clock className="h-3 w-3" />
              Tarde
              {estado.retrasoMin != null && ` +${fmtMin(estado.retrasoMin)}`}
            </Badge>
          )}
          {estado.temprano && (
            <Badge variant="warning" className="gap-1">
              <LogOut className="h-3 w-3" />
              Salió temprano
              {estado.tempranoMin != null && ` −${fmtMin(estado.tempranoMin)}`}
            </Badge>
          )}
        </div>
      )
  }
}

// Celda "programada → real". La hora real se resalta en rojo cuando hay novedad.
function HoraCell({
  programada,
  real,
  problema,
}: {
  programada: string | null
  real: string | null
  problema: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <span className="text-xs text-muted-foreground">{programada ?? '—'}</span>
      <span className="text-muted-foreground/50">→</span>
      <span
        className={cn(
          'text-sm font-semibold',
          real == null
            ? 'text-muted-foreground'
            : problema
              ? 'text-rose-600'
              : 'text-foreground',
        )}
      >
        {real ?? '—'}
      </span>
    </div>
  )
}

// =====================================================
// Resumen (chips)
// =====================================================
type Tono = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const TONO_ICON: Record<Tono, string> = {
  neutral: 'text-foreground',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  info: 'text-sky-600',
}

const TONO_BG: Record<Tono, string> = {
  neutral: 'bg-muted',
  success: 'bg-emerald-50',
  warning: 'bg-amber-50',
  danger: 'bg-rose-50',
  info: 'bg-sky-50',
}

function StatChip({
  icon: Icon,
  label,
  value,
  tono,
}: {
  icon: LucideIcon
  label: string
  value: number
  tono: Tono
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('rounded-md p-2', TONO_BG[tono])}>
        <Icon className={cn('h-4 w-4', TONO_ICON[tono])} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function VerificacionResumen({ rows }: { rows: VerificacionAsistencia[] }) {
  const total = rows.length
  const tarde = rows.filter((r) => estadoVerif(r).clase === 'novedad' && r.llegoTarde).length
  const temprano = rows.filter((r) => estadoVerif(r).clase === 'novedad' && r.salioTemprano).length
  const justificadas = rows.filter((r) => estadoVerif(r).clase === 'justificada').length
  const noVino = rows.filter((r) => {
    const c = estadoVerif(r).clase
    return c === 'no-vino' || c === 'injustificada'
  }).length
  const ok = rows.filter((r) => !tieneNovedad(r)).length

  return (
    <div className="grid grid-cols-2 gap-3 duration-300 animate-in fade-in-50 sm:grid-cols-3 lg:grid-cols-6">
      <StatChip icon={ListChecks} label="Días" value={total} tono="neutral" />
      <StatChip icon={CheckCircle2} label="Sin novedad" value={ok} tono="success" />
      <StatChip icon={Clock} label="Llegó tarde" value={tarde} tono="danger" />
      <StatChip icon={LogOut} label="Salió temprano" value={temprano} tono="warning" />
      <StatChip icon={UserX} label="No vino" value={noVino} tono="danger" />
      <StatChip icon={CalendarOff} label="Justificadas" value={justificadas} tono="info" />
    </div>
  )
}

// =====================================================
// Tabla
// =====================================================
function VerifRow({ v, mostrarEmpleado }: { v: VerificacionAsistencia; mostrarEmpleado: boolean }) {
  const estado = estadoVerif(v)
  const grave = estado.clase === 'no-vino' || estado.clase === 'injustificada'
  const leve =
    estado.clase === 'novedad' || estado.clase === 'falta-marca' || estado.clase === 'sin-turno'
  return (
    <TableRow
      className={cn(
        grave && 'bg-rose-50/60 hover:bg-rose-50',
        leve && 'bg-amber-50/50 hover:bg-amber-50',
        estado.clase === 'justificada' && 'bg-sky-50/40 hover:bg-sky-50',
      )}
    >
      {mostrarEmpleado && <TableCell className="font-medium">{v.nombre}</TableCell>}
      <TableCell className="tabular-nums">{formatDate(v.fecha)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{diaSemanaCorto(v.fecha)}</TableCell>
      <TableCell>
        <TipoBadge tipo={v.tipo} />
      </TableCell>
      <TableCell>
        <HoraCell
          programada={v.horaEntradaProgramada}
          real={v.horaEntradaReal}
          problema={v.llegoTarde}
        />
      </TableCell>
      <TableCell>
        <HoraCell
          programada={v.horaSalidaProgramada}
          real={v.horaSalidaReal}
          problema={v.salioTemprano}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {v.horasEfectivas > 0 ? v.horasEfectivas.toFixed(2) : '—'}
      </TableCell>
      <TableCell>
        <EstadoBadges estado={estado} />
      </TableCell>
    </TableRow>
  )
}

export function VerificacionTable({
  rows,
  isLoading,
  emptyText = 'Sin registros en el período',
  mostrarEmpleado = true,
}: {
  rows: VerificacionAsistencia[]
  isLoading?: boolean
  emptyText?: string
  mostrarEmpleado?: boolean
}) {
  const cols = mostrarEmpleado ? 8 : 7
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {mostrarEmpleado && <TableHead>Empleado</TableHead>}
            <TableHead>Fecha</TableHead>
            <TableHead>Día</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Salida</TableHead>
            <TableHead className="text-right">Horas</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={cols}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={cols} className="py-10 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((v, i) => (
              <VerifRow
                key={`${v.idEmpleado}-${v.fecha}-${i}`}
                v={v}
                mostrarEmpleado={mostrarEmpleado}
              />
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
