import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const [filas, setFilas] = useState<FilaActualizacionMasiva[] | null>(null)
  const [validacion, setValidacion] = useState<ResultadoValidacionMasiva | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState<ResultadoAplicarMasiva | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const resumen = validacion?.resumen
  const puedeAplicar = Boolean(resumen && resumen.conCambios > 0 && resumen.conErrores === 0)

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

  async function descargar() {
    setDescargando(true)
    try {
      // Siempre con datos frescos (otro usuario pudo editar a alguien).
      const { data } = await plantilla.refetch()
      if (!data) throw new Error('No se pudo obtener la plantilla')
      await descargarPlantillaActualizacionMasiva(data)
      toast.success(`Plantilla descargada con ${data.filas.length} empleados activos`)
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    } finally {
      setDescargando(false)
    }
  }

  function limpiar() {
    setArchivo(null)
    setFilas(null)
    setValidacion(null)
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
      const leidas = await leerArchivoActualizacionMasiva(file, plantilla.data.campos)
      setFilas(leidas)
      setValidacion(await validarMut.mutateAsync(leidas))
    } catch (err) {
      setArchivo(null)
      toast.error(extractApiErrorMessage(err))
    } finally {
      setLeyendo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function aplicar() {
    if (!filas) return
    try {
      const r = await aplicarMut.mutateAsync(filas)
      setResultado(r)
      setConfirmar(false)
      setPaso(2)
      toast.success(`${r.actualizados} empleado${r.actualizados === 1 ? '' : 's'} actualizado${r.actualizados === 1 ? '' : 's'}`)
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
          descripcion="Completa datos de nómina, contrato, banco, IGSS y contacto de muchos empleados a la vez con un Excel."
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

              {resumen && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Resumen etiqueta="Filas leídas" valor={resumen.total} />
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
                  ) : resumen.conCambios === 0 ? (
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
                        Se cambiarán <b>{resumen.totalCambios}</b> datos en <b>{resumen.conCambios}</b> empleado
                        {resumen.conCambios === 1 ? '' : 's'}. Revise la tabla y presione «Actualizar».
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
                          { value: 'CAMBIOS', label: `Con cambios (${resumen.conCambios})` },
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
                                  <TableCell className="tabular-nums">{f.id ?? '—'}</TableCell>
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
                                            <span className="text-slate-500 line-through decoration-slate-300">
                                              {mostrarValor(c, c.anterior)}
                                            </span>{' '}
                                            → <span className="font-medium text-emerald-700">{mostrarValor(c, c.nuevo)}</span>
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
                    Actualizar{resumen && puedeAplicar ? ` ${resumen.conCambios} empleado${resumen.conCambios === 1 ? '' : 's'}` : ''}
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
                  {resultado.camposActualizados} dato{resultado.camposActualizados === 1 ? '' : 's'} en total).
                </p>
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
              Se cambiarán {resumen?.totalCambios ?? 0} datos en {resumen?.conCambios ?? 0} empleados, todo en una
              sola operación. Esta acción no se puede deshacer desde esta pantalla.
            </DialogDescription>
          </DialogHeader>
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
