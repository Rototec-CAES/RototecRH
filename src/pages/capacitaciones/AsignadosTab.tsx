import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { TableResultCount, TableSearch } from '@/components/shared/TableToolbar'
import { FieldLabel, Tag } from '@/shared/report/report-ui'
import { useEmpleadosCap } from '@/hooks/useCapacitaciones'
import { usePuestoOptions, useDepartamentoOptions } from '@/hooks/usePuestoOptions'
import { NameCombobox } from '@/components/ui/name-combobox'
import type { EmpleadoCapResumen } from '@/types'
import { EmpleadoCapDetailSheet } from './EmpleadoCapDetailSheet'

const TID = 'rh-capacitaciones'

function licenciaBadge(estado: 'activa' | 'expirada' | 'sin_licencia') {
  if (estado === 'activa') return <Tag severity="success" icon="solar:shield-check-bold" value="Licencia activa" />
  if (estado === 'expirada') return <Tag severity="danger" icon="solar:shield-warning-bold" value="Licencia expirada" />
  return <Tag severity="secondary" value="Sin licencia" />
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function AsignadosTab() {
  const [puestoId, setPuestoId] = useState<number | null>(null)
  const [departamentoId, setDepartamentoId] = useState<number | null>(null)
  const [estado, setEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | undefined>(undefined)

  const { options: puestoOptions } = usePuestoOptions()
  const { options: deptoOptions } = useDepartamentoOptions()

  // Pass numeric id as string to keep existing hook/mock signature intact
  const filtros = {
    puesto: puestoId != null ? String(puestoId) : undefined,
    departamento: departamentoId != null ? String(departamentoId) : undefined,
    estado: estado === 'todos' ? undefined : estado,
  }
  const { data, isLoading, isError, isFetching, refetch } = useEmpleadosCap(filtros)

  const empleados = useMemo(() => {
    const all = data ?? []
    if (!search.trim()) return all
    const q = norm(search.trim())
    return all.filter((e) => norm(e.nombre).includes(q))
  }, [data, search])

  // Puesto name resolver fallback
  const puestoMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const o of puestoOptions) m.set(o.id, o.nombre)
    return m
  }, [puestoOptions])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <FieldLabel>Puesto</FieldLabel>
            <NameCombobox
              options={puestoOptions}
              value={puestoId}
              onChange={setPuestoId}
              placeholder="Todos los puestos"
              allowAll
              allLabel="Todos los puestos"
              className="sm:w-52"
            />
          </div>
          <div>
            <FieldLabel>Departamento</FieldLabel>
            <NameCombobox
              options={deptoOptions}
              value={departamentoId}
              onChange={setDepartamentoId}
              placeholder="Todos los departamentos"
              allowAll
              allLabel="Todos los departamentos"
              className="sm:w-56"
            />
          </div>
          <div>
            <FieldLabel>Estado</FieldLabel>
            <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
              <SelectTrigger className="sm:w-36" data-testid={`${TID}__filtro-estado`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Buscar empleado</FieldLabel>
            <TableSearch
              value={search}
              onChange={setSearch}
              placeholder="Nombre del empleado"
              className="sm:w-60"
              testId={`${TID}__filtro-busqueda-asignados`}
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <TableResultCount total={(data ?? []).length} filtered={empleados.length} label="empleado" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              aria-label="Actualizar"
              title="Actualizar"
              disabled={isFetching}
            >
              <Icon icon={isFetching ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={16} />
            </Button>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon icon="solar:info-circle-linear" width={14} />
        Haz clic en un empleado para ver el detalle de sus módulos y evaluaciones.
      </p>

      <DataTable minWidth="760px">
        <DataTableHead>
          <DataTableHeadCell>Nombre</DataTableHeadCell>
          <DataTableHeadCell>Puesto</DataTableHeadCell>
          <DataTableHeadCell>Capacitación</DataTableHeadCell>
          <DataTableHeadCell>Estado</DataTableHeadCell>
          <DataTableHeadCell className="text-right">Progreso</DataTableHeadCell>
          <DataTableHeadCell>Licencia</DataTableHeadCell>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            <DataTableSkeleton rows={4} cols={6} />
          ) : isError ? (
            <DataTableEmpty
              icon="solar:danger-triangle-bold"
              title="No se pudieron cargar los empleados"
              description="Revisa la conexión y presiona el botón Actualizar."
              colSpan={6}
            />
          ) : empleados.length === 0 ? (
            <DataTableEmpty
              icon="solar:users-group-rounded-bold"
              title="Sin empleados asignados"
              description="Cambia los filtros o asigna capacitaciones en la pestaña Asignar."
              colSpan={6}
            />
          ) : (
            empleados.map((e) => (
              <EmpleadoRow
                key={e.empleadoId}
                emp={e}
                puestoNombre={e.puestoNombre ?? (e.idPuesto != null ? (puestoMap.get(e.idPuesto) ?? '—') : '—')}
                onOpen={() => setSelected(e.empleadoId)}
              />
            ))
          )}
        </DataTableBody>
      </DataTable>

      <EmpleadoCapDetailSheet
        empleadoId={selected}
        open={selected != null}
        onOpenChange={(o) => !o && setSelected(undefined)}
      />
    </div>
  )
}

function EmpleadoRow({
  emp,
  puestoNombre,
  onOpen,
}: {
  emp: EmpleadoCapResumen
  puestoNombre: string
  onOpen: () => void
}) {
  const pct = emp.modulosTotal > 0 ? Math.round((emp.modulosAprobados / emp.modulosTotal) * 100) : 0
  return (
    <DataTableRow onClick={onOpen}>
      <DataTableCell className="font-medium text-slate-900">{emp.nombre}</DataTableCell>
      <DataTableCell className="text-slate-600">{puestoNombre}</DataTableCell>
      <DataTableCell className="text-slate-600">{emp.capacitacionNombre ?? '—'}</DataTableCell>
      <DataTableCell>
        {emp.estaActivo ? (
          <Tag severity="success" value="Activo" />
        ) : (
          <Tag severity="danger" value="Inactivo" />
        )}
      </DataTableCell>
      <DataTableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="tabular-nums text-slate-700">
            {emp.modulosAprobados}/{emp.modulosTotal}
          </span>
        </div>
      </DataTableCell>
      <DataTableCell>
        {licenciaBadge(emp.licenciaEstado)}
      </DataTableCell>
    </DataTableRow>
  )
}
