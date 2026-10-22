import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'

import { Checkbox } from '@/components/ui/checkbox'
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
import { FieldLabel } from '@/shared/report/report-ui'
import {
  useAsignarPrimaria,
  useAsignarSecundaria,
  useElegibles,
  usePensums,
} from '@/hooks/useCapacitaciones'
import { usePuestoOptions, useDepartamentoOptions } from '@/hooks/usePuestoOptions'
import { NameCombobox } from '@/components/ui/name-combobox'
import { asignacionSecundariaSchema } from '@/lib/validators'
import { notify } from '@/lib/notify'
import type { EmpleadoCapElegible } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const TID = 'rh-capacitaciones'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function AsignarTab() {
  const [puestoId, setPuestoId] = useState<number | null>(null)
  const [departamentoId, setDepartamentoId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const { options: puestoOptions } = usePuestoOptions()
  const { options: deptoOptions } = useDepartamentoOptions()
  const { data: pensums } = usePensums()

  const filtros = {
    puesto: puestoId ?? undefined,
    departamento: departamentoId ?? undefined,
  }
  const { data, isLoading, isError, isFetching, refetch } = useElegibles(filtros)

  const elegibles = useMemo(() => {
    const all = data ?? []
    if (!search.trim()) return all
    const q = norm(search.trim())
    return all.filter((e) => norm(e.nombre).includes(q))
  }, [data, search])

  // Multi-select state
  const [selected, setSelected] = useState<Set<number>>(new Set())

  function resetFilters() {
    setSelected(new Set())
  }

  function toggleAll() {
    if (selected.size === elegibles.length && elegibles.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(elegibles.map((e) => e.empleadoId)))
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const asignar = useAsignarPrimaria()

  async function onAsignarPrimaria() {
    if (selected.size === 0) return
    try {
      await asignar.mutateAsync([...selected])
      notify('success', `Asignación creada para ${selected.size} empleado(s)`)
      setSelected(new Set())
    } catch (err) {
      notify('error', 'No se pudo asignar', err instanceof Error ? err.message : 'Error al asignar')
    }
  }

  const allSelected = elegibles.length > 0 && selected.size === elegibles.length
  const someSelected = selected.size > 0 && selected.size < elegibles.length

  // Secundaria dialog state
  const [secundariaFor, setSecundariaFor] = useState<EmpleadoCapElegible | undefined>()

  // Puesto name resolver fallback
  const puestoMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const o of puestoOptions) m.set(o.id, o.nombre)
    return m
  }, [puestoOptions])

  // Pensum name resolver fallback
  const pensumMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of pensums ?? []) m.set(p.id, p.nombre)
    return m
  }, [pensums])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <FieldLabel>Puesto</FieldLabel>
            <NameCombobox
              options={puestoOptions}
              value={puestoId}
              onChange={(v) => { setPuestoId(v); resetFilters() }}
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
              onChange={(v) => { setDepartamentoId(v); resetFilters() }}
              placeholder="Todos los departamentos"
              allowAll
              allLabel="Todos los departamentos"
              className="sm:w-56"
            />
          </div>
          <div>
            <FieldLabel>Buscar empleado</FieldLabel>
            <TableSearch
              value={search}
              onChange={(v) => { setSearch(v); resetFilters() }}
              placeholder="Nombre del empleado"
              className="sm:w-60"
              testId={`${TID}__filtro-busqueda-asignar`}
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <TableResultCount total={(data ?? []).length} filtered={elegibles.length} label="empleado" />
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

      {/* Barra de selección */}
      <div
        className={
          selected.size > 0
            ? 'flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3'
            : 'flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3'
        }
      >
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Icon icon="solar:checklist-minimalistic-bold" width={18} className={selected.size > 0 ? 'text-sky-600' : 'text-slate-400'} />
          {selected.size > 0 ? (
            <span>
              <strong className="text-sky-700">{selected.size}</strong> empleado(s) seleccionado(s). Se les asignará el pensum de su puesto.
            </span>
          ) : (
            'Marca los empleados a los que quieres asignar la capacitación de su puesto.'
          )}
        </p>
        <Button
          onClick={onAsignarPrimaria}
          disabled={selected.size === 0 || asignar.isPending}
          data-testid={`${TID}__btn-asignar-primaria`}
        >
          <Icon icon={asignar.isPending ? 'svg-spinners:180-ring' : 'solar:user-plus-bold'} width={16} />
          {asignar.isPending ? 'Asignando…' : 'Asignar (primaria)'}
        </Button>
      </div>

      {/* Tabla */}
      <DataTable minWidth="680px">
        <DataTableHead>
          <DataTableHeadCell className="w-12">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-sky-500"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={toggleAll}
              aria-label="Seleccionar todos"
              disabled={elegibles.length === 0}
            />
          </DataTableHeadCell>
          <DataTableHeadCell>Nombre</DataTableHeadCell>
          <DataTableHeadCell>Puesto</DataTableHeadCell>
          <DataTableHeadCell>Capacitación</DataTableHeadCell>
          <DataTableHeadCell />
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            <DataTableSkeleton rows={4} cols={5} />
          ) : isError ? (
            <DataTableEmpty
              icon="solar:danger-triangle-bold"
              title="No se pudieron cargar los empleados elegibles"
              description="Revisa la conexión y presiona el botón Actualizar."
              colSpan={5}
            />
          ) : elegibles.length === 0 ? (
            <DataTableEmpty
              icon="solar:users-group-rounded-bold"
              title="No hay empleados elegibles"
              description="Cambia los filtros de puesto o departamento."
              colSpan={5}
            />
          ) : (
            elegibles.map((e) => (
              <ElegibleRow
                key={e.empleadoId}
                emp={e}
                checked={selected.has(e.empleadoId)}
                onToggle={() => toggle(e.empleadoId)}
                onSecundaria={() => setSecundariaFor(e)}
                puestoNombre={e.puestoNombre ?? puestoMap.get(e.idPuesto) ?? '—'}
                pensumNombre={e.pensumNombre ?? pensumMap.get(e.idPensum) ?? '—'}
              />
            ))
          )}
        </DataTableBody>
      </DataTable>

      {/* Secundaria dialog */}
      {secundariaFor && (
        <SecundariaDialog
          emp={secundariaFor}
          open={true}
          onClose={() => setSecundariaFor(undefined)}
        />
      )}
    </div>
  )
}

