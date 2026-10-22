import { Icon } from '@iconify/react'

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
import { KpiCard, Tag, type Accent } from '@/shared/report/report-ui'
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
const FUENTE_META: Record<FuenteTurno, { label: string; icon: string; clase: string }> = {
  ACABADOS: { label: 'Acabados', icon: 'solar:sledgehammer-bold', clase: 'bg-sky-100 text-sky-700' },
  MAQUINAS: { label: 'Máquinas', icon: 'solar:settings-bold', clase: 'bg-violet-100 text-violet-700' },
  PVC: { label: 'PVC', icon: 'solar:box-bold', clase: 'bg-teal-100 text-teal-700' },
  GENERAL: { label: 'General', icon: 'solar:widget-bold', clase: 'bg-slate-100 text-slate-600' },
}

export function TipoBadge({ tipo }: { tipo: FuenteTurno }) {
  const meta = FUENTE_META[tipo] ?? FUENTE_META.MAQUINAS
  return <Tag value={meta.label} icon={meta.icon} className={meta.clase} />
}

function EstadoBadges({ estado }: { estado: EstadoVerif }) {
  switch (estado.clase) {
    case 'justificada':
      return (
        <Tag
          severity="info"
          icon="solar:calendar-minimalistic-bold"
          value={`${estado.etiqueta} · ${estado.detalle}`}
        />
      )
    case 'injustificada':
      return <Tag severity="danger" icon="solar:calendar-minimalistic-bold" value={`${estado.etiqueta} · sin horas`} />
    case 'no-vino':
      return <Tag severity="danger" icon="solar:user-cross-bold" value="No se presentó" />
    case 'sin-turno':
      return <Tag severity="warning" icon="solar:danger-triangle-bold" value="Marcó sin turno" />
    case 'falta-marca':
      return <Tag severity="warning" icon="solar:danger-triangle-bold" value="Falta marca" />
    case 'autorizado':
      return <Tag severity="success" icon="solar:check-circle-bold" value="Horario autorizado" />
    case 'ok':
      return <Tag severity="success" icon="solar:check-circle-bold" value="A tiempo" />
    case 'novedad':
      return (
        <div className="flex flex-wrap gap-1">
          {estado.tarde && (
            <Tag
              severity="danger"
              icon="solar:clock-circle-bold"
              value={`Tarde${estado.retrasoMin != null ? ` +${fmtMin(estado.retrasoMin)}` : ''}`}
            />
          )}
          {estado.temprano && (
            <Tag
              severity="warning"
              icon="solar:logout-2-bold"
              value={`Salió temprano${estado.tempranoMin != null ? ` −${fmtMin(estado.tempranoMin)}` : ''}`}
            />
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
      <span className="text-xs text-slate-400" title="Programada">{programada ?? '—'}</span>
      <Icon icon="solar:arrow-right-linear" width={12} className="text-slate-300" />
      <span
        title="Real (reloj)"
        className={cn(
          'text-sm font-semibold',
          real == null ? 'text-slate-400' : problema ? 'text-rose-600' : 'text-slate-900',
        )}
      >
        {real ?? '—'}
      </span>
    </div>
  )
}

// =====================================================
// Resumen (KPIs)
// =====================================================
export function VerificacionResumen({ rows, loading }: { rows: VerificacionAsistencia[]; loading?: boolean }) {
  const total = rows.length
  const tarde = rows.filter((r) => estadoVerif(r).clase === 'novedad' && r.llegoTarde).length
  const temprano = rows.filter((r) => estadoVerif(r).clase === 'novedad' && r.salioTemprano).length
  const justificadas = rows.filter((r) => estadoVerif(r).clase === 'justificada').length
  const noVino = rows.filter((r) => {
    const c = estadoVerif(r).clase
    return c === 'no-vino' || c === 'injustificada'
  }).length
  const ok = rows.filter((r) => !tieneNovedad(r)).length

  const kpis: { label: string; value: number; accent: Accent; icon: string; hint: string }[] = [
    { label: 'Días', value: total, accent: 'slate', icon: 'solar:list-check-bold', hint: 'Registros en el período' },
    { label: 'Sin novedad', value: ok, accent: 'emerald', icon: 'solar:check-circle-bold', hint: 'A tiempo o justificados' },
    { label: 'Llegó tarde', value: tarde, accent: 'rose', icon: 'solar:clock-circle-bold', hint: 'Entrada después del turno' },
    { label: 'Salió temprano', value: temprano, accent: 'amber', icon: 'solar:logout-2-bold', hint: 'Salida antes del turno' },
    { label: 'No vino', value: noVino, accent: 'rose', icon: 'solar:user-cross-bold', hint: 'Sin marca o falta registrada' },
    { label: 'Justificadas', value: justificadas, accent: 'sky', icon: 'solar:calendar-minimalistic-bold', hint: 'Vacaciones, IGSS, permisos' },
  ]

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => (
        <KpiCard
          key={k.label}
          label={k.label}
          value={k.value}
          hint={k.hint}
          accent={k.accent}
          icon={k.icon}
          loading={loading}
        />
      ))}
    </section>
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
    <DataTableRow
      className={cn(
        grave && 'bg-rose-50/60 hover:bg-rose-50',
        leve && 'bg-amber-50/50 hover:bg-amber-50',
        estado.clase === 'justificada' && 'bg-sky-50/40 hover:bg-sky-50',
      )}
    >
      {mostrarEmpleado && <DataTableCell className="font-medium text-slate-900">{v.nombre}</DataTableCell>}
      <DataTableCell className="tabular-nums text-slate-700">{formatDate(v.fecha)}</DataTableCell>
      <DataTableCell className="text-xs text-slate-500">{diaSemanaCorto(v.fecha)}</DataTableCell>
      <DataTableCell>
        {v.tipo ? <TipoBadge tipo={v.tipo} /> : <span className="text-slate-400">—</span>}
      </DataTableCell>
      <DataTableCell>
        <HoraCell
          programada={v.horaEntradaProgramada}
          real={v.horaEntradaReal}
          problema={v.llegoTarde}
        />
      </DataTableCell>
      <DataTableCell>
        <HoraCell
          programada={v.horaSalidaProgramada}
          real={v.horaSalidaReal}
          problema={v.salioTemprano}
        />
      </DataTableCell>
      <DataTableCell className="text-right font-medium tabular-nums text-slate-700">
        {v.horasEfectivas > 0 ? v.horasEfectivas.toFixed(2) : '—'}
      </DataTableCell>
      <DataTableCell>
        <EstadoBadges estado={estado} />
      </DataTableCell>
    </DataTableRow>
  )
}

