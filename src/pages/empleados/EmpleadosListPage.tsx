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
  EmptyState,
} from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { TableResultCount, TableSearch } from '@/components/shared/TableToolbar'
import { FieldLabel, FilterCard, FilterRow } from '@/shared/report/report-ui'
import { descargarExcel as exportarExcel } from '@/shared/report/report-excel'
import { stamp } from '@/shared/report/report-utils'
import { notify } from '@/lib/notify'
import { cn, formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
import { useEmpleadosBackendList, useHuellasBiotime } from '@/hooks/useEmpleados'
import { useElementWidth } from '@/hooks/useElementWidth'
import {
  SECCIONES_FICHA,
  faltantesDesdeEmpleado,
  type FaltantesFicha,
  type SeccionFicha,
} from '@/lib/fichaEmpleado'
import { NameCombobox } from '@/components/ui/name-combobox'
import {
  AYUDA_ESTADO_BIO,
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
type FichaFilter = 'TODAS' | 'COMPLETA' | 'INCOMPLETA' | SeccionFicha
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
  const { options: puestoOptions } = usePuestoOptions()
  // Índice por código BioTime. Si BioTime no responde, la tabla sigue funcionando y solo muestra el código.
  const huellasPorCodigo = useMemo(
    () => (huellasQ.data ? new Map(huellasQ.data.map((h) => [h.codigoBio, h])) : undefined),
    [huellasQ.data],
  )
  const bioDe = (e: EmpleadoBackend) => infoBiometrico(e.codigoEmpleadoBio, e.estaActivo, huellasPorCodigo)

  /**
   * Datos obligatorios que le faltan a cada empleado ACTIVO (misma regla que la pantalla de edición).
   * Los dados de baja no se evalúan.
   */
  const fichas = useMemo(() => {
    const m = new Map<number, FaltantesFicha>()
    for (const e of data ?? []) if (e.estaActivo) m.set(e.id, faltantesDesdeEmpleado(e, puestoOptions))
    return m
  }, [data, puestoOptions])
  const fichaCumple = (e: EmpleadoBackend, f: FichaFilter) => {
    if (f === 'TODAS') return true
    const fi = fichas.get(e.id)
    if (!fi) return false // de baja: no aplica
    if (f === 'COMPLETA') return fi.total === 0
    if (f === 'INCOMPLETA') return fi.total > 0
    return fi.porSeccion[f].length > 0
  }
  const empresas = useEmpresas()
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFilter>('TODOS')
  /** Opción del filtro de puesto (agrupada por nombre); null = todos. */
  const [filtroPuesto, setFiltroPuesto] = useState<number | null>(null)
  const [filtroBio, setFiltroBio] = useState<BioFilter>('TODOS')
  /** Ficha: TODAS · COMPLETA · INCOMPLETA · o una sección concreta con datos faltantes. */
  const [filtroFicha, setFiltroFicha] = useState<FichaFilter>('TODAS')
  const [registrarBio, setRegistrarBio] = useState<EmpleadoParaBiometrico | null>(null)
  const [ayudaBio, setAyudaBio] = useState(false)
  const [page, setPage] = useState(1)
  const [exportando, setExportando] = useState(false)

  const empresaNombre = (id: number | null) =>
    empresas.data?.find((x) => x.id === id)?.nombre ?? (id != null ? String(id) : '—')

  const puestoNombre = (id?: number | null) =>
    id == null ? '—' : (puestoOptions.find((p) => p.id === id)?.nombre ?? String(id))

  /**
   * Opciones del filtro de puesto AGRUPADAS POR NOMBRE: en tPuestos hay nombres repetidos en distintos
   * sub-departamentos (p. ej. AUXILIAR DE BODEGA ×3). Filtrar por un solo id dejaba fuera a los demás.
   * Cada opción lleva cuántos empleados tiene (según los demás filtros de estado) y los ids que agrupa.
   */
  const puestosFiltro = useMemo(() => {
    const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
    const conteo = new Map<number, number>()
    for (const e of data ?? []) {
      if (e.idPuesto == null) continue
      if (filtroEstado === 'ACTIVO' && !e.estaActivo) continue
      if (filtroEstado === 'BAJA' && e.estaActivo) continue
      conteo.set(e.idPuesto, (conteo.get(e.idPuesto) ?? 0) + 1)
    }
    const grupos = new Map<string, { nombre: string; ids: Set<number>; n: number }>()
    for (const p of puestoOptions) {
      const k = norm(p.nombre)
      const g = grupos.get(k) ?? { nombre: p.nombre.trim(), ids: new Set<number>(), n: 0 }
      g.ids.add(p.id)
      g.n += conteo.get(p.id) ?? 0
      grupos.set(k, g)
    }
    return [...grupos.values()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((g, i) => ({ id: i + 1, nombre: `${g.nombre} · ${g.n}`, base: g.nombre, ids: g.ids, n: g.n }))
  }, [puestoOptions, data, filtroEstado])
  const puestoElegido = filtroPuesto != null ? puestosFiltro.find((p) => p.id === filtroPuesto) : undefined

  const filtered = useMemo(() => {
    const t = filtroTexto.trim().toLowerCase()
    return (data ?? []).filter((e) => {
      if (filtroEstado === 'ACTIVO' && !e.estaActivo) return false
      if (filtroEstado === 'BAJA' && e.estaActivo) return false
      if (puestoElegido && (e.idPuesto == null || !puestoElegido.ids.has(e.idPuesto))) return false
      if (filtroBio !== 'TODOS' && bioDe(e).estado !== filtroBio) return false
      if (!fichaCumple(e, filtroFicha)) return false
      if (!t) return true
      const full = displayName(e).toLowerCase()
      const dpi = e.numeroIdentificacionNacional ?? ''
      const bio = e.codigoEmpleadoBio != null ? String(e.codigoEmpleadoBio) : ''
      return full.includes(t) || dpi.includes(t) || bio === t
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filtroTexto, filtroEstado, puestoElegido, filtroBio, huellasPorCodigo, filtroFicha, fichas])

  /** Conteo por estado biométrico de los empleados ACTIVOS (para el resumen sobre la tabla). */
  const resumenBio = useMemo(() => {
    const c: Record<EstadoBiometrico, number> = {
      SIN_BIOMETRICO: 0, NO_EN_BIOTIME: 0, FALTA_HUELLA: 0, CON_HUELLA: 0, NO_APLICA: 0, SIN_DATO: 0,
    }
    for (const e of data ?? []) if (e.estaActivo) c[bioDe(e).estado]++
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, huellasPorCodigo])
  /** Resumen de fichas de los activos: completas, incompletas y cuántas tienen huecos en cada sección. */
  const resumenFicha = useMemo(() => {
    const porSeccion = Object.fromEntries(SECCIONES_FICHA.map((x) => [x.id, 0])) as Record<SeccionFicha, number>
    let completas = 0
    let incompletas = 0
    for (const fi of fichas.values()) {
      if (fi.total === 0) completas++
      else incompletas++
      for (const x of SECCIONES_FICHA) if (fi.porSeccion[x.id].length) porSeccion[x.id]++
    }
    return { completas, incompletas, porSeccion }
  }, [fichas])
  function verFicha(f: FichaFilter) {
    const quitar = filtroFicha === f
    setFiltroFicha(quitar ? 'TODAS' : f)
    if (!quitar) setFiltroEstado('ACTIVO')
    setPage(1)
  }

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
  function onChangePuesto(v: number | null) {
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
        ficha: !e.estaActivo ? '' : (fichas.get(e.id)?.total ?? 0) === 0 ? 'Completa' : `Faltan ${fichas.get(e.id)!.total}`,
        faltantes: fichas.get(e.id)?.lista.join(', ') ?? '',
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
      const fichaTxt =
        filtroFicha === 'TODAS' ? '' : filtroFicha === 'COMPLETA' ? '-fichas-completas' : '-fichas-incompletas'
      const bioTxt =
        filtroBio !== 'TODOS' ? `-${ETIQUETA_ESTADO_BIO[filtroBio].toLowerCase().replace(/\s+/g, '-')}` : ''
      const puestoTxt =
        puestoElegido
          ? `-${puestoElegido.base.toLowerCase().replace(/\s+/g, '-')}`
          : ''
      await exportarExcel(`empleados-${estadoTxt}${fichaTxt}${bioTxt}${puestoTxt}-${stamp()}.xlsx`, [
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
            { header: 'Ficha', key: 'ficha', width: 12 },
            { header: 'Datos faltantes', key: 'faltantes', width: 60 },
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

  // Diseño según el espacio real de la tabla.
  const [contenedorRef, ancho] = useElementWidth()
  const modo: 'completa' | 'compacta' | 'tarjetas' =
    ancho === 0 || ancho >= 1320 ? 'completa' : ancho >= 940 ? 'compacta' : 'tarjetas'
  const completa = modo === 'completa'
  const columnas = completa ? 10 : 7
  const celda = 'px-3'

  /** Botones de la fila/tarjeta. `soloIcono` ahorra espacio en los diseños angostos. */
  const acciones = (e: EmpleadoBackend, soloIcono: boolean) => (
    <div className="flex shrink-0 justify-end gap-1">
      {e.estaActivo && e.codigoEmpleadoBio == null && (
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          title="Registrar en el biométrico"
          aria-label={`Registrar a ${displayName(e)} en el biométrico`}
          onClick={(ev) => {
            ev.stopPropagation()
            setRegistrarBio({ id: e.id, nombre: displayName(e), puesto: puestoNombre(e.idPuesto) })
          }}
          data-testid={`${TID}__btn-registrar-bio-${e.id}`}
        >
          <Icon icon="solar:fingerprint-bold" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        title="Ver ficha"
        aria-label={`Ver ficha de ${displayName(e)}`}
        onClick={(ev) => {
          ev.stopPropagation()
          navigate(`/empleados/${e.id}`)
        }}
      >
        <Icon icon="solar:eye-linear" />
        {!soloIcono && 'Ver'}
      </Button>
    </div>
  )

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
          <div className="w-full sm:w-72">
            <FieldLabel>Puesto</FieldLabel>
            <div data-testid={`${TID}__filtro-puesto`}>
              <NameCombobox
                options={puestosFiltro}
                value={filtroPuesto}
                onChange={onChangePuesto}
                allowAll
                allLabel="Todos los puestos"
                placeholder="Todos los puestos"
                searchPlaceholder="Buscar puesto…"
                emptyLabel="Ningún puesto coincide"
                className="[&>button]:rounded-xl"
              />
            </div>
          </div>
          <div className="w-full sm:w-52">
            <FieldLabel>Biométrico</FieldLabel>
            <Select value={filtroBio} onValueChange={onChangeBio}>
              <SelectTrigger className="rounded-xl" data-testid={`${TID}__filtro-biometrico`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="SIN_BIOMETRICO">1 · Sin registrar en BioTime</SelectItem>
                <SelectItem value="FALTA_HUELLA">2 · Falta huella en el reloj</SelectItem>
                <SelectItem value="CON_HUELLA">✓ Con huella</SelectItem>
                <SelectItem value="NO_EN_BIOTIME">⚠ Código no existe en BioTime</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-56">
            <FieldLabel>Ficha</FieldLabel>
            <Select
              value={filtroFicha}
              onValueChange={(v) => {
                setFiltroFicha(v as FichaFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="rounded-xl" data-testid={`${TID}__filtro-ficha`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="INCOMPLETA">⚠ Incompletas (faltan datos)</SelectItem>
                <SelectItem value="COMPLETA">✓ Completas</SelectItem>
                {SECCIONES_FICHA.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    Falta: {x.titulo}
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

      {resumenFicha.incompletas > 0 && (
        <div
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          data-testid={`${TID}__resumen-ficha`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Icon icon="solar:clipboard-list-bold" width={15} className="text-slate-400" />
              Fichas (activos)
            </span>
            <FiltroChip
              tono="ambar"
              icon="solar:danger-circle-bold"
              n={resumenFicha.incompletas}
              titulo="Incompletas"
              ayuda="Les falta al menos un dato obligatorio: no se pueden guardar cambios en su ficha hasta completarlos."
              activa={filtroFicha === 'INCOMPLETA'}
              onClick={() => verFicha('INCOMPLETA')}
            />
            <FiltroChip
              tono="verde"
              icon="solar:check-circle-bold"
              n={resumenFicha.completas}
              titulo="Completas"
              ayuda="Tienen todos los datos obligatorios."
              activa={filtroFicha === 'COMPLETA'}
              onClick={() => verFicha('COMPLETA')}
            />
            <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="text-xs text-slate-500">Falta:</span>
            {SECCIONES_FICHA.map((x) => (
              <FiltroChip
                key={x.id}
                tono="gris"
                icon={x.icono}
                n={resumenFicha.porSeccion[x.id]}
                titulo={x.titulo}
                ayuda={`Empleados activos a los que les falta algún dato de ${x.titulo}.`}
                activa={filtroFicha === x.id}
                onClick={() => verFicha(x.id)}
              />
            ))}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 px-2.5 text-xs"
              title="Descarga la plantilla solo con los empleados de ficha incompleta para completarlos de una vez"
              onClick={() => navigate('/empleados/actualizacion-masiva?solo=incompletas')}
              data-testid={`${TID}__btn-completar-excel`}
            >
              <Icon icon="solar:file-download-linear" width={14} />
              Completar con Excel
            </Button>
          </div>
        </div>
      )}

      {hayPendientesBio && (
        <div
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          data-testid={`${TID}__resumen-biometrico`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Icon icon="solar:fingerprint-bold" width={15} className="text-slate-400" />
              Biométrico (activos)
            </span>
            <PasoBio
              tono="ambar"
              n={resumenBio.SIN_BIOMETRICO}
              paso="1"
              titulo={ETIQUETA_ESTADO_BIO.SIN_BIOMETRICO}
              ayuda={AYUDA_ESTADO_BIO.SIN_BIOMETRICO}
              activa={filtroBio === 'SIN_BIOMETRICO'}
              onClick={() => verEstadoBio('SIN_BIOMETRICO')}
            />
            <Icon icon="solar:alt-arrow-right-linear" width={14} className="hidden text-slate-300 sm:block" />
            <PasoBio
              tono="azul"
              n={resumenBio.FALTA_HUELLA}
              paso="2"
              titulo={ETIQUETA_ESTADO_BIO.FALTA_HUELLA}
              ayuda={AYUDA_ESTADO_BIO.FALTA_HUELLA}
              activa={filtroBio === 'FALTA_HUELLA'}
              onClick={() => verEstadoBio('FALTA_HUELLA')}
            />
            <Icon icon="solar:alt-arrow-right-linear" width={14} className="hidden text-slate-300 sm:block" />
            <PasoBio
              tono="verde"
              n={resumenBio.CON_HUELLA}
              paso="✓"
              titulo={ETIQUETA_ESTADO_BIO.CON_HUELLA}
              ayuda={AYUDA_ESTADO_BIO.CON_HUELLA}
              activa={filtroBio === 'CON_HUELLA'}
              onClick={() => verEstadoBio('CON_HUELLA')}
            />
            {resumenBio.NO_EN_BIOTIME > 0 && (
              <PasoBio
                tono="rojo"
                n={resumenBio.NO_EN_BIOTIME}
                paso="⚠"
                titulo={ETIQUETA_ESTADO_BIO.NO_EN_BIOTIME}
                ayuda={AYUDA_ESTADO_BIO.NO_EN_BIOTIME}
                activa={filtroBio === 'NO_EN_BIOTIME'}
                onClick={() => verEstadoBio('NO_EN_BIOTIME')}
              />
            )}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500"
                onClick={() => setAyudaBio((v) => !v)}
                aria-expanded={ayudaBio}
              >
                <Icon icon="solar:question-circle-linear" width={14} />
                ¿Qué significa?
              </Button>
              {resumenBio.SIN_BIOMETRICO > 0 && (
                <Button
                  size="sm"
                  className="h-7 bg-amber-600 px-2.5 text-xs text-white hover:bg-amber-700"
                  onClick={() => navigate('/empleados/biometrico')}
                  data-testid={`${TID}__btn-pendientes-biometrico`}
                >
                  <Icon icon="solar:fingerprint-bold" width={14} />
                  Registrar pendientes
                </Button>
              )}
            </div>
          </div>

          {ayudaBio && (
            <div className="mt-2.5 grid gap-2 border-t border-dashed border-slate-200 pt-2.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {(['SIN_BIOMETRICO', 'FALTA_HUELLA', 'CON_HUELLA', 'NO_EN_BIOTIME'] as const).map((k) => (
                <div key={k} className="space-y-0.5">
                  <div className="font-semibold text-slate-700">
                    {AYUDA_ESTADO_BIO[k].paso} · {ETIQUETA_ESTADO_BIO[k]}
                  </div>
                  <p className="text-slate-500">{AYUDA_ESTADO_BIO[k].significa}</p>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-600">Quién lo resuelve:</span> {AYUDA_ESTADO_BIO[k].quien}
                  </p>
                </div>
              ))}
            </div>
          )}

          {huellasQ.isError && (
            <p className="mt-1.5 text-xs text-rose-600">
              No se pudo consultar BioTime; los estados de huella no están disponibles por ahora.
            </p>
          )}
        </div>
      )}

      {/* Diseño según el ancho REAL disponible (la barra lateral cambia el espacio, no solo la pantalla):
          ≥ 1320 px tabla completa · ≥ 940 px tabla compacta (DPI/empresa/ingreso bajo otras columnas) · menor: tarjetas. */}
      <div ref={contenedorRef} data-testid={`${TID}__listado`} data-modo={modo}>
        {modo === 'tarjetas' ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon="solar:danger-triangle-bold"
                title="No se pudieron cargar los empleados"
                description="Revisa la conexión e intenta recargar la página."
              />
            ) : pageItems.length === 0 ? (
              <EmptyState
                icon="solar:users-group-rounded-linear"
                title="Ningún empleado coincide con los filtros"
                description="Prueba con otro nombre o DPI, o cambia el estado, el puesto o el biométrico."
              />
            ) : (
              <ul className={cn('grid gap-3 p-3', ancho >= 560 && 'grid-cols-2')}>
                {pageItems.map((e) => (
                  <li key={e.id}>
                    <div
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/empleados/${e.id}`)}
                      onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/empleados/${e.id}`)}
                      className="flex h-full cursor-pointer flex-col gap-2.5 rounded-xl border border-slate-200 p-3.5 transition hover:border-slate-300 hover:bg-slate-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      data-testid={`${TID}__tarjeta-${e.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="break-words font-semibold leading-snug text-slate-900">{displayName(e)}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono">ID RRHH {e.id}</span>
                            {e.numeroIdentificacionNacional && (
                              <span className="font-mono"> · DPI {e.numeroIdentificacionNacional}</span>
                            )}
                          </div>
                        </div>
                        <EmpleadoStatusBadge estado={e.estaActivo ? 'ACTIVO' : 'BAJA'} />
                        <FichaIndicador ficha={fichas.get(e.id)} onCompletar={() => navigate(`/empleados/${e.id}/editar`)} />
                      </div>
                      <div className="text-sm text-slate-600">
                        <div className="break-words">{puestoNombre(e.idPuesto)}</div>
                        <div className="text-xs text-slate-500">{empresaNombre(e.empresaId)}</div>
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-slate-400">Salario base</dt>
                          <dd className="font-medium tabular-nums text-slate-700">
                            {e.salarioBaseContrato != null ? formatQ(e.salarioBaseContrato) : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Ingreso</dt>
                          <dd className="tabular-nums text-slate-700">{formatDate(e.fechaContratacion)}</dd>
                        </div>
                      </dl>
                      <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-2.5">
                        <BiometricoBadge info={bioDe(e)} />
                        {acciones(e, true)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!isLoading && !isError && filtered.length > PAGE_SIZE && (
              <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
            )}
          </div>
        ) : (
          <DataTable
            minWidth="0"
            footer={
              !isLoading && !isError && filtered.length > PAGE_SIZE ? (
                <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
              ) : undefined
            }
          >
            <DataTableHead>
              <DataTableHeadCell className={cn('w-20 whitespace-nowrap', celda)}>
                <span title="Identificador interno del empleado en el sistema de RRHH. NO es el código del reloj.">
                  ID RRHH
                </span>
              </DataTableHeadCell>
              <DataTableHeadCell className={celda}>{completa ? 'Nombre completo' : 'Empleado'}</DataTableHeadCell>
              <DataTableHeadCell className={cn(completa ? 'min-w-[200px]' : 'min-w-[170px]', 'whitespace-nowrap', celda)}>
                <span title="Código con el que el empleado se busca y marca en el reloj biométrico (BioTime).">
                  Biométrico
                </span>
              </DataTableHeadCell>
              {completa && <DataTableHeadCell className={celda}>DPI</DataTableHeadCell>}
              {completa && <DataTableHeadCell className={celda}>Empresa</DataTableHeadCell>}
              <DataTableHeadCell className={celda}>Puesto</DataTableHeadCell>
              <DataTableHeadCell className={cn('whitespace-nowrap text-right', celda)}>Salario base</DataTableHeadCell>
              {completa && <DataTableHeadCell className={celda}>Ingreso</DataTableHeadCell>}
              <DataTableHeadCell className={celda}>Estado</DataTableHeadCell>
              <DataTableHeadCell className={cn('text-right', completa ? 'w-28' : 'w-20', celda)}>
                <span className="sr-only">Acciones</span>
              </DataTableHeadCell>
            </DataTableHead>
            <DataTableBody>
              {isLoading ? (
                <DataTableSkeleton rows={6} cols={columnas} />
              ) : isError ? (
                <DataTableEmpty
                  colSpan={columnas}
                  icon="solar:danger-triangle-bold"
                  title="No se pudieron cargar los empleados"
                  description="Revisa la conexión e intenta recargar la página."
                />
              ) : pageItems.length === 0 ? (
                <DataTableEmpty
                  colSpan={columnas}
                  icon="solar:users-group-rounded-linear"
                  title="Ningún empleado coincide con los filtros"
                  description="Prueba con otro nombre o DPI, o cambia el estado, el puesto o el biométrico."
                />
              ) : (
                pageItems.map((e) => (
                  <DataTableRow key={e.id} onClick={() => navigate(`/empleados/${e.id}`)}>
                    <DataTableCell className={cn('whitespace-nowrap align-top font-mono text-xs text-slate-400', celda)}>
                      {e.id}
                    </DataTableCell>
                    <DataTableCell className={cn('min-w-[180px] align-top', celda)}>
                      <div className="break-words font-medium text-slate-900">{displayName(e)}</div>
                      {!completa && e.numeroIdentificacionNacional && (
                        <div className="mt-0.5 font-mono text-xs text-slate-500">DPI {e.numeroIdentificacionNacional}</div>
                      )}
                    </DataTableCell>
                    <DataTableCell className={cn('align-top', celda)}>
                      <BiometricoBadge info={bioDe(e)} />
                    </DataTableCell>
                    {completa && (
                      <DataTableCell className={cn('whitespace-nowrap align-top font-mono text-xs text-slate-600', celda)}>
                        {e.numeroIdentificacionNacional ?? '—'}
                      </DataTableCell>
                    )}
                    {completa && (
                      <DataTableCell className={cn('min-w-[120px] align-top text-slate-600', celda)}>
                        {empresaNombre(e.empresaId)}
                      </DataTableCell>
                    )}
                    <DataTableCell className={cn(completa ? 'min-w-[150px]' : 'min-w-[130px]', 'align-top text-slate-600', celda)}>
                      <div className="break-words">{puestoNombre(e.idPuesto)}</div>
                      {!completa && <div className="text-xs text-slate-400">{empresaNombre(e.empresaId)}</div>}
                    </DataTableCell>
                    <DataTableCell className={cn('whitespace-nowrap text-right align-top tabular-nums text-slate-700', celda)}>
                      {e.salarioBaseContrato != null ? formatQ(e.salarioBaseContrato) : '—'}
                    </DataTableCell>
                    {completa && (
                      <DataTableCell className={cn('whitespace-nowrap align-top tabular-nums text-slate-600', celda)}>
                        {formatDate(e.fechaContratacion)}
                      </DataTableCell>
                    )}
                    <DataTableCell className={cn('align-top', celda)}>
                      <EmpleadoStatusBadge estado={e.estaActivo ? 'ACTIVO' : 'BAJA'} />
                        <FichaIndicador ficha={fichas.get(e.id)} onCompletar={() => navigate(`/empleados/${e.id}/editar`)} />
                      {!completa && (
                        <div className="mt-1 whitespace-nowrap text-[11px] tabular-nums text-slate-400">
                          Ingreso {formatDate(e.fechaContratacion)}
                        </div>
                      )}
                    </DataTableCell>
                    <DataTableCell className={cn('text-right align-top', celda)}>{acciones(e, !completa)}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        )}
      </div>

      <RegistrarBiometricoDialog empleado={registrarBio} onClose={() => setRegistrarBio(null)} />
    </div>
  )
}

const TONO_PASO = {
  ambar: { base: 'border-amber-200 bg-amber-50 text-amber-900', activa: 'ring-2 ring-amber-400', num: 'bg-amber-500' },
  azul: { base: 'border-sky-200 bg-sky-50 text-sky-900', activa: 'ring-2 ring-sky-400', num: 'bg-sky-500' },
  verde: { base: 'border-emerald-200 bg-emerald-50 text-emerald-900', activa: 'ring-2 ring-emerald-400', num: 'bg-emerald-500' },
  rojo: { base: 'border-rose-200 bg-rose-50 text-rose-900', activa: 'ring-2 ring-rose-400', num: 'bg-rose-500' },
}

/** Botón compacto del resumen biométrico: [paso] etiqueta · cantidad. Clic = filtrar la tabla. */
function PasoBio({
  tono,
  n,
  paso,
  titulo,
  ayuda,
  activa,
  onClick,
}: {
  tono: keyof typeof TONO_PASO
  n: number
  paso: string
  titulo: string
  ayuda: { significa: string; quien: string }
  activa: boolean
  onClick: () => void
}) {
  const t = TONO_PASO[tono]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      title={`${ayuda.significa}\nQuién lo resuelve: ${ayuda.quien}\n(Clic para filtrar la tabla)`}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border pl-1 pr-2.5 text-xs font-medium transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        t.base,
        activa && t.activa,
        n === 0 && 'opacity-50',
      )}
    >
      <span className={cn('flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold text-white', t.num)}>
        {paso}
      </span>
      {titulo}
      <span className="font-bold tabular-nums">{n}</span>
    </button>
  )
}

const TONO_FILTRO = {
  ambar: { base: 'border-amber-200 bg-amber-50 text-amber-900', activa: 'ring-2 ring-amber-400' },
  verde: { base: 'border-emerald-200 bg-emerald-50 text-emerald-900', activa: 'ring-2 ring-emerald-400' },
  gris: { base: 'border-slate-200 bg-slate-50 text-slate-700', activa: 'ring-2 ring-slate-400' },
}

/** Botón compacto de resumen: ícono · etiqueta · cantidad. Clic = filtrar la tabla (otro clic lo quita). */
function FiltroChip({
  tono,
  icon,
  n,
  titulo,
  ayuda,
  activa,
  onClick,
}: {
  tono: keyof typeof TONO_FILTRO
  icon: string
  n: number
  titulo: string
  ayuda: string
  activa: boolean
  onClick: () => void
}) {
  const t = TONO_FILTRO[tono]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      title={`${ayuda}\n(Clic para filtrar la tabla)`}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        t.base,
        activa && t.activa,
        n === 0 && 'opacity-50',
      )}
    >
      <Icon icon={icon} width={13} className="shrink-0" />
      {titulo}
      <span className="font-bold tabular-nums">{n}</span>
    </button>
  )
}

/** "Faltan N datos" bajo el estado del empleado; clic = ir a completar la ficha. */
function FichaIndicador({ ficha, onCompletar }: { ficha: FaltantesFicha | undefined; onCompletar: () => void }) {
  if (!ficha || ficha.total === 0) return null
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation()
        onCompletar()
      }}
      title={`Ficha incompleta. Falta: ${ficha.lista.join(', ')}.\nClic para completarla.`}
      className="mt-1 flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
      data-testid="rh-empleados__ficha-incompleta"
    >
      <Icon icon="solar:clipboard-remove-bold" width={12} />
      Faltan {ficha.total} dato{ficha.total === 1 ? '' : 's'}
    </button>
  )
}
