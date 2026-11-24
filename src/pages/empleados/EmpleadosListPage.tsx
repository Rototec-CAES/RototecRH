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
import { cn, formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
import { useEmpleadosBackendList, useHuellasBiotime } from '@/hooks/useEmpleados'
import {
  ETIQUETA_ESTADO_BIO,
  formatFechaHuella,
  infoBiometrico,
  type EstadoBiometrico,
} from '@/lib/biometrico'
import { useEmpresas } from '@/hooks/useCompanyCatalogos'
import { usePuestoOptions } from '@/hooks/usePuestoOptions'
import { EmpleadoStatusBadge } from './EmpleadoStatusBadge'
import { BiometricoBadge } from './BiometricoBadge'
import { RegistrarBiometricoDialog, type EmpleadoParaBiometrico } from './RegistrarBiometricoDialog'
import type { EmpleadoBackend } from '@/types'

type EstadoFilter = 'TODOS' | 'ACTIVO' | 'BAJA'
type BioFilter = 'TODOS' | EstadoBiometrico
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
  const huellasQ = useHuellasBiotime()
  // Índice por código BioTime. Si BioTime no responde, la tabla sigue funcionando y solo muestra el código.
  const huellasPorCodigo = useMemo(
    () => (huellasQ.data ? new Map(huellasQ.data.map((h) => [h.codigoBio, h])) : undefined),
    [huellasQ.data],
  )
  const bioDe = (e: EmpleadoBackend) => infoBiometrico(e.codigoEmpleadoBio, e.estaActivo, huellasPorCodigo)
  const empresas = useEmpresas()
  const { options: puestoOptions } = usePuestoOptions()
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFilter>('TODOS')
  const [filtroPuesto, setFiltroPuesto] = useState('TODOS')
  const [filtroBio, setFiltroBio] = useState<BioFilter>('TODOS')
  const [registrarBio, setRegistrarBio] = useState<EmpleadoParaBiometrico | null>(null)
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
      if (filtroBio !== 'TODOS' && bioDe(e).estado !== filtroBio) return false
      if (!t) return true
      const full = displayName(e).toLowerCase()
      const dpi = e.numeroIdentificacionNacional ?? ''
      const bio = e.codigoEmpleadoBio != null ? String(e.codigoEmpleadoBio) : ''
      return full.includes(t) || dpi.includes(t) || bio === t
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filtroTexto, filtroEstado, filtroPuesto, filtroBio, huellasPorCodigo])

  /** Conteo por estado biométrico de los empleados ACTIVOS (para el resumen sobre la tabla). */
  const resumenBio = useMemo(() => {
    const c: Record<EstadoBiometrico, number> = {
      SIN_BIOMETRICO: 0, NO_EN_BIOTIME: 0, FALTA_HUELLA: 0, CON_HUELLA: 0, NO_APLICA: 0, SIN_DATO: 0,
    }
    for (const e of data ?? []) if (e.estaActivo) c[bioDe(e).estado]++
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, huellasPorCodigo])
  const hayPendientesBio = resumenBio.SIN_BIOMETRICO + resumenBio.NO_EN_BIOTIME + resumenBio.FALTA_HUELLA > 0

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
  function onChangeBio(v: string) {
    setFiltroBio(v as BioFilter)
    setPage(1)
  }
  function verEstadoBio(estado: EstadoBiometrico) {
    const quitar = filtroBio === estado
    setFiltroBio(quitar ? 'TODOS' : estado)
    if (!quitar) setFiltroEstado('ACTIVO')
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
        ...(() => {
          const b = bioDe(e)
          return {
            biotime: b.codigo ?? '',
            estadoBio: ETIQUETA_ESTADO_BIO[b.estado],
            huellas: b.huella ? b.huella.huellas : '',
            fechaHuella: b.huella?.fechaHuella ? formatFechaHuella(b.huella.fechaHuella) : '',
            reloj: b.huella?.reloj ?? '',
          }
        })(),
      }))
      const estadoTxt =
        filtroEstado === 'ACTIVO' ? 'activos' : filtroEstado === 'BAJA' ? 'bajas' : 'todos'
      const bioTxt =
        filtroBio !== 'TODOS' ? `-${ETIQUETA_ESTADO_BIO[filtroBio].toLowerCase().replace(/\s+/g, '-')}` : ''
      const puestoTxt =
        filtroPuesto !== 'TODOS'
          ? `-${puestoNombre(Number(filtroPuesto)).toLowerCase().replace(/\s+/g, '-')}`
          : ''
      await exportarExcel(`empleados-${estadoTxt}${bioTxt}${puestoTxt}-${stamp()}.xlsx`, [
        {
          nombre: 'Empleados',
          columnas: [
            { header: 'ID RRHH', key: 'id', width: 10 },
            { header: 'Nombre completo', key: 'nombre', width: 40 },
            { header: 'DPI', key: 'dpi', width: 18 },
            { header: 'Empresa', key: 'empresa', width: 28 },
            { header: 'Puesto', key: 'puesto', width: 28 },
            { header: 'Salario base', key: 'salario', width: 16 },
            { header: 'Fecha de ingreso', key: 'contratacion', width: 18 },
            { header: 'Estado', key: 'estado', width: 10 },
            { header: 'Código BioTime', key: 'biotime', width: 16 },
            { header: 'Estado biométrico', key: 'estadoBio', width: 20 },
            { header: 'Huellas', key: 'huellas', width: 9 },
            { header: 'Fecha registro huella', key: 'fechaHuella', width: 20 },
            { header: 'Reloj', key: 'reloj', width: 22 },
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
              placeholder="Nombre, DPI o código BioTime"
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
          <div className="w-full sm:w-52">
            <FieldLabel>Biométrico</FieldLabel>
            <Select value={filtroBio} onValueChange={onChangeBio}>
              <SelectTrigger className="rounded-xl" data-testid={`${TID}__filtro-biometrico`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="CON_HUELLA">Con huella</SelectItem>
                <SelectItem value="FALTA_HUELLA">Falta huella</SelectItem>
                <SelectItem value="SIN_BIOMETRICO">Sin biométrico</SelectItem>
                <SelectItem value="NO_EN_BIOTIME">No existe en BioTime</SelectItem>
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

      {hayPendientesBio && (
        <div
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          data-testid={`${TID}__resumen-biometrico`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon icon="solar:fingerprint-bold" width={18} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-800">Control biométrico · empleados activos</h2>
            </div>
            <span className="text-xs text-slate-500">Haga clic en un recuadro para filtrar la tabla</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaBio
              tono="ambar"
              icon="solar:user-cross-bold"
              n={resumenBio.SIN_BIOMETRICO}
              titulo="Sin biométrico"
              detalle="No están en BioTime. Registrarlos primero."
              activa={filtroBio === 'SIN_BIOMETRICO'}
              onClick={() => verEstadoBio('SIN_BIOMETRICO')}
              accion={
                resumenBio.SIN_BIOMETRICO > 0 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-amber-800 underline-offset-2 hover:underline"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      navigate('/empleados/biometrico')
                    }}
                    data-testid={`${TID}__btn-pendientes-biometrico`}
                  >
                    Registrar pendientes →
                  </button>
                )
              }
            />
            <TarjetaBio
              tono="rojo"
              icon="solar:danger-triangle-bold"
              n={resumenBio.NO_EN_BIOTIME}
              titulo="No existe en BioTime"
              detalle="Tienen código en RRHH, pero BioTime no lo tiene. Revisar con TI."
              activa={filtroBio === 'NO_EN_BIOTIME'}
              onClick={() => verEstadoBio('NO_EN_BIOTIME')}
            />
            <TarjetaBio
              tono="azul"
              icon="solar:clock-circle-bold"
              n={resumenBio.FALTA_HUELLA}
              titulo="Falta huella"
              detalle="Están en BioTime; falta enrolar la huella en el reloj."
              activa={filtroBio === 'FALTA_HUELLA'}
              onClick={() => verEstadoBio('FALTA_HUELLA')}
            />
            <TarjetaBio
              tono="verde"
              icon="solar:check-circle-bold"
              n={resumenBio.CON_HUELLA}
              titulo="Con huella"
              detalle="Listos para marcar."
              activa={filtroBio === 'CON_HUELLA'}
              onClick={() => verEstadoBio('CON_HUELLA')}
            />
          </div>
          {huellasQ.isError && (
            <p className="mt-2 text-xs text-rose-600">
              No se pudo consultar BioTime; los estados de huella no están disponibles por ahora.
            </p>
          )}
        </div>
      )}

      <DataTable
        minWidth="1060px"
        footer={
          !isLoading && !isError && filtered.length > PAGE_SIZE ? (
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          ) : undefined
        }
      >
        <DataTableHead>
          <DataTableHeadCell className="w-20">
            <span title="Identificador interno del empleado en el sistema de RRHH. NO es el código del reloj.">
              ID RRHH
            </span>
          </DataTableHeadCell>
          <DataTableHeadCell>Nombre completo</DataTableHeadCell>
          <DataTableHeadCell className="w-44">
            <span title="Código con el que el empleado se busca y marca en el reloj biométrico (BioTime).">
              Biométrico
            </span>
          </DataTableHeadCell>
          <DataTableHeadCell>DPI</DataTableHeadCell>
          <DataTableHeadCell>Empresa</DataTableHeadCell>
          <DataTableHeadCell>Puesto</DataTableHeadCell>
          <DataTableHeadCell className="text-right">Salario base</DataTableHeadCell>
          <DataTableHeadCell>Ingreso</DataTableHeadCell>
          <DataTableHeadCell>Estado</DataTableHeadCell>
          <DataTableHeadCell className="w-28 text-right">
            <span className="sr-only">Acciones</span>
          </DataTableHeadCell>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            <DataTableSkeleton rows={6} cols={10} />
          ) : isError ? (
            <DataTableEmpty
              colSpan={10}
              icon="solar:danger-triangle-bold"
              title="No se pudieron cargar los empleados"
              description="Revisa la conexión e intenta recargar la página."
            />
          ) : pageItems.length === 0 ? (
            <DataTableEmpty
              colSpan={10}
              icon="solar:users-group-rounded-linear"
              title="Ningún empleado coincide con los filtros"
              description="Prueba con otro nombre o DPI, o cambia el estado, el puesto o el biométrico."
            />
          ) : (
            pageItems.map((e) => (
              <DataTableRow key={e.id} onClick={() => navigate(`/empleados/${e.id}`)}>
                <DataTableCell className="font-mono text-xs text-slate-400">{e.id}</DataTableCell>
                <DataTableCell className="font-medium text-slate-900">{displayName(e)}</DataTableCell>
                <DataTableCell>
                  <BiometricoBadge info={bioDe(e)} />
                </DataTableCell>
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
                  <div className="flex justify-end gap-1">
                    {e.estaActivo && e.codigoEmpleadoBio == null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                        title="Registrar en el biométrico"
                        aria-label={`Registrar a ${displayName(e)} en el biométrico`}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setRegistrarBio({ id: e.id, nombre: displayName(e) })
                        }}
                        data-testid={`${TID}__btn-registrar-bio-${e.id}`}
                      >
                        <Icon icon="solar:fingerprint-bold" />
                      </Button>
                    )}
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
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      <RegistrarBiometricoDialog empleado={registrarBio} onClose={() => setRegistrarBio(null)} />
    </div>
  )
}

