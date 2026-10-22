import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import { EmpleadoCombobox } from '@/components/ui/employee-combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from '@/components/shared/DataTable'
import {
  FieldLabel,
  FilterCard,
  FilterRow,
  GuiaLectura,
  Panel,
  Segmented,
} from '@/shared/report/report-ui'
import { usePreferenciaVisible } from '@/shared/report/report-utils'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useNoMarcaron, useVerificacionAsistencias } from '@/hooks/useAsistencias'
import { quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { formatDate, nombreEmpleado } from '@/lib/utils'
import type { EmpleadoBackend } from '@/types'
import {
  TipoBadge,
  VerificacionResumen,
  VerificacionTable,
  tieneNovedad,
} from '@/components/asistencias/verificacion'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TID = 'rh-asistencias'

type Filtro = 'todos' | 'novedades'

// Textos de la guía: describen exactamente las reglas de estadoVerif (verificacion.tsx).
const GUIA_ESTADOS = [
  { titulo: 'A tiempo', texto: 'Marcó entrada y salida dentro del horario de su turno.' },
  { titulo: 'Llegó tarde', texto: 'La entrada del reloj es posterior a la hora programada. Se indica cuánto tiempo.' },
  { titulo: 'Salió temprano', texto: 'Se fue antes de la hora de salida programada. Se pagan solo las horas presentes.' },
  { titulo: 'Falta marca', texto: 'Tenía turno y vino, pero falta la marca de entrada o de salida en el reloj.' },
  { titulo: 'Marcó sin turno', texto: 'Hay marcas en el reloj pero no tenía turno programado ese día. No suma horas hasta cargarle un turno.' },
  { titulo: 'No se presentó', texto: 'Tenía turno y no hay ninguna marca, o tiene una falta / suspensión registrada (sin horas).' },
  { titulo: 'Ausencia justificada', texto: 'Vacaciones, IGSS, duelo, etc. registrados en Ausencias. Se reconoce la jornada fija y manda sobre el reloj.' },
  { titulo: 'Horario autorizado', texto: 'Cumplió su meta del día: se le reconoce el horario programado completo aunque haya llegado tarde o salido antes.' },
]

export default function AsistenciasListPage() {
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)
  const [empleadoFiltro, setEmpleadoFiltro] = useState<string>('TODOS')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [guiaVisible, setGuiaVisible] = usePreferenciaVisible('rh-asistencias-guia', true)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados } = useEmpleadosBackendList()
  const verifQ = useVerificacionAsistencias(rango.desde, rango.hasta)
  const noMarcaronQ = useNoMarcaron(rango.desde, rango.hasta)

  // El catálogo de empleados manda sobre el nombre que viene del biométrico.
  const nombrePorId = useMemo(() => {
    const m = new Map<number, string>()
    for (const e of (empleados ?? []) as EmpleadoBackend[]) m.set(e.id, nombreEmpleado(e))
    return m
  }, [empleados])

  const filas = useMemo(() => {
    let r = (verifQ.data ?? []).map((v) => ({ ...v, nombre: nombrePorId.get(v.idEmpleado) ?? v.nombre }))
    if (empleadoFiltro !== 'TODOS') r = r.filter((v) => String(v.idEmpleado) === empleadoFiltro)
    if (filtro === 'novedades') r = r.filter(tieneNovedad)
    return [...r].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre))
  }, [verifQ.data, nombrePorId, empleadoFiltro, filtro])

  const noMarcaron = useMemo(() => {
    let r = (noMarcaronQ.data ?? []).map((n) => ({
      ...n,
      nombre: nombrePorId.get(n.idEmpleado) ?? n.nombre,
    }))
    if (empleadoFiltro !== 'TODOS') r = r.filter((n) => String(n.idEmpleado) === empleadoFiltro)
    return r
  }, [noMarcaronQ.data, nombrePorId, empleadoFiltro])

  const empleadosActivos = useMemo(() => {
    return ((empleados ?? []) as EmpleadoBackend[])
      .filter((e) => e.estaActivo)
      .map((e) => ({ id: e.id, nombre: nombreEmpleado(e) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [empleados])

  const years = [year - 1, year, year + 1]
  const conNovedad = useMemo(() => (verifQ.data ?? []).filter(tieneNovedad).length, [verifQ.data])

  return (
    <div className="space-y-5">
      <FilterCard>
        <PageHeader
          icono="solar:calendar-mark-bold"
          titulo="Asistencias"
          descripcion="Compara las marcas del reloj con el turno programado de cada empleado, día por día."
        >
          {!guiaVisible && (
            <Button variant="outline" size="sm" onClick={() => setGuiaVisible(true)} data-testid={`${TID}__btn-guia`}>
              <Icon icon="solar:book-2-bold" width={16} />
              ¿Qué significa cada estado?
            </Button>
          )}
        </PageHeader>

        <FilterRow className="justify-between">
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
            <div data-testid={`${TID}__filtro-empleado`}>
              <FieldLabel>Empleado</FieldLabel>
              <EmpleadoCombobox
                className="w-72"
                empleados={empleadosActivos}
                value={empleadoFiltro === 'TODOS' ? null : Number(empleadoFiltro)}
                onChange={(id) => setEmpleadoFiltro(id == null ? 'TODOS' : String(id))}
                allowAll
                allLabel="Todos"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
            <Icon icon="solar:calendar-bold" width={16} className="text-slate-400" />
            <span className="tabular-nums">{formatDate(rango.desde)} – {formatDate(rango.hasta)}</span>
          </div>
        </FilterRow>
      </FilterCard>

      <GuiaLectura
        visible={guiaVisible}
        onOcultar={() => setGuiaVisible(false)}
        titulo="Qué significa cada estado"
        items={GUIA_ESTADOS}
        columnas={4}
        testId={`${TID}__guia`}
      />

      <VerificacionResumen rows={verifQ.data ?? []} loading={verifQ.isLoading} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filtro>
          value={filtro}
          onChange={setFiltro}
          testId={`${TID}__filtro-novedades`}
          options={[
            { value: 'todos', label: 'Todos los días' },
            {
              value: 'novedades',
              label: (
                <>
                  Sólo novedades
                  <span className="rounded-full bg-black/10 px-1.5 text-xs tabular-nums">{conNovedad}</span>
                </>
              ),
            },
          ]}
        />
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Icon icon="solar:info-circle-bold" width={14} className="text-sky-500" />
          Las ausencias registradas mandan sobre el marcaje.
          <Link to="/ausencias" className="font-medium text-sky-500 hover:text-sky-600 hover:underline">
            Registrar una ausencia
          </Link>
        </p>
      </div>

      <VerificacionTable
        rows={filas}
        isLoading={verifQ.isLoading}
        emptyText={
          filtro === 'novedades'
            ? 'Sin novedades en el período'
            : 'Sin registros de asistencia en el período'
        }
        emptyDescription="Prueba con otra quincena o con otro empleado."
      />

      {noMarcaron.length > 0 && (
        <Panel
          flush
          icon="solar:user-cross-bold"
          title="No marcaron en todo el período"
          subtitle="Tenían turno programado y no registraron ni una marca. No tienen ausencia que lo explique: si corresponde, regístrala para que deje de aparecer aquí."
          right={
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              {noMarcaron.length} {noMarcaron.length === 1 ? 'empleado' : 'empleados'}
            </span>
          }
        >
          <DataTable className="rounded-none border-0 shadow-none">
            <DataTableHead>
              <DataTableHeadCell>Empleado</DataTableHeadCell>
              <DataTableHeadCell>Origen</DataTableHeadCell>
              <DataTableHeadCell className="text-right">Días programados</DataTableHeadCell>
              <DataTableHeadCell className="w-32" />
            </DataTableHead>
            <DataTableBody>
              {noMarcaron.map((n) => (
                <DataTableRow key={n.idEmpleado}>
                  <DataTableCell className="font-medium text-slate-900">{n.nombre}</DataTableCell>
                  <DataTableCell>{n.tipo ? <TipoBadge tipo={n.tipo} /> : <span className="text-slate-400">—</span>}</DataTableCell>
                  <DataTableCell className="text-right tabular-nums">{n.diasProgramados}</DataTableCell>
                  <DataTableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/asistencias/${n.idEmpleado}`} data-testid={`${TID}__ver-${n.idEmpleado}`}>
                        <Icon icon="solar:eye-bold" width={16} />
                        Ver detalle
                      </Link>
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Panel>
      )}
    </div>
  )
}