function ElegibleRow({
  emp,
  checked,
  onToggle,
  onSecundaria,
  puestoNombre,
  pensumNombre,
}: {
  emp: EmpleadoCapElegible
  checked: boolean
  onToggle: () => void
  onSecundaria: () => void
  puestoNombre: string
  pensumNombre: string
}) {
  return (
    <DataTableRow onClick={onToggle} selected={checked}>
      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          aria-label={`Seleccionar ${emp.nombre}`}
        />
      </td>
      <DataTableCell className="font-medium text-slate-900">{emp.nombre}</DataTableCell>
      <DataTableCell className="text-slate-600">{puestoNombre}</DataTableCell>
      <DataTableCell className="text-slate-600">{pensumNombre}</DataTableCell>
      <DataTableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          title="Asignar un pensum adicional, distinto al de su puesto"
          onClick={(e) => {
            e.stopPropagation()
            onSecundaria()
          }}
        >
          <Icon icon="solar:add-square-bold" width={15} />
          Secundaria
        </Button>
      </DataTableCell>
    </DataTableRow>
  )
}

function SecundariaDialog({
  emp,
  open,
  onClose,
}: {
  emp: EmpleadoCapElegible
  open: boolean
  onClose: () => void
}) {
  const { data: pensums } = usePensums()
  const asignar = useAsignarSecundaria(emp.empleadoId)
  const [idPensum, setIdPensum] = useState('')

  async function onAssign() {
    const parsed = asignacionSecundariaSchema.safeParse({ idPensum })
    if (!parsed.success) {
      notify('warn', 'Selecciona un pensum')
      return
    }
    try {
      await asignar.mutateAsync(parsed.data.idPensum)
      notify('success', 'Pensum secundario asignado')
      onClose()
    } catch (err) {
      notify('error', 'No se pudo asignar', err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar capacitación secundaria</DialogTitle>
          <DialogDescription>
            {emp.nombre} · un pensum adicional, aparte del de su puesto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="sec-pensum" className="text-xs font-semibold text-slate-600">Pensum</Label>
          <Select value={idPensum} onValueChange={setIdPensum}>
            <SelectTrigger id="sec-pensum">
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onAssign} disabled={!idPensum || asignar.isPending} data-testid={`${TID}__btn-asignar-secundaria`}>
            <Icon icon={asignar.isPending ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={16} />
            {asignar.isPending ? 'Asignando…' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