const TONO_TARJETA = {
  ambar: { caja: 'border-amber-200 bg-amber-50/60', activa: 'ring-2 ring-amber-400', num: 'text-amber-700', icon: 'text-amber-600' },
  rojo: { caja: 'border-rose-200 bg-rose-50/60', activa: 'ring-2 ring-rose-400', num: 'text-rose-700', icon: 'text-rose-600' },
  azul: { caja: 'border-sky-200 bg-sky-50/60', activa: 'ring-2 ring-sky-400', num: 'text-sky-700', icon: 'text-sky-600' },
  verde: { caja: 'border-emerald-200 bg-emerald-50/60', activa: 'ring-2 ring-emerald-400', num: 'text-emerald-700', icon: 'text-emerald-600' },
}

function TarjetaBio({
  tono,
  icon,
  n,
  titulo,
  detalle,
  activa,
  onClick,
  accion,
}: {
  tono: keyof typeof TONO_TARJETA
  icon: string
  n: number
  titulo: string
  detalle: string
  activa: boolean
  onClick: () => void
  accion?: React.ReactNode
}) {
  const t = TONO_TARJETA[tono]
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={activa}
      onClick={onClick}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'cursor-pointer rounded-xl border p-3 text-left transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        t.caja,
        activa && t.activa,
        n === 0 && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-slate-700">{titulo}</div>
        <Icon icon={icon} width={16} className={t.icon} />
      </div>
      <div className={cn('mt-1 text-2xl font-bold tabular-nums', t.num)}>{n}</div>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{detalle}</p>
      {accion && <div className="mt-1.5">{accion}</div>}
    </div>
  )
}
