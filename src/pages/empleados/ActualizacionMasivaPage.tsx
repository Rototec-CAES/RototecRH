import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@iconify/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard, Segmented, type Accent } from '@/shared/report/report-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Stepper } from '@/components/ui/stepper'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { extractApiErrorMessage } from '@/api/client'
import {
  useAplicarActualizacionMasiva,
  usePlantillaActualizacionMasiva,
  useValidarActualizacionMasiva,
} from '@/hooks/useEmpleados'
import {
  descargarPlantillaActualizacionMasiva,
  leerArchivoActualizacionMasiva,
} from '@/lib/actualizacionMasivaExcel'
import { detectarReferenciasNuevas, type ReferenciasNuevas } from '@/lib/catalogosMasiva'
import { CatalogosNuevosMasiva } from './CatalogosNuevosMasiva'
import { SinBiometricoMasiva } from './SinBiometricoMasiva'
import { Checkbox } from '@/components/ui/checkbox'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { usePuestoOptions } from '@/hooks/usePuestoOptions'
import { faltantesDesdeEmpleado } from '@/lib/fichaEmpleado'
import { cn, formatDate, formatQ } from '@/lib/utils'
import type {
  CambioActualizacionMasiva,
  FilaActualizacionMasiva,
  ResultadoAplicarMasiva,
  ResultadoValidacionMasiva,
} from '@/types'

const PASOS = [
  { id: 'plantilla', title: 'Descargar plantilla' },
  { id: 'validar', title: 'Cargar y validar' },
  { id: 'resultado', title: 'Resultado' },
]

type Filtro = 'TODOS' | 'CAMBIOS' | 'ERRORES'

const CAMPOS_MONEDA = new Set(['salario_base_contrato', 'bonificacion_decreto_base_contrato'])

function mostrarValor(c: CambioActualizacionMasiva, v: CambioActualizacionMasiva['nuevo']): string {
  const texto = v === c.nuevo ? c.nuevoTexto : v === c.anterior ? c.anteriorTexto : undefined
  if (texto) return texto
  if (v === null || v === '') return '(vacío)'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'number' && CAMPOS_MONEDA.has(c.campo)) return formatQ(v)
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDate(v)
  return String(v)
}

function Resumen({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono?: 'ok' | 'error' | 'muted' }) {
  const accent: Accent = tono === 'ok' ? 'emerald' : tono === 'error' && valor > 0 ? 'rose' : 'slate'
  return (
    <KpiCard
      label={etiqueta}
      value={
        <span className={cn(tono === 'error' && valor > 0 && 'text-rose-700', tono === 'muted' && 'text-slate-400')}>
          {valor}
        </span>
      }
      accent={accent}
    />
  )
}