export function VerificacionTable({
  rows,
  isLoading,
  emptyText = 'Sin registros en el período',
  emptyDescription,
  mostrarEmpleado = true,
}: {
  rows: VerificacionAsistencia[]
  isLoading?: boolean
  emptyText?: string
  emptyDescription?: string
  mostrarEmpleado?: boolean
}) {
  const cols = mostrarEmpleado ? 8 : 7
  return (
    <DataTable minWidth="860px">
      <DataTableHead>
        {mostrarEmpleado && <DataTableHeadCell>Empleado</DataTableHeadCell>}
        <DataTableHeadCell>Fecha</DataTableHeadCell>
        <DataTableHeadCell>Día</DataTableHeadCell>
        <DataTableHeadCell>Origen</DataTableHeadCell>
        <DataTableHeadCell>Entrada (prog. → real)</DataTableHeadCell>
        <DataTableHeadCell>Salida (prog. → real)</DataTableHeadCell>
        <DataTableHeadCell className="text-right">Horas</DataTableHeadCell>
        <DataTableHeadCell>Estado</DataTableHeadCell>
      </DataTableHead>
      <DataTableBody>
        {isLoading ? (
          <DataTableSkeleton rows={6} cols={cols} />
        ) : rows.length === 0 ? (
          <DataTableEmpty
            icon="solar:calendar-search-bold"
            title={emptyText}
            description={emptyDescription}
            colSpan={cols}
          />
        ) : (
          rows.map((v, i) => (
            <VerifRow
              key={`${v.idEmpleado}-${v.fecha}-${i}`}
              v={v}
              mostrarEmpleado={mostrarEmpleado}
            />
          ))
        )}
      </DataTableBody>
    </DataTable>
  )
}
