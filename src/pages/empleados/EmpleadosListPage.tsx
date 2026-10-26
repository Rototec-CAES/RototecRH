import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
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
import { Pagination } from '@/components/shared/Pagination'
import { TableResultCount, TableSearch } from '@/components/shared/TableToolbar'
import { FieldLabel, FilterCard, FilterRow } from '@/shared/report/report-ui'
import { descargarExcel as exportarExcel } from '@/shared/report/report-excel'
import { stamp } from '@/shared/report/report-utils'
import { notify } from '@/lib/notify'
import { formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useEmpresas } from '@/hooks/useCompanyCatalogos'
import { usePuestoOptions } from '@/hooks/usePuestoOptions'
import { EmpleadoStatusBadge } from './EmpleadoStatusBadge'
import type { EmpleadoBackend } from '@/types'

type EstadoFilter = 'TODOS' | 'ACTIVO' | 'BAJA'
const PAGE_SIZE = 20
const TID = 'rh-empleados'

/** Limpia una parte de nombre: null/undefined/'' y los literales 'null'/'undefined' → ''. */
const limpioNombre = (v: string | null | undefined): string => {
  const s = (v ?? '').trim()
  return /^(null|undefined)$/i.test(s) ? '' : s
}

/** Nombre para mostrar: tEmpleados.nombre + tEmpleados.apellido (las partes solo si ambos vienen vacíos). */
function displayName(e: EmpleadoBackend): string {
  const nombreApellido = [limpioNombre(e.nombre), limpioNombre(e.apellido)].filter(Boolean).join(' ')
  if (nombreApellido) return nombreApellido
  return nombreParaMostrar({
    primerNombre: limpioNombre(e.primerNombre) || limpioNombre(e.nombre),
    segundoNombre: limpioNombre(e.segundoNombre) || undefined,
    tercerNombre: limpioNombre(e.tercerNombre) || undefined,
    primerApellido: limpioNombre(e.primerApellido) || limpioNombre(e.apellido),
    segundoApellido: limpioNombre(e.segundoApellido) || undefined,
    apellidoCasada: limpioNombre(e.apellidoCasada) || undefined,
  })
}

