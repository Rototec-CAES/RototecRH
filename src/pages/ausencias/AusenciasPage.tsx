import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'

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
  DataTableEmpty,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
  DataTableSkeleton,
} from '@/components/shared/DataTable'
import { TableResultCount } from '@/components/shared/TableToolbar'
import { confirmar } from '@/components/shared/ConfirmDialog'
import { FieldLabel, FilterCard, FilterRow, Tag } from '@/shared/report/report-ui'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useAusenciasPeriodoBackend, useEliminarAusencia, useTiposAusencia } from '@/hooks/useAusenciasBackend'
import { useAuth } from '@/hooks/useAuth'
import { quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { formatDate, nombreEmpleado } from '@/lib/utils'
import type { AusenciaBackend, EmpleadoBackend } from '@/types'
import { AusenciaFormDialog } from './AusenciaFormDialog'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const TID = 'rh-ausencias'

function diaSemanaCorto(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return DIAS_SEMANA[d.getDay()]
}

export default function AusenciasPage() {
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)
  const [empleadoFiltro, setEmpleadoFiltro] = useState<string>('TODOS')
  const [ausenciaOpen, setAusenciaOpen] = useState(false)
  const [editando, setEditando] = useState<AusenciaBackend | null>(null)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { user } = useAuth()
  const puedeEliminarAusencia = user?.rol === 1
  const { data: empleados } = useEmpleadosBackendList()
  const tiposQ = useTiposAusencia()
  const ausenciasQ = useAusenciasPeriodoBackend(rango.desde, rango.hasta)

  const empById = useMemo(() => {
    const m = new Map<number, EmpleadoBackend>()
    for (const e of empleados ?? []) m.set(e.id, e)
    return m
  }, [empleados])

  const tipoNombreById = useMemo(() => {
    const m = new Map<number, string>()
    for (const t of tiposQ.data ?? []) m.set(t.id, t.nombre ?? `#${t.id}`)
    return m
  }, [tiposQ.data])

  const ausenciasFiltradas = useMemo(() => {
    const all = ausenciasQ.data ?? []
    const f = empleadoFiltro === 'TODOS' ? all : all.filter((a) => String(a.idEmpleado) === empleadoFiltro)
    return [...f].sort((a, b) => a.fechaAusencia.localeCompare(b.fechaAusencia))
  }, [ausenciasQ.data, empleadoFiltro])

  const empleadosActivos = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estaActivo)
      .map((e) => ({ id: e.id, nombre: nombreEmpleado(e) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [empleados])

  const years = [year - 1, year, year + 1]

  function abrirCrear() {
    setEditando(null)
    setAusenciaOpen(true)
  }
  function abrirEditar(a: AusenciaBackend) {
    setEditando(a)
    setAusenciaOpen(true)
  }

  return (
    <div className="space-y-5">
      <FilterCard>
        <PageHeader
          icono="solar:calendar-minimalistic-bold"
          titulo="Ausencias"
          descripcion="Registra vacaciones, IGSS, permisos y faltas. Lo que se registra aquí manda sobre el reloj en Asistencias y en la planilla."
        >
          <Button onClick={abrirCrear} data-testid={`${TID}__btn-nueva`}>
            <Icon icon="solar:add-circle-bold" width={16} />
            Registrar ausencia
          </Button>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableResultCount total={ausenciasFiltradas.length} label="ausencia" />
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Icon icon="solar:info-circle-bold" width={14} className="text-sky-500" />
          Atrasos, salidas tempranas y no-shows se revisan en
          <Link to="/asistencias" className="font-medium text-sky-500 hover:text-sky-600 hover:underline">
            Asistencias
          </Link>
        </p>
      </div>

      <DataTable minWidth="900px">
        <DataTableHead>
          <DataTableHeadCell>Fecha</DataTableHeadCell>
          <DataTableHeadCell>Día</DataTableHeadCell>
          <DataTableHeadCell>Empleado</DataTableHeadCell>
          <DataTableHeadCell>Tipo</DataTableHeadCell>
          <DataTableHeadCell>Constancia</DataTableHeadCell>
          <DataTableHeadCell className="text-right">Días desc.</DataTableHeadCell>
          <DataTableHeadCell>Séptimo</DataTableHeadCell>
          <DataTableHeadCell>IGSS</DataTableHeadCell>
          <DataTableHeadCell className="w-28 text-right">Acciones</DataTableHeadCell>
        </DataTableHead>
        <DataTableBody>
          {ausenciasQ.isLoading ? (
            <DataTableSkeleton rows={4} cols={9} />
          ) : ausenciasFiltradas.length === 0 ? (
            <DataTableEmpty
              icon="solar:calendar-minimalistic-bold"
              title="Sin ausencias en el período"
              description="Usa «Registrar ausencia» para agregar vacaciones, IGSS, permisos o faltas."
              colSpan={9}
            />
          ) : (
            ausenciasFiltradas.map((a) => (
              <AusenciaRow
                key={a.id}
                ausencia={a}
                nombre={empById.get(a.idEmpleado) ? nombreEmpleado(empById.get(a.idEmpleado)!) : `#${a.idEmpleado}`}
                tipoNombre={tipoNombreById.get(a.tipoAusencia) ?? `#${a.tipoAusencia}`}
                onEdit={() => abrirEditar(a)}
                puedeEliminar={puedeEliminarAusencia}
              />
            ))
          )}
        </DataTableBody>
      </DataTable>

      <AusenciaFormDialog
        open={ausenciaOpen}
        onOpenChange={(o) => {
          setAusenciaOpen(o)
          if (!o) setEditando(null)
        }}
        ausencia={editando}
      />
    </div>
  )
}

function AusenciaRow({
  ausencia,
  nombre,
  tipoNombre,
  onEdit,
  puedeEliminar,
}: {
  ausencia: AusenciaBackend
  nombre: string
  tipoNombre: string
  onEdit: () => void
  puedeEliminar: boolean
}) {
  const eliminar = useEliminarAusencia()

  async function onDelete() {
    const ok = await confirmar({
      titulo: '¿Eliminar esta ausencia?',
      mensaje: `${nombre} · ${formatDate(ausencia.fechaAusencia)} · ${tipoNombre}`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    try {
      await eliminar.mutateAsync(ausencia.id)
      toast.success('Ausencia eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <DataTableRow>
      <DataTableCell className="tabular-nums text-slate-700">{formatDate(ausencia.fechaAusencia)}</DataTableCell>
      <DataTableCell className="text-xs text-slate-500">{diaSemanaCorto(ausencia.fechaAusencia)}</DataTableCell>
      <DataTableCell className="font-medium text-slate-900">{nombre}</DataTableCell>
      <DataTableCell className="text-slate-700">{tipoNombre}</DataTableCell>
      <DataTableCell>
        {ausencia.presentoConstancia ? (
          <Tag severity="success" icon="solar:check-circle-bold" value="Sí" />
        ) : (
          <span className="text-xs text-slate-400">No</span>
        )}
      </DataTableCell>
      <DataTableCell className="text-right font-medium tabular-nums">{ausencia.diasDescontados}</DataTableCell>
      <DataTableCell>
        {ausencia.descontarSeptimo ? (
          <Tag severity="warning" value="Sí" />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </DataTableCell>
      <DataTableCell>
        {ausencia.pagaIGSS ? (
          <Tag severity="info" value="IGSS paga" />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </DataTableCell>
      <DataTableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Editar" aria-label="Editar">
            <Icon icon="solar:pen-bold" width={16} />
          </Button>
          {puedeEliminar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              onClick={onDelete}
              disabled={eliminar.isPending}
              title="Eliminar"
              aria-label="Eliminar"
            >
              <Icon icon={eliminar.isPending ? 'svg-spinners:180-ring' : 'solar:trash-bin-trash-bold'} width={16} />
            </Button>
          )}
        </div>
      </DataTableCell>
    </DataTableRow>
  )
}