export default function ActualizacionMasivaPage() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const plantilla = usePlantillaActualizacionMasiva()
  const validarMut = useValidarActualizacionMasiva()
  const aplicarMut = useAplicarActualizacionMasiva()

  const [descargando, setDescargando] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [archivo, setArchivo] = useState<string | null>(null)
  /** Columnas del Excel que no corresponden a ningún campo editable (se ignoran; se avisa). */
  const [ignoradas, setIgnoradas] = useState<{ nombre: string; conDatos: number }[]>([])
  const [filas, setFilas] = useState<FilaActualizacionMasiva[] | null>(null)
  const [validacion, setValidacion] = useState<ResultadoValidacionMasiva | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState<ResultadoAplicarMasiva | null>(null)
  /** Puestos/departamentos del Excel que no existen: se resuelven antes de validar. */
  const [refsNuevas, setRefsNuevas] = useState<ReferenciasNuevas | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const resumen = validacion?.resumen
  const porAplicar = (resumen?.conCambios ?? 0) + (resumen?.nuevos ?? 0)
  const puedeAplicar = Boolean(resumen && porAplicar > 0 && resumen.conErrores === 0)

  // Solo se listan filas con cambios o con errores; las sin cambios solo se cuentan.
  const filasVisibles = useMemo(() => {
    const todas = (validacion?.filas ?? []).filter((f) => f.errores.length > 0 || f.cambios.length > 0)
    const filtradas =
      filtro === 'ERRORES'
        ? todas.filter((f) => f.errores.length > 0)
        : filtro === 'CAMBIOS'
          ? todas.filter((f) => f.errores.length === 0)
          : todas
    // Errores primero para que se vean de inmediato.
    return [...filtradas].sort((a, b) => Number(b.errores.length > 0) - Number(a.errores.length > 0))
  }, [validacion, filtro])

  // "Completar con Excel" desde Empleados llega con ?solo=incompletas: plantilla solo con fichas incompletas
  // (misma regla que el filtro "Ficha incompleta" del listado y que la pantalla de edición).
  const [searchParams] = useSearchParams()
  const [soloIncompletas, setSoloIncompletas] = useState(searchParams.get('solo') === 'incompletas')
  const empleadosQ = useEmpleadosBackendList()
  const { options: puestosUbic } = usePuestoOptions()
  const idsIncompletos = useMemo(
    () =>
      new Set(
        (empleadosQ.data ?? [])
          .filter((e) => e.estaActivo && faltantesDesdeEmpleado(e, puestosUbic).total > 0)
          .map((e) => e.id),
      ),
    [empleadosQ.data, puestosUbic],
  )

  async function descargar() {
    setDescargando(true)
    try {
      // Siempre con datos frescos (otro usuario pudo editar a alguien).
      const { data } = await plantilla.refetch()
      if (!data) throw new Error('No se pudo obtener la plantilla')
      const filas = soloIncompletas ? data.filas.filter((f) => idsIncompletos.has(Number(f.id))) : data.filas
      if (!filas.length) throw new Error('No hay empleados con ficha incompleta para descargar')
      await descargarPlantillaActualizacionMasiva({ ...data, filas })
      toast.success(
        `Plantilla descargada con ${filas.length} empleado${filas.length === 1 ? '' : 's'}${soloIncompletas ? ' con ficha incompleta' : ' activos'}`,
      )
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    } finally {
      setDescargando(false)
    }
  }

  function limpiar() {
    setArchivo(null)
    setIgnoradas([])
    setFilas(null)
    setValidacion(null)
    setRefsNuevas(null)
    setFiltro('TODOS')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onArchivo(file: File) {
    if (!plantilla.data) {
      toast.error('Aún no se cargan las columnas de la plantilla; intente de nuevo.')
      return
    }
    limpiar()
    setArchivo(file.name)
    setLeyendo(true)
    try {
      const { filas: leidas, columnasIgnoradas } = await leerArchivoActualizacionMasiva(file, plantilla.data.campos)
      setIgnoradas(columnasIgnoradas)
      const conDatos = columnasIgnoradas.filter((c) => c.conDatos > 0)
      if (conDatos.length)
        toast.warning(
          `${conDatos.length} columna${conDatos.length === 1 ? '' : 's'} del Excel no se cargará${conDatos.length === 1 ? '' : 'n'}: ${conDatos.map((c) => c.nombre).join(', ')}`,
        )
      setFilas(leidas)
      const nuevas = detectarReferenciasNuevas(leidas, plantilla.data.campos)
      if (nuevas.departamentos.length || nuevas.puestos.length) {
        // Primero se crean/asocian los puestos y departamentos; después se valida.
        setRefsNuevas(nuevas)
        return
      }
      setValidacion(await validarMut.mutateAsync(leidas))
    } catch (err) {
      setArchivo(null)
      toast.error(extractApiErrorMessage(err))
    } finally {
      setLeyendo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  /** Catálogos listos: las filas ya traen los IDs de los puestos/departamentos creados o asociados. */
  async function onCatalogosResueltos(resueltas: FilaActualizacionMasiva[]) {
    setRefsNuevas(null)
    setFilas(resueltas)
    setLeyendo(true)
    try {
      await plantilla.refetch() // catálogo con los nuevos (para el detalle "ID - Nombre" y otra carga)
      setValidacion(await validarMut.mutateAsync(resueltas))
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    } finally {
      setLeyendo(false)
    }
  }

  async function aplicar() {
    if (!filas) return
    try {
      const r = await aplicarMut.mutateAsync(filas)
      setResultado(r)
      setConfirmar(false)
      setPaso(2)
      toast.success(
        [
          r.actualizados ? `${r.actualizados} empleado${r.actualizados === 1 ? '' : 's'} actualizado${r.actualizados === 1 ? '' : 's'}` : '',
          r.creados ? `${r.creados} empleado${r.creados === 1 ? '' : 's'} nuevo${r.creados === 1 ? '' : 's'}` : '',
        ].filter(Boolean).join(' y '),
      )
    } catch (err) {
      setConfirmar(false)
      toast.error(extractApiErrorMessage(err))
    }
  }

  function nuevaActualizacion() {
    limpiar()
    setResultado(null)
    setPaso(0)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <PageHeader
          titulo="Actualización masiva"
          icono="solar:document-add-bold"
          descripcion="Completa datos personales, culturales, de nómina, contrato, banco, IGSS y contacto de muchos empleados a la vez con un Excel."
        >
          <Button variant="outline" onClick={() => navigate('/empleados')}>
            <Icon icon="solar:alt-arrow-left-linear" />
            Volver a empleados
          </Button>
        </PageHeader>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <Card className="h-fit p-3 md:sticky md:top-0">
          <Stepper
            steps={PASOS}
            current={paso}
            // El resultado no se puede "reabrir": una vez aplicado se empieza de nuevo.
            onStepClick={paso === 2 ? undefined : setPaso}
          />
        </Card>

        <Card className="min-w-0 p-6">
          {paso === 0 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Paso 1 · Descargar plantilla</h3>
                <p className="text-sm text-slate-500">
                  Un Excel con una fila por empleado <b>activo</b> y sus datos actuales. Edite solo las columnas de
                  encabezado azul; la gris (ID) es la llave del empleado y no se modifica. Para dar de baja ponga Activo = No con tipo y fecha de baja.
                </p>
              </div>

              <Alert variant="info">
                <Icon icon="solar:info-circle-bold" width={18} />
                <AlertTitle>Cómo funciona</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>
                      <b>Celda vacía = no cambia.</b> Con la plantilla no se borra ningún dato.
                    </li>
                    <li>No modifique la columna ID. Puede borrar las filas de empleados que no quiera tocar.</li>
                    <li>La hoja «Instrucciones» detalla cada columna, sus valores permitidos y formatos.</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {plantilla.isLoading ? (
                <Skeleton className="h-16 w-full rounded-xl" />
              ) : plantilla.isError ? (
                <Alert variant="destructive">
                  <Icon icon="solar:danger-triangle-bold" width={18} />
                  <AlertTitle>No se pudo cargar la plantilla</AlertTitle>
                  <AlertDescription>{extractApiErrorMessage(plantilla.error)}</AlertDescription>
                </Alert>
              ) : plantilla.data ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <b>{plantilla.data.filas.length}</b> empleados activos · <b>{plantilla.data.campos.length}</b>{' '}
                    columnas editables:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {plantilla.data.campos.map((c) => (
                      <Badge key={c.campo} variant="secondary" title={c.descripcion}>
                        {c.etiqueta}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Checkbox
                  checked={soloIncompletas}
                  onCheckedChange={(v) => setSoloIncompletas(Boolean(v))}
                  data-testid="rh-actualizacion-masiva__solo-incompletas"
                />
                <span>
                  Solo empleados con <b>ficha incompleta</b>
                  {empleadosQ.data && <span className="text-amber-700"> ({idsIncompletos.size})</span>}
                  <span className="block text-xs text-amber-800/80">
                    Para completar de una vez los datos que les faltan. Las celdas vacías no borran nada.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={descargar}
                  disabled={descargando || plantilla.isError}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  data-testid="rh-actualizacion-masiva__btn-plantilla"
                >
                  <Icon icon={descargando ? 'svg-spinners:180-ring' : 'solar:file-download-linear'} />
                  Descargar plantilla
                </Button>
                <Button variant="outline" onClick={() => setPaso(1)}>
                  Ya tengo el archivo
                  <Icon icon="solar:alt-arrow-right-linear" />
                </Button>
              </div>
            </div>
          )}

          {paso === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Paso 2 · Cargar y validar</h3>
                <p className="text-sm text-slate-500">
                  Suba el Excel editado. Antes de aplicar verá exactamente qué cambiará en cada empleado.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={leyendo || !plantilla.data}
                  data-testid="rh-actualizacion-masiva__btn-subir"
                >
                  <Icon icon={leyendo ? 'svg-spinners:180-ring' : 'solar:upload-bold'} />
                  {leyendo ? 'Validando…' : archivo ? 'Cargar otro archivo' : 'Subir Excel'}
                </Button>
                {archivo && !leyendo && (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                    <Icon icon="solar:file-text-bold" width={15} className="text-emerald-600" />
                    {archivo}
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onArchivo(e.target.files[0])}
                />
              </div>

              {refsNuevas && filas && plantilla.data && !leyendo && (
                <CatalogosNuevosMasiva
                  nuevos={refsNuevas}
                  campos={plantilla.data.campos}
                  filas={filas}
                  onResuelto={onCatalogosResueltos}
                  onCancelar={limpiar}
                />
              )}

              {archivo && ignoradas.length > 0 && (
                <Alert
                  variant={ignoradas.some((c) => c.conDatos > 0) ? 'warning' : 'info'}
                  data-testid="rh-actualizacion-masiva__columnas-ignoradas"
                >
                  <Icon icon="solar:danger-triangle-bold" width={18} />
                  <AlertTitle>
                    {ignoradas.length} columna{ignoradas.length === 1 ? '' : 's'} del Excel no se carga
                    {ignoradas.length === 1 ? '' : 'n'}
                  </AlertTitle>
                  <AlertDescription>
                    <p>
                      Estas columnas no corresponden a ningún dato que se pueda actualizar por carga masiva, así que{' '}
                      <strong>sus valores se ignoran</strong>:
                    </p>
                    <ul className="mt-1 list-disc pl-5">
                      {ignoradas.map((c) => (
                        <li key={c.nombre}>
                          <strong>“{c.nombre}”</strong>
                          {c.conDatos > 0
                            ? ` — ${c.conDatos} fila${c.conDatos === 1 ? '' : 's'} con datos que NO se guardarán`
                            : ' — vacía'}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs">
                      El encabezado debe ser exactamente el de la plantilla (por ejemplo, “Fecha de nacimiento”). Descargue
                      la plantilla actual para ver todas las columnas disponibles.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {resumen && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Resumen etiqueta="Filas leídas" valor={resumen.total} />
                    <Resumen etiqueta="Nuevos" valor={resumen.nuevos} tono="ok" />
                    <Resumen etiqueta="Con cambios" valor={resumen.conCambios} tono="ok" />
                    <Resumen etiqueta="Sin cambios (se omiten)" valor={resumen.sinCambios} tono="muted" />
                    <Resumen etiqueta="Con errores" valor={resumen.conErrores} tono="error" />
                  </div>

                  {resumen.conErrores > 0 ? (
                    <Alert variant="destructive">
                      <Icon icon="solar:danger-triangle-bold" width={18} />
                      <AlertTitle>
                        {resumen.conErrores} fila{resumen.conErrores === 1 ? '' : 's'} con errores
                      </AlertTitle>
                      <AlertDescription>
                        No se aplica <b>ningún</b> cambio mientras el archivo tenga errores. Corrija las filas marcadas
                        en el Excel y vuelva a cargarlo.
                      </AlertDescription>
                    </Alert>
                  ) : porAplicar === 0 ? (
                    <Alert variant="warning">
                      <Icon icon="solar:danger-triangle-bold" width={18} />
                      <AlertTitle>No hay cambios</AlertTitle>
                      <AlertDescription>
                        Todos los valores del archivo son iguales a los actuales (o están vacíos).
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="info">
                      <Icon icon="solar:check-circle-bold" width={18} />
                      <AlertTitle>Listo para actualizar</AlertTitle>
                      <AlertDescription>
                        {resumen.conCambios > 0 && (
                          <>
                            Se cambiarán <b>{resumen.totalCambios}</b> datos en <b>{resumen.conCambios}</b> empleado
                            {resumen.conCambios === 1 ? '' : 's'}.{' '}
                          </>
                        )}
                        {resumen.nuevos > 0 && (
                          <>
                            Se crearán <b>{resumen.nuevos}</b> empleado{resumen.nuevos === 1 ? '' : 's'} nuevo
                            {resumen.nuevos === 1 ? '' : 's'} (quedarán <b>sin registrar en BioTime</b>; se registran al terminar).{' '}
                          </>
                        )}
                        Revise la tabla y presione «Actualizar».
                      </AlertDescription>
                    </Alert>
                  )}

                  {filasVisibles.length > 0 || filtro !== 'TODOS' ? (
                    <div className="space-y-2">
                      <Segmented<Filtro>
                        value={filtro}
                        onChange={setFiltro}
                        options={[
                          { value: 'TODOS', label: 'Todos' },
                          { value: 'CAMBIOS', label: `Nuevos y con cambios (${porAplicar})` },
                          { value: 'ERRORES', label: `Con errores (${resumen.conErrores})` },
                        ]}
                        testId="rh-actualizacion-masiva__filtro"
                      />
                      <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-slate-50">
                            <TableRow>
                              <TableHead className="w-16">Fila</TableHead>
                              <TableHead className="w-16">ID</TableHead>
                              <TableHead className="min-w-[200px]">Empleado</TableHead>
                              <TableHead>Cambios / errores</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filasVisibles.map((f, i) => {
                              const conError = f.errores.length > 0
                              return (
                                <TableRow
                                  key={`${f.fila ?? 'x'}-${f.id ?? 'x'}-${i}`}
                                  className={cn('align-top', conError && 'bg-rose-50/70 hover:bg-rose-50')}
                                >
                                  <TableCell className="tabular-nums text-slate-500">{f.fila ?? '—'}</TableCell>
                                  <TableCell className="tabular-nums">
                                    {f.nuevo ? (
                                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Nuevo</span>
                                    ) : (
                                      f.id ?? '—'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{f.nombre ?? '—'}</div>
                                    {f.codigo && <div className="text-xs text-slate-500">Código {f.codigo}</div>}
                                  </TableCell>
                                  <TableCell>
                                    {conError && (
                                      <ul className="mb-1 space-y-0.5 text-sm text-red-700">
                                        {f.errores.map((e, k) => (
                                          <li key={k} className="flex gap-1.5">
                                            <Icon icon="solar:danger-circle-bold" width={14} className="mt-0.5 shrink-0" />
                                            {e}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {f.cambios.length > 0 && (
                                      <ul className={cn('space-y-0.5 text-sm', conError && 'opacity-60')}>
                                        {f.cambios.map((c) => (
                                          <li key={c.campo}>
                                            <span className="text-slate-500">{c.etiqueta}:</span>{' '}
                                            {!f.nuevo && (
                                              <>
                                                <span className="text-slate-500 line-through decoration-slate-300">
                                                  {mostrarValor(c, c.anterior)}
                                                </span>{' '}
                                                →{' '}
                                              </>
                                            )}
                                            <span className="font-medium text-emerald-700">{mostrarValor(c, c.nuevo)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                            {filasVisibles.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="py-6 text-center text-sm text-slate-500">
                                  Sin filas para este filtro.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" onClick={() => setPaso(0)}>
                  <Icon icon="solar:alt-arrow-left-linear" />
                  Plantilla
                </Button>
                <div className="flex items-center gap-3">
                  {resumen && !puedeAplicar && (
                    <span className="text-xs text-slate-500">
                      {resumen.conErrores > 0 ? 'Corrija los errores para continuar' : 'No hay cambios que aplicar'}
                    </span>
                  )}
                  <Button
                    onClick={() => setConfirmar(true)}
                    disabled={!puedeAplicar || leyendo}
                    data-testid="rh-actualizacion-masiva__btn-actualizar"
                  >
                    <Icon icon="solar:check-circle-bold" />
                    Actualizar{resumen && puedeAplicar ? ` ${porAplicar} empleado${porAplicar === 1 ? '' : 's'}` : ''}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {paso === 2 && resultado && (
            <div className="space-y-5 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <Icon icon="solar:check-circle-bold" width={32} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Actualización aplicada</h3>
                <p className="text-sm text-slate-500">
                  Se actualizaron <b>{resultado.actualizados}</b> empleado{resultado.actualizados === 1 ? '' : 's'} (
                  {resultado.camposActualizados} dato{resultado.camposActualizados === 1 ? '' : 's'} en total)
                  {resultado.creados > 0 && (
                    <>
                      {' '}y se crearon <b>{resultado.creados}</b> empleado{resultado.creados === 1 ? '' : 's'} nuevo
                      {resultado.creados === 1 ? '' : 's'}
                    </>
                  )}
                  .
                </p>
                {resultado.creados > 0 && (
                  <Alert variant="warning" className="mx-auto mt-3 max-w-2xl text-left">
                    <Icon icon="solar:fingerprint-bold" width={18} />
                    <AlertTitle>
                      Falta registrar {resultado.creados === 1 ? 'al empleado nuevo' : `a los ${resultado.creados} empleados nuevos`}{' '}
                      en el biométrico
                    </AlertTitle>
                    <AlertDescription>
                      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                        <li>
                          <strong>Ahora, aquí abajo:</strong> elija departamento, ubicación y (opcional) puesto de
                          BioTime y presione <strong>Registrar</strong>. Cada uno recibe su código BioTime.
                        </li>
                        <li>
                          <strong>Después, en el reloj:</strong> buscar ese código → Editar → Huella.
                        </li>
                      </ol>
                      <p className="mt-1.5 text-xs">
                        Si sale de esta pantalla sin registrarlos, quedan en{' '}
                        <Link to="/empleados/biometrico" className="font-semibold underline">
                          Empleados → Pendientes de biométrico
                        </Link>{' '}
                        y marcados como “Sin registrar en BioTime” en la tabla de empleados.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/empleados">Ir a Empleados</Link>
                </Button>
                <Button variant="outline" onClick={nuevaActualizacion}>
                  <Icon icon="solar:refresh-linear" />
                  Nueva actualización
                </Button>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <SinBiometricoMasiva idsCreados={resultado.idsCreados ?? []} />
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={confirmar} onOpenChange={(o) => !aplicarMut.isPending && setConfirmar(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon="solar:question-circle-bold" width={20} className="text-sky-500" />
              ¿Aplicar la actualización?
            </DialogTitle>
            <DialogDescription>
              Se cambiarán {resumen?.totalCambios ?? 0} datos en {resumen?.conCambios ?? 0} empleados
              {resumen?.nuevos ? ` y se crearán ${resumen.nuevos} empleados nuevos` : ''}, todo en una sola operación.
              Esta acción no se puede deshacer desde esta pantalla.
            </DialogDescription>
          </DialogHeader>
          {(resumen?.nuevos ?? 0) > 0 && (
            <Alert variant="warning">
              <Icon icon="solar:fingerprint-bold" width={18} />
              <AlertTitle>
                Los {resumen!.nuevos} empleado{resumen!.nuevos === 1 ? '' : 's'} nuevo{resumen!.nuevos === 1 ? '' : 's'}{' '}
                quedarán sin registrar en BioTime
              </AlertTitle>
              <AlertDescription>
                La carga masiva no los registra en el biométrico, así que no aparecerán en el reloj ni podrán marcar.
                Al terminar, regístrelos en la tabla que aparece abajo (departamento, ubicación y, opcional, puesto de
                BioTime). Después falta registrar su huella en el reloj.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(false)} disabled={aplicarMut.isPending}>
              Cancelar
            </Button>
            <Button onClick={aplicar} disabled={aplicarMut.isPending}>
              <Icon icon={aplicarMut.isPending ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} />
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
