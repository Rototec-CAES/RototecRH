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
  | { tipo: 'ok'; codigo: number }
  | { tipo: 'error'; mensaje: string }

interface DatosBio {
  departamento: number | null
  ubicacion: number | null
}

/**
 * Resultado de la carga masiva: empleados que NO están en el biométrico (los nuevos de la carga
 * y, opcionalmente, cualquier otro activo sin código) para registrarlos en BioTime desde aquí.
 */
export function SinBiometricoMasiva({ idsCreados }: { idsCreados: number[] }) {
  const qc = useQueryClient()
  const lista = useQuery({
    queryKey: ['empleados', 'sin-biometrico'],
    queryFn: () => actualizacionMasivaApi.sinBiometrico(),
    staleTime: 0,
  })
  const bioDeptos = useBiotimeDepartamentos()
  const bioUbic = useBiotimeUbicaciones()

  const [alcance, setAlcance] = useState<Alcance>(idsCreados.length ? 'CARGA' : 'TODOS')
  const [general, setGeneral] = useState<DatosBio>({ departamento: null, ubicacion: null })
  const [porFila, setPorFila] = useState<Record<number, Partial<DatosBio>>>({})
  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set(idsCreados))
  const [estados, setEstados] = useState<Record<number, Estado>>({})
  const [registrando, setRegistrando] = useState(false)

  const creados = useMemo(() => new Set(idsCreados), [idsCreados])
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
  const seleccionados = seleccionables.filter((e) => seleccion.has(e.id))
  const faltanDatos = seleccionados.filter((e) => {
    const d = datosDe(e.id)
    return !d.departamento || !d.ubicacion
  })
  const todos = seleccionables.length > 0 && seleccionados.length === seleccionables.length

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
    qc.invalidateQueries({ queryKey: ['empleados'], exact: true })
    const fallidos = seleccionados.length - ok
    if (ok) toast.success(`${ok} empleado${ok === 1 ? '' : 's'} registrado${ok === 1 ? '' : 's'} en el biométrico`)
    if (fallidos) toast.error(`${fallidos} no se pudieron registrar; revise la columna Estado y reintente`)
  }

  const registradosOk = filas.filter((e) => estados[e.id]?.tipo === 'ok').length

  return (
    <div className="space-y-3 text-left" data-testid="rh-actualizacion-masiva__sin-biometrico">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-slate-800">
            <Icon icon="solar:fingerprint-bold" width={18} className="text-amber-600" />
            Pendientes de registrar en el biométrico
          </h4>
          <p className="text-sm text-slate-500">
            La carga masiva no registra en BioTime. Elija departamento y ubicación de BioTime y registre a los
            seleccionados para que puedan marcar.
          </p>
        </div>
        <Segmented<Alcance>
          value={alcance}
          onChange={setAlcance}
          disabled={registrando}
          options={[
            { value: 'CARGA', label: `De esta carga (${idsCreados.length})` },
            { value: 'TODOS', label: `Todos los activos sin biométrico${lista.data ? ` (${lista.data.length})` : ''}` },
          ]}
        />
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

          <div className="max-h-[55vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={todos}
                      disabled={registrando || seleccionables.length === 0}
                      onCheckedChange={(v) =>
                        setSeleccion(v ? new Set([...seleccion, ...seleccionables.map((e) => e.id)]) : new Set())
                      }
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead className="min-w-[200px]">Empleado</TableHead>
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
                          {e.codigo ? `Código ${e.codigo}` : 'Sin código'}
                          {e.fechaContratacion ? ` · Ingreso ${formatDate(e.fechaContratacion)}` : ''}
                        </div>
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
                          <span className="text-amber-700">Sin biométrico</span>
                        ) : est.tipo === 'procesando' ? (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Icon icon="svg-spinners:180-ring" width={14} /> Registrando…
                          </span>
                        ) : est.tipo === 'ok' ? (
                          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                            <Icon icon="solar:check-circle-bold" width={15} /> Código {est.codigo}
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
            </span>
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