export default function EmpleadosListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useEmpleadosBackendList()
  const empresas = useEmpresas()
  const { options: puestoOptions } = usePuestoOptions()
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFilter>('TODOS')
  const [filtroPuesto, setFiltroPuesto] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [exportando, setExportando] = useState(false)

  const empresaNombre = (id: number | null) =>
    empresas.data?.find((x) => x.id === id)?.nombre ?? (id != null ? String(id) : '—')

  const puestoNombre = (id?: number | null) =>
    id == null ? '—' : (puestoOptions.find((p) => p.id === id)?.nombre ?? String(id))

  const filtered = useMemo(() => {
    const t = filtroTexto.trim().toLowerCase()
    return (data ?? []).filter((e) => {
      if (filtroEstado === 'ACTIVO' && !e.estaActivo) return false
      if (filtroEstado === 'BAJA' && e.estaActivo) return false
      if (filtroPuesto !== 'TODOS' && String(e.idPuesto ?? '') !== filtroPuesto) return false
      if (!t) return true
      const full = displayName(e).toLowerCase()
      const dpi = e.numeroIdentificacionNacional ?? ''
      return full.includes(t) || dpi.includes(t)
    })
  }, [data, filtroTexto, filtroEstado, filtroPuesto])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function onChangeFiltro(v: string) {
    setFiltroTexto(v)
    setPage(1)
  }
  function onChangeEstado(v: string) {
    setFiltroEstado(v as EstadoFilter)
    setPage(1)
  }
  function onChangePuesto(v: string) {
    setFiltroPuesto(v)
    setPage(1)
  }

  async function descargarExcel() {
    setExportando(true)
    try {
      const filas = filtered.map((e) => ({
        id: e.id,
        nombre: displayName(e),
        dpi: e.numeroIdentificacionNacional ?? '',
        empresa: empresaNombre(e.empresaId),
        puesto: puestoNombre(e.idPuesto),
        salario: e.salarioBaseContrato ?? '',
        contratacion: formatDate(e.fechaContratacion),
        estado: e.estaActivo ? 'Activo' : 'Baja',
      }))
      const estadoTxt =
        filtroEstado === 'ACTIVO' ? 'activos' : filtroEstado === 'BAJA' ? 'bajas' : 'todos'
      const puestoTxt =
        filtroPuesto !== 'TODOS'
          ? `-${puestoNombre(Number(filtroPuesto)).toLowerCase().replace(/\s+/g, '-')}`
          : ''
      await exportarExcel(`empleados-${estadoTxt}${puestoTxt}-${stamp()}.xlsx`, [
        {
          nombre: 'Empleados',
          columnas: [
            { header: 'ID', key: 'id', width: 8 },
            { header: 'Nombre completo', key: 'nombre', width: 40 },
            { header: 'DPI', key: 'dpi', width: 18 },
            { header: 'Empresa', key: 'empresa', width: 28 },
            { header: 'Puesto', key: 'puesto', width: 28 },
            { header: 'Salario base', key: 'salario', width: 16 },
            { header: 'Fecha de ingreso', key: 'contratacion', width: 18 },
            { header: 'Estado', key: 'estado', width: 10 },
          ],
          filas,
          ajustar: (ws) => {
            ws.getColumn('salario').numFmt = '"Q" #,##0.00'
          },
        },
      ])
    } catch (err) {
      notify('error', 'No se pudo generar el Excel', err instanceof Error ? err.message : undefined)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-5">
      <FilterCard>
        <PageHeader
          titulo="Empleados"
          icono="solar:users-group-rounded-bold"
          descripcion="Listado del personal. Haz clic en una fila para ver la ficha completa del empleado."
        >
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={descargarExcel}
            disabled={isLoading || exportando || filtered.length === 0}
            data-testid={`${TID}__btn-excel`}
          >
            <Icon icon={exportando ? 'svg-spinners:180-ring' : 'solar:file-download-linear'} />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/empleados/actualizacion-masiva')}
            data-testid={`${TID}__btn-masiva`}
          >
            <Icon icon="solar:document-add-linear" />
            Actualización masiva
          </Button>
          <Button onClick={() => navigate('/empleados/nuevo')} data-testid={`${TID}__btn-nuevo`}>
            <Icon icon="solar:user-plus-bold" />
            Nuevo empleado
          </Button>
        </PageHeader>

        <FilterRow>
          <div className="w-full sm:w-80">
            <FieldLabel>Buscar</FieldLabel>
            <TableSearch
              value={filtroTexto}
              onChange={onChangeFiltro}
              placeholder="Nombre o DPI"
              testId={`${TID}__filtro-busqueda`}
            />
          </div>
          <div className="w-full sm:w-48">
            <FieldLabel>Estado</FieldLabel>
            <Select value={filtroEstado} onValueChange={onChangeEstado}>
              <SelectTrigger className="rounded-xl" data-testid={`${TID}__filtro-estado`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="ACTIVO">Activos</SelectItem>
                <SelectItem value="BAJA">Bajas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-64">
            <FieldLabel>Puesto</FieldLabel>
            <Select value={filtroPuesto} onValueChange={onChangePuesto}>
              <SelectTrigger className="rounded-xl" data-testid={`${TID}__filtro-puesto`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los puestos</SelectItem>
                {puestoOptions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto self-center">
            <TableResultCount
              total={data?.length ?? 0}
              filtered={filtered.length}
              label="empleado"
            />
          </div>
        </FilterRow>
      </FilterCard>

      <DataTable
        minWidth="960px"
        footer={
          !isLoading && !isError && filtered.length > PAGE_SIZE ? (
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          ) : undefined
        }
      >
        <DataTableHead>
          <DataTableHeadCell className="w-16">ID</DataTableHeadCell>
          <DataTableHeadCell>Nombre completo</DataTableHeadCell>
          <DataTableHeadCell>DPI</DataTableHeadCell>
          <DataTableHeadCell>Empresa</DataTableHeadCell>
          <DataTableHeadCell>Puesto</DataTableHeadCell>
          <DataTableHeadCell className="text-right">Salario base</DataTableHeadCell>
          <DataTableHeadCell>Ingreso</DataTableHeadCell>
          <DataTableHeadCell>Estado</DataTableHeadCell>
          <DataTableHeadCell className="w-20 text-right">
            <span className="sr-only">Acciones</span>
          </DataTableHeadCell>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            <DataTableSkeleton rows={6} cols={9} />
          ) : isError ? (
            <DataTableEmpty
              colSpan={9}
              icon="solar:danger-triangle-bold"
              title="No se pudieron cargar los empleados"
              description="Revisa la conexión e intenta recargar la página."
            />
          ) : pageItems.length === 0 ? (
            <DataTableEmpty
              colSpan={9}
              icon="solar:users-group-rounded-linear"
              title="Ningún empleado coincide con los filtros"
              description="Prueba con otro nombre o DPI, o cambia el estado o el puesto."
            />
          ) : (
            pageItems.map((e) => (
              <DataTableRow key={e.id} onClick={() => navigate(`/empleados/${e.id}`)}>
                <DataTableCell className="font-mono text-xs text-slate-400">{e.id}</DataTableCell>
                <DataTableCell className="font-medium text-slate-900">{displayName(e)}</DataTableCell>
                <DataTableCell className="font-mono text-xs text-slate-600">
                  {e.numeroIdentificacionNacional ?? '—'}
                </DataTableCell>
                <DataTableCell className="text-slate-600">{empresaNombre(e.empresaId)}</DataTableCell>
                <DataTableCell className="text-slate-600">{puestoNombre(e.idPuesto)}</DataTableCell>
                <DataTableCell className="text-right tabular-nums text-slate-700">
                  {e.salarioBaseContrato != null ? formatQ(e.salarioBaseContrato) : '—'}
                </DataTableCell>
                <DataTableCell className="tabular-nums text-slate-600">
                  {formatDate(e.fechaContratacion)}
                </DataTableCell>
                <DataTableCell>
                  <EmpleadoStatusBadge estado={e.estaActivo ? 'ACTIVO' : 'BAJA'} />
                </DataTableCell>
                <DataTableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      navigate(`/empleados/${e.id}`)
                    }}
                  >
                    <Icon icon="solar:eye-linear" />
                    Ver
                  </Button>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
