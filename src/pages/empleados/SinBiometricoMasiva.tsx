import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@iconify/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { NameCombobox, type NameOption } from '@/components/ui/name-combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Segmented } from '@/shared/report/report-ui'
import { actualizacionMasivaApi } from '@/api/actualizacionMasiva'
import { extractApiErrorMessage } from '@/api/client'
import { useBiotimeDepartamentos, useBiotimeUbicaciones } from '@/hooks/useBiotime'
import { cn, formatDate } from '@/lib/utils'

type Alcance = 'CARGA' | 'TODOS'

type Estado =
  | { tipo: 'procesando' }
  | { tipo: 'ok'; codigo: number; vinculado?: boolean }
  | { tipo: 'error'; mensaje: string }

interface DatosBio {
  departamento: number | null
  ubicacion: number | null
}

/**
 * Empleados activos que NO están en el biométrico, para registrarlos en BioTime desde aquí.
 * - Al final de la carga masiva: `idsCreados` = los nuevos de esa carga.
 * - En la página "Pendientes de biométrico": sin `idsCreados`, lista todos los pendientes.
 */
export function SinBiometricoMasiva({ idsCreados }: { idsCreados: number[] }) {
  const qc = useQueryClient()
  const lista = useQuery({
    queryKey: ['empleados', 'sin-biometrico'],
    queryFn: () => actualizacionMasivaApi.sinBiometrico(),
    staleTime: 0,
    // Si se recarga al volver a la pestaña, los recién registrados salen de la lista y se pierde su código.
    refetchOnWindowFocus: false,
  })
  const bioDeptos = useBiotimeDepartamentos()
  const bioUbic = useBiotimeUbicaciones()

  const [alcance, setAlcance] = useState<Alcance>(idsCreados.length ? 'CARGA' : 'TODOS')
  const [general, setGeneral] = useState<DatosBio>({ departamento: null, ubicacion: null })
  const [porFila, setPorFila] = useState<Record<number, Partial<DatosBio>>>({})
  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set(idsCreados))
  const [vinculando, setVinculando] = useState<number | null>(null)
  const [estados, setEstados] = useState<Record<number, Estado>>({})
  const [registrando, setRegistrando] = useState(false)

  const creados = useMemo(() => new Set(idsCreados), [idsCreados])
  const desdeCarga = idsCreados.length > 0
  const filas = useMemo(
    () => (lista.data ?? []).filter((e) => alcance === 'TODOS' || creados.has(e.id)),
    [lista.data, alcance, creados],
  )

  const opcDeptos: NameOption[] = bioDeptos.data ?? []
  const opcUbic: NameOption[] = bioUbic.data ?? []

  const datosDe = (id: number): DatosBio => ({
    departamento: porFila[id]?.departamento ?? general.departamento,
    ubicacion: porFila[id]?.ubicacion ?? general.ubicacion,
  })
  const pendiente = (id: number) => estados[id]?.tipo !== 'ok'
  const seleccionables = filas.filter((e) => pendiente(e.id))
  /** "Seleccionar todos" deja fuera a los que ya parecen existir en BioTime: se deben vincular, no registrar. */
  const seleccionablesSinDuplicado = seleccionables.filter((e) => e.posibleCodigoBio == null)
  const posiblesDuplicados = seleccionables.filter((e) => e.posibleCodigoBio != null)
  const seleccionados = seleccionables.filter((e) => seleccion.has(e.id))
  const faltanDatos = seleccionados.filter((e) => {
    const d = datosDe(e.id)
    return !d.departamento || !d.ubicacion
  })
  const todos =
    seleccionablesSinDuplicado.length > 0 &&
    seleccionablesSinDuplicado.every((e) => seleccion.has(e.id))
  const seleccionadosDuplicados = seleccionados.filter((e) => e.posibleCodigoBio != null)

  function alternar(id: number, on: boolean) {
    setSeleccion((prev) => {
      const s = new Set(prev)
      if (on) s.add(id)
      else s.delete(id)
      return s
    })
  }

  async function registrar() {
    if (!seleccionados.length) return
    if (faltanDatos.length) {
      toast.error('Elija departamento y ubicación de BioTime para todos los seleccionados')
      return
    }
    setRegistrando(true)
    let ok = 0
    // Uno por uno: el código de BioTime se genera en secuencia (sp_generarCodigoBiotime).
    for (const e of seleccionados) {
      const d = datosDe(e.id)
      setEstados((prev) => ({ ...prev, [e.id]: { tipo: 'procesando' } }))
      try {
        const r = await actualizacionMasivaApi.registrarBiometrico(e.id, {
          departamento_biotime: d.departamento!,
          ubicacion_biometrico: d.ubicacion!,
        })
        ok++
        setEstados((prev) => ({ ...prev, [e.id]: { tipo: 'ok', codigo: r.codigoEmpleadoBio } }))
      } catch (err) {
        setEstados((prev) => ({ ...prev, [e.id]: { tipo: 'error', mensaje: extractApiErrorMessage(err) } }))
      }
    }
    setRegistrando(false)
    // Refresca el listado y la ficha, pero NO esta lista: si se recarga, los recién registrados
    // desaparecen de ella y ya no se vería el código que se les asignó.
    qc.invalidateQueries({ queryKey: ['empleados', 'backend'] })
    const fallidos = seleccionados.length - ok
    if (ok) toast.success(`${ok} empleado${ok === 1 ? '' : 's'} registrado${ok === 1 ? '' : 's'} en el biométrico`)
    if (fallidos) toast.error(`${fallidos} no se pudieron registrar; revise la columna Estado y reintente`)
  }

  async function vincular(id: number, codigo: number) {
    setVinculando(id)
    try {
      const r = await actualizacionMasivaApi.vincularBiometrico(id, codigo)
      setEstados((prev) => ({ ...prev, [id]: { tipo: 'ok', codigo: r.codigoEmpleadoBio, vinculado: true } }))
      alternar(id, false)
      qc.invalidateQueries({ queryKey: ['empleados', 'backend'] })
      toast.success(`Vinculado al código BioTime ${r.codigoEmpleadoBio}`)
    } catch (err) {
      setEstados((prev) => ({ ...prev, [id]: { tipo: 'error', mensaje: extractApiErrorMessage(err) } }))
    } finally {
      setVinculando(null)
    }
  }

  const registradosOk = filas.filter((e) => estados[e.id]?.tipo === 'ok').length

  /** Copia "ID RRHH, nombre y código BioTime" de los registrados, para pegarlo en Excel o enviarlo. */
  async function copiarCodigos() {
    const lineas = filas
      .filter((e) => estados[e.id]?.tipo === 'ok')
      .map((e) => {
        const est = estados[e.id] as { codigo: number }
        return [e.id, [e.nombre, e.apellido].filter(Boolean).join(' '), est.codigo].join('\t')
      })
    try {
      await navigator.clipboard.writeText(['ID RRHH\tNombre\tCódigo BioTime', ...lineas].join('\n'))
      toast.success(`${lineas.length} código${lineas.length === 1 ? '' : 's'} copiado${lineas.length === 1 ? '' : 's'}`)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="space-y-3 text-left" data-testid="rh-actualizacion-masiva__sin-biometrico">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-slate-800">
            <Icon icon="solar:fingerprint-bold" width={18} className="text-amber-600" />
            Pendientes de registrar en el biométrico
          </h4>
          <p className="text-sm text-slate-500">
            {desdeCarga && 'La carga masiva no registra en BioTime. '}
            Elija departamento y ubicación de BioTime y registre a los seleccionados para que puedan registrar su
            huella y marcar.
          </p>
        </div>
        {desdeCarga && (
          <Segmented<Alcance>
            value={alcance}
            onChange={setAlcance}
            disabled={registrando}
            options={[
              { value: 'CARGA', label: `De esta carga (${idsCreados.length})` },
              { value: 'TODOS', label: `Todos los activos sin biométrico${lista.data ? ` (${lista.data.length})` : ''}` },
            ]}
          />
        )}
      </div>

      {lista.isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : lista.isError ? (
        <Alert variant="destructive">
          <Icon icon="solar:danger-triangle-bold" width={18} />
          <AlertTitle>No se pudo cargar la lista</AlertTitle>
          <AlertDescription>{extractApiErrorMessage(lista.error)}</AlertDescription>
        </Alert>
      ) : filas.length === 0 ? (
        <Alert variant="info">
          <Icon icon="solar:check-circle-bold" width={18} />
          <AlertTitle>Nada pendiente</AlertTitle>
          <AlertDescription>
            {alcance === 'CARGA'
              ? 'Todos los empleados de esta carga ya están en el biométrico.'
              : 'No hay empleados activos sin biométrico.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr]">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Departamento BioTime (para todos)</span>
              <NameCombobox
                options={opcDeptos}
                value={general.departamento}
                onChange={(departamento) => setGeneral((g) => ({ ...g, departamento }))}
                placeholder={bioDeptos.isLoading ? 'Cargando…' : 'Departamento BioTime'}
                searchPlaceholder="Buscar departamento…"
                disabled={registrando}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Ubicación del biométrico (para todos)</span>
              <NameCombobox
                options={opcUbic}
                value={general.ubicacion}
                onChange={(ubicacion) => setGeneral((g) => ({ ...g, ubicacion }))}
                placeholder={bioUbic.isLoading ? 'Cargando…' : 'Ubicación'}
                searchPlaceholder="Buscar ubicación…"
                disabled={registrando}
              />
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Se aplica a todas las filas; puede cambiarlo por fila si alguien va a otro departamento o ubicación.
            </p>
          </div>

          {posiblesDuplicados.length > 0 && (
            <Alert variant="warning">
              <Icon icon="solar:danger-triangle-bold" width={18} />
              <AlertTitle>
                {posiblesDuplicados.length} empleado{posiblesDuplicados.length === 1 ? '' : 's'} parece
                {posiblesDuplicados.length === 1 ? '' : 'n'} existir ya en BioTime
              </AlertTitle>
              <AlertDescription>
                Hay un registro en BioTime con el mismo nombre que no está asignado a nadie en RRHH (por ejemplo, un alta
                que falló a medias). Use <strong>Vincular</strong> para asignarle ese código; si lo registra de nuevo,
                quedará duplicado en el reloj. Por eso no se incluyen en “seleccionar todos”.
              </AlertDescription>
            </Alert>
          )}

          <div className="max-h-[55vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={todos}
                      disabled={registrando || seleccionables.length === 0}
                      onCheckedChange={(v) =>
                        setSeleccion(
                          v ? new Set([...seleccion, ...seleccionablesSinDuplicado.map((e) => e.id)]) : new Set(),
                        )
                      }
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead className="w-16" title="ID interno de RRHH (no es el código del reloj)">ID RRHH</TableHead>
                  <TableHead className="min-w-[200px]">Empleado</TableHead>
                  <TableHead
                    className="min-w-[190px]"
                    title="Código con el que el empleado queda en BioTime: se busca en el reloj y en la web de BioTime (p. ej. para darlo de baja)."
                  >
                    Código BioTime
                  </TableHead>
                  <TableHead className="min-w-[160px]">Puesto / Departamento</TableHead>
                  <TableHead className="min-w-[200px]">Departamento BioTime</TableHead>
                  <TableHead className="min-w-[200px]">Ubicación</TableHead>
                  <TableHead className="min-w-[160px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((e) => {
                  const est = estados[e.id]
                  const hecho = est?.tipo === 'ok'
                  const d = datosDe(e.id)
                  const set = (cambio: Partial<DatosBio>) =>
                    setPorFila((prev) => ({ ...prev, [e.id]: { ...prev[e.id], ...cambio } }))
                  return (
                    <TableRow
                      key={e.id}
                      className={cn(
                        'align-top',
                        hecho && 'bg-emerald-50/60',
                        est?.tipo === 'error' && 'bg-rose-50/70',
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={!hecho && seleccion.has(e.id)}
                          disabled={registrando || hecho}
                          onCheckedChange={(v) => alternar(e.id, Boolean(v))}
                          aria-label={`Seleccionar ${e.nombre ?? e.id}`}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {e.id}
                        {creados.has(e.id) && (
                          <div className="mt-0.5 w-fit rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
                            Nuevo
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{[e.nombre, e.apellido].filter(Boolean).join(' ') || '—'}</div>
                        <div className="text-xs text-slate-500">
                          {e.codigo ? `Cód. nómina ${e.codigo}` : 'Sin código de nómina'}
                          {e.fechaContratacion ? ` · Ingreso ${formatDate(e.fechaContratacion)}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hecho ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-sm font-bold text-emerald-800">
                              <Icon icon="solar:fingerprint-linear" width={14} />
                              {est.codigo}
                            </span>
                            <button
                              type="button"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Copiar código"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(String(est.codigo))
                                  .then(() => toast.success(`Código ${est.codigo} copiado`))
                                  .catch(() => toast.error('No se pudo copiar'))
                              }
                            >
                              <Icon icon="solar:copy-linear" width={14} />
                            </button>
                          </div>
                        ) : e.posibleCodigoBio != null ? (
                          <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-2">
                            <div className="flex items-center gap-1 text-xs font-semibold text-amber-900">
                              <Icon icon="solar:danger-triangle-bold" width={13} className="text-amber-600" />
                              Ya existe en BioTime
                            </div>
                            <div className="text-xs text-amber-900">
                              Código <span className="font-mono font-bold">{e.posibleCodigoBio}</span>
                              {e.posibleNombreBio && <span className="block text-amber-800/80">{e.posibleNombreBio}</span>}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-full border-amber-400 bg-white text-xs text-amber-900 hover:bg-amber-100"
                              disabled={registrando || vinculando != null}
                              onClick={() => vincular(e.id, e.posibleCodigoBio!)}
                              title="Asigna este código existente al empleado, sin crear otro en BioTime"
                            >
                              <Icon
                                icon={vinculando === e.id ? 'svg-spinners:180-ring' : 'solar:link-bold'}
                                width={13}
                              />
                              Vincular {e.posibleCodigoBio}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Se asigna al registrar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{e.puesto ?? '—'}</div>
                        <div className="text-xs text-slate-500">{e.departamento ?? '—'}</div>
                      </TableCell>
                      <TableCell>
                        <NameCombobox
                          options={opcDeptos}
                          value={d.departamento}
                          onChange={(departamento) => set({ departamento })}
                          placeholder="Departamento"
                          searchPlaceholder="Buscar…"
                          disabled={registrando || hecho}
                        />
                      </TableCell>
                      <TableCell>
                        <NameCombobox
                          options={opcUbic}
                          value={d.ubicacion}
                          onChange={(ubicacion) => set({ ubicacion })}
                          placeholder="Ubicación"
                          searchPlaceholder="Buscar…"
                          disabled={registrando || hecho}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {!est ? (
                          <span className="text-amber-700">Sin registrar en BioTime</span>
                        ) : est.tipo === 'procesando' ? (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Icon icon="svg-spinners:180-ring" width={14} /> Registrando…
                          </span>
                        ) : est.tipo === 'ok' ? (
                          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                            <Icon icon={est.vinculado ? 'solar:link-bold' : 'solar:check-circle-bold'} width={15} />
                            {est.vinculado ? 'Vinculado' : 'Registrado'}
                          </span>
                        ) : (
                          <span className="flex gap-1.5 text-red-700">
                            <Icon icon="solar:danger-circle-bold" width={15} className="mt-0.5 shrink-0" />
                            {est.mensaje}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {seleccionados.length} seleccionado{seleccionados.length === 1 ? '' : 's'}
              {registradosOk > 0 && ` · ${registradosOk} ya registrado${registradosOk === 1 ? '' : 's'}`}
              {faltanDatos.length > 0 && ` · ${faltanDatos.length} sin departamento/ubicación de BioTime`}
              {seleccionadosDuplicados.length > 0 && (
                <span className="font-semibold text-amber-700">
                  {` · ${seleccionadosDuplicados.length} ya existe${seleccionadosDuplicados.length === 1 ? '' : 'n'} en BioTime: se duplicará${seleccionadosDuplicados.length === 1 ? '' : 'n'} (mejor vincular)`}
                </span>
              )}
            </span>
            {registradosOk > 0 && (
              <Button variant="outline" onClick={copiarCodigos} disabled={registrando}>
                <Icon icon="solar:copy-linear" />
                Copiar códigos ({registradosOk})
              </Button>
            )}
            <Button
              onClick={registrar}
              disabled={registrando || seleccionados.length === 0 || faltanDatos.length > 0}
              data-testid="rh-actualizacion-masiva__btn-biometrico"
            >
              <Icon icon={registrando ? 'svg-spinners:180-ring' : 'solar:fingerprint-bold'} />
              Registrar {seleccionados.length || ''} en el biométrico
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
