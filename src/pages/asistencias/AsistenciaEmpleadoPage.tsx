import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DetailAction, DetailChip, DetailHeader } from '@/components/shared/DetailHeader'
import { FieldLabel, FilterCard } from '@/shared/report/report-ui'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useVerificacionAsistencias } from '@/hooks/useAsistencias'
import { quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { formatDate, nombreEmpleado } from '@/lib/utils'
import type { EmpleadoBackend } from '@/types'
import { VerificacionResumen, VerificacionTable } from '@/components/asistencias/verificacion'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TID = 'rh-asistencias-empleado'

/**
 * Detalle de asistencia de UN empleado. Es de solo lectura a propósito: la fuente es el biométrico
 * y la corrección de un día se hace registrando la ausencia que corresponda, no editando la marca.
 */
export default function AsistenciaEmpleadoPage() {
  const { id } = useParams<{ id: string }>()
  const idEmpleado = Number(id)
  const navigate = useNavigate()

  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados } = useEmpleadosBackendList()
  const verifQ = useVerificacionAsistencias(rango.desde, rango.hasta)

  const empleado = useMemo(
    () => ((empleados ?? []) as EmpleadoBackend[]).find((e) => e.id === idEmpleado),
    [empleados, idEmpleado],
  )

  const filas = useMemo(() => {
    return (verifQ.data ?? [])
      .filter((v) => v.idEmpleado === idEmpleado)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [verifQ.data, idEmpleado])

  const years = [year - 1, year, year + 1]

  return (
    <div className="space-y-5">
      <DetailHeader
        backLabel="Volver a asistencias"
        onBack={() => navigate('/asistencias')}
        eyebrow="Asistencia del empleado"
        title={empleado ? nombreEmpleado(empleado) : `Empleado #${idEmpleado}`}
        subtitle={
          <>
            Asistencia día a día, de solo lectura. Para corregir un día,{' '}
            <Link to="/ausencias" className="font-medium text-sky-400 hover:text-sky-300 hover:underline">
              registra la ausencia
            </Link>{' '}
            correspondiente.
          </>
        }
        actions={
          <DetailAction
            icon="solar:calendar-minimalistic-bold"
            label="Registrar ausencia"
            onClick={() => navigate('/ausencias')}
          />
        }
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <DetailChip icon="solar:hashtag-bold">Código {idEmpleado}</DetailChip>
            <DetailChip icon="solar:calendar-bold">
              <span className="tabular-nums">{formatDate(rango.desde)} – {formatDate(rango.hasta)}</span>
            </DetailChip>
          </div>
        }
      />

      <FilterCard>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <FieldLabel>Año</FieldLabel>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28" data-testid={`${TID}__filtro-anio`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Mes</FieldLabel>
            <Select value={String(monthIndex)} onValueChange={(v) => setMonthIndex(Number(v))}>
              <SelectTrigger className="w-40" data-testid={`${TID}__filtro-mes`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Quincena</FieldLabel>
            <Select value={String(quincena)} onValueChange={(v) => setQuincena(Number(v) as Quincena)}>
              <SelectTrigger className="w-32" data-testid={`${TID}__filtro-quincena`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1ª (1–15)</SelectItem>
                <SelectItem value="2">2ª (16–fin)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
            <Icon icon="solar:calendar-bold" width={16} className="text-slate-400" />
            <span className="tabular-nums">{formatDate(rango.desde)} – {formatDate(rango.hasta)}</span>
          </div>
        </div>
      </FilterCard>

      <VerificacionResumen rows={filas} loading={verifQ.isLoading} />

      <VerificacionTable
        rows={filas}
        isLoading={verifQ.isLoading}
        mostrarEmpleado={false}
        emptyText="Sin registros de asistencia en el período"
        emptyDescription="Prueba con otra quincena."
      />
    </div>
  )
}
